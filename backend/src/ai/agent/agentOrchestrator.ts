import { AgentState } from './agentState';
import { LLMProvider, ChatMessage } from '../llm/llmProvider';
import { ToolRegistry, ToolExecutionContext } from '../tools/toolRegistry';
import { ContextBuilder } from '../context/contextBuilder';
import { AgentEvent, AgentEventType, AgentPhase, AgentToolCall } from '@local-ide/shared';

const MAX_ITERATIONS = 20;
const MAX_PARSE_RETRIES = 2;

export interface OrchestratorEvents {
  emit: (type: AgentEventType, phase: AgentPhase, payload: Record<string, unknown>) => void;
}

/** How a tool call is classified for the activity timeline. */
function phaseForTool(tool: string): AgentPhase {
  switch (tool) {
    case 'read_file':
    case 'list_directory':
    case 'search_files':
      return 'READING';
    case 'create_file':
    case 'edit_file':
    case 'delete_file':
      return 'EDITING';
    case 'terminal':
      return 'RUNNING';
    case 'verify':
      return 'VERIFYING';
    default:
      return 'THINKING';
  }
}

function titleForTool(tool: string, args: Record<string, unknown>): string {
  const subject =
    (typeof args.path === 'string' && args.path) ||
    (typeof args.command === 'string' && args.command) ||
    (typeof args.query === 'string' && `"${args.query}"`) ||
    (typeof args.pattern === 'string' && `"${args.pattern as string}"`) ||
    (typeof args.type === 'string' && String(args.type)) ||
    '';
  return subject ? `${tool} ${subject}` : tool;
}

/**
 * Envelope fields that describe the response itself rather than a tool call.
 *
 * `content` is deliberately absent: it is a genuine argument for create_file and
 * edit_file, and a FINAL reply is already resolved before a tool call is even
 * considered.
 */
const TOOL_CALL_CONTROL_KEYS = new Set(['tool', 'arguments', 'args', 'tool_input']);

/** The only values `type` may carry when it is an envelope marker. */
const ENVELOPE_TYPES = new Set(['TOOL_CALL', 'FINAL']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Some models return tool arguments flattened onto the envelope, e.g.
 * {"tool":"create_file","path":"a.py","content":"..."}. Collect those instead of
 * silently dropping them.
 *
 * `type` is stripped only when it carries an envelope value, because the
 * `verify` tool has a real argument named `type` (e.g. "build"). Anything else
 * is left alone rather than being guessed at.
 */
function collectFlatArguments(parsed: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (TOOL_CALL_CONTROL_KEYS.has(key)) continue;
    if (key === 'type' && typeof value === 'string' && ENVELOPE_TYPES.has(value.toUpperCase())) {
      continue;
    }
    flat[key] = value;
  }
  return flat;
}

/**
 * Extracts the model's JSON verdict.
 *
 * Local models wrap JSON in prose or fences, emit trailing commas and
 * occasionally use single quotes. The agent needs a tolerant reader here or
 * every task dies on a formatting quirk.
 */
export function parseAgentResponse(raw: string): { type: 'TOOL_CALL' | 'FINAL'; tool?: string; arguments?: Record<string, unknown>; content?: string } | null {
  const attempts: string[] = [];

  const trimmed = (raw ?? '').trim();
  if (trimmed) attempts.push(trimmed);

  // Fenced block, e.g. ```json { ... } ```
  const fence = trimmed.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence?.[1]) attempts.push(fence[1].trim());

  // First balanced {...} region anywhere in the text.
  const start = trimmed.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          attempts.push(trimmed.slice(start, i + 1));
          break;
        }
      }
    }
  }

  const relaxed = (value: string) =>
    value
      // strip // and /* */ comments outside of obvious positions
      .replace(/^\s*\/\/.*$/gm, '')
      // trailing commas
      .replace(/,\s*([}\]])/g, '$1');

  for (const attempt of attempts) {
    for (const candidate of [attempt, relaxed(attempt)]) {
      try {
        const parsed = JSON.parse(candidate);
        if (!parsed || typeof parsed !== 'object') continue;

        if (parsed.type === 'FINAL' || (typeof parsed.content === 'string' && !parsed.tool)) {
          return { type: 'FINAL', content: String(parsed.content ?? '') };
        }
        if (typeof parsed.tool === 'string') {
          // Documented form is `arguments`; `args` and `tool_input` are the
          // tolerated variants; otherwise the arguments may be flat on the
          // envelope itself.
          const nested = [parsed.arguments, parsed.args, parsed.tool_input].find(isPlainObject);
          return {
            type: 'TOOL_CALL',
            tool: parsed.tool,
            arguments: nested ?? collectFlatArguments(parsed),
          };
        }
      } catch {
        // try the next candidate
      }
    }
  }

  return null;
}

export class AgentOrchestrator {
  constructor(
    private llm: LLMProvider,
    private tools: ToolRegistry
  ) {}

  async run(
    state: AgentState,
    hooks: {
      signal?: AbortSignal;
      onEvent?: OrchestratorEvents['emit'];
      context?: ToolExecutionContext;
    } = {}
  ): Promise<AgentState> {
    const { signal, onEvent, context } = hooks;
    const emit = onEvent ?? (() => {});
    const toolContext: ToolExecutionContext = {
      ...context,
      taskId: state.taskId,
      signal,
    };

    const abort = (): boolean => signal?.aborted === true;

    state.status = 'PLANNING';
    emit('TASK_STARTED', 'THINKING', { task: state.task });

    let parseFailures = 0;
    let lastParseError: string | null = null;

    while (state.iterationCount < MAX_ITERATIONS) {
      if (abort()) {
        this.finishCancelled(state, emit);
        return state;
      }

      state.iterationCount++;
      emit('THINKING', 'THINKING', { iteration: state.iterationCount });

      let response: { content: string };
      try {
        response = await this.llm.chat(await this.buildMessages(state), { signal });
      } catch (error) {
        if (abort() || (error as Error).name === 'AbortError' || /cancel/i.test((error as Error).message)) {
          this.finishCancelled(state, emit);
          return state;
        }
        state.status = 'FAILED';
        state.error = (error as Error).message || 'The model request failed.';
        emit('TASK_FAILED', 'FAILED', { error: state.error });
        return state;
      }

      const parsed = parseAgentResponse(response.content);
      if (!parsed) {
        parseFailures++;
        lastParseError = `Could not read the model's reply: ${truncate(response.content, 200)}`;
        if (parseFailures > MAX_PARSE_RETRIES) {
          state.status = 'FAILED';
          state.error = lastParseError;
          emit('TASK_FAILED', 'FAILED', { error: state.error });
          return state;
        }
        // Nudge the model once and retry rather than burning the whole task.
        state.messages.push({ role: 'user', content: REPAIR_PROMPT });
        continue;
      }
      parseFailures = 0;
      lastParseError = null;

      if (parsed.type === 'FINAL') {
        state.status = 'COMPLETED';
        state.summary = parsed.content ?? '';
        state.finishedAt = Date.now();
        state.messages.push({ role: 'assistant', content: state.summary });
        emit('TASK_COMPLETED', 'COMPLETED', {
          content: state.summary,
          filesRead: state.filesRead,
          filesChanged: state.filesChanged,
          verification: state.verificationResults,
          iterations: state.iterationCount,
        });
        return state;
      }

      // ---- TOOL CALL -------------------------------------------------
      const toolName = parsed.tool as string;
      const args = parsed.arguments ?? {};
      state.status = 'EXECUTING';

      if (!this.tools.get(toolName)) {
        const available = this.tools.listTools().map((t) => t.name).join(', ');
        const message = `Unknown tool "${toolName}". Available tools: ${available}.`;
        state.messages.push({ role: 'tool', content: message });
        emit('TOOL_RESULT', phaseForTool(toolName), { tool: toolName, success: false, error: message });
        continue;
      }

      const phase = phaseForTool(toolName);
      emit('TOOL_STARTED', phase, { tool: toolName, args, title: titleForTool(toolName, args) });

      state.toolCalls.push({ tool: toolName, args });

      const result = await this.tools.execute(toolName, args, toolContext);
      state.toolResults.push(result);

      emit('TOOL_RESULT', phase, {
        tool: toolName,
        success: result.success,
        error: result.error,
        summary: result.changeSummary,
        denied: result.denied === true,
        data: result.success ? summariseData(result.data) : undefined,
      });

      if (result.cancelled || abort()) {
        this.finishCancelled(state, emit);
        return state;
      }

      if (toolName === 'read_file' && typeof args.path === 'string') {
        state.filesRead.push(args.path);
      }
      if (
        (toolName === 'create_file' || toolName === 'edit_file' || toolName === 'delete_file') &&
        typeof args.path === 'string'
      ) {
        state.filesChanged.push(args.path);
        emit('FILE_CHANGED', phase, { path: args.path, tool: toolName });
      }
      if (toolName === 'verify' || toolName === 'terminal') {
        const exitCode =
          typeof result.data === 'object' && result.data !== null
            ? (result.data as { exitCode?: number }).exitCode
            : undefined;
        state.verificationResults.push({
          command:
            typeof args.command === 'string'
              ? (args.command as string)
              : typeof args.type === 'string'
                ? `npm run ${args.type as string}`
                : undefined,
          success: result.success,
          exitCode,
        });
      }

      state.messages.push({ role: 'assistant', content: JSON.stringify({ type: 'TOOL_CALL', tool: toolName, arguments: args }) });
      state.messages.push({ role: 'tool', content: compactToolResult(toolName, result) });

      // A denied or failed mutation is a signal to stop guessing, not to retry
      // the same call forever. Feed the outcome back and let the model react.
      if (result.denied) {
        state.messages.push({
          role: 'user',
          content:
            'The user DENIED that action. Do not retry it. Either continue with a different approach that avoids it, or finish and explain what you could not do.',
        });
      }
    }

    if (abort()) {
      this.finishCancelled(state, emit);
      return state;
    }

    state.status = 'FAILED';
    state.error =
      lastParseError ??
      `Stopped after ${MAX_ITERATIONS} steps without a final answer. Narrow the task or break it into smaller steps.`;
    state.finishedAt = Date.now();
    emit('TASK_FAILED', 'FAILED', { error: state.error });
    return state;
  }

  private finishCancelled(state: AgentState, emit: OrchestratorEvents['emit']): void {
    state.status = 'CANCELLED';
    state.finishedAt = Date.now();
    state.error = 'Cancelled by the user.';
    emit('TASK_CANCELLED', 'CANCELLED', { reason: 'Cancelled by the user.' });
  }

  /**
   * Assembles the prompt: the standing instructions, the assembled project
   * context, and the recent tool dialogue.
   *
   * The history matters as much as the context — without it the model cannot
   * see what it already did and repeats itself, which makes multi-step tasks
   * impossible.
   */
  private async buildMessages(state: AgentState): Promise<ChatMessage[]> {
    const system = [
      'You are the coding agent inside ForgeAI Studio, running against a real project on the user\'s machine.',
      '',
      'You reply with EXACTLY ONE JSON object and nothing else. No prose, no markdown fences, no explanation outside the JSON.',
      '',
      'To call a tool:',
      '{"type":"TOOL_CALL","tool":"<tool_name>","arguments":{...}}',
      '',
      'When the work is done and verified:',
      '{"type":"FINAL","content":"<what you did and how you verified it>"}',
      '',
      'Available tools:',
      this.tools.describeForPrompt(),
      '',
      'How to work:',
      '1. Understand the task, then look at the project before changing anything (list_directory, search_files, read_file).',
      '2. Make the smallest change that solves the task. Read a file before you edit it.',
      '3. Use terminal/verify to check your work, and fix what the output shows is broken.',
      '4. If a tool returns an error, read the message and adapt. Do not repeat a failing call unchanged.',
      '5. Keep track of what you have already done; do not redo completed steps.',
      '6. Finish with a FINAL message that states what changed and how you verified it.',
      '',
      'The user approves destructive actions (deletes, shell commands) individually. If an action is denied, do not retry it.',
    ].join('\n');

    let context = '';
    try {
      context = await ContextBuilder.build(state);
    } catch {
      // A context failure must not abort the task; the history still helps.
      context = `TASK: ${state.task}`;
    }

    // The agent speaks a JSON protocol rather than using native function
    // calling, so a stored tool observation is sent back as a user turn. A
    // literal `tool` role would make the providers expect a `tool_calls` reply
    // that this protocol never produces.
    const history = ContextBuilder.recentMessages(state).map((message) =>
      message.role === 'assistant'
        ? { role: 'assistant' as const, content: message.content }
        : {
            role: 'user' as const,
            content:
              message.role === 'tool'
                ? `Tool result:\n${message.content}`
                : message.content,
          }
    );

    return [
      { role: 'system', content: system },
      { role: 'user', content: context },
      ...history,
    ];
  }
}

const REPAIR_PROMPT =
  'Your previous reply could not be parsed. Reply with a single JSON object only: {"type":"TOOL_CALL","tool":"...","arguments":{...}} or {"type":"FINAL","content":"..."}.';

/** Keeps the tool catalogue and API keys out of the user-facing summary. */
function summariseData(data: unknown): unknown {
  if (data === undefined || data === null) return undefined;
  const text = JSON.stringify(data);
  if (text.length <= 400) return data;
  return { truncated: true, preview: text.slice(0, 400) };
}

function compactToolResult(tool: string, result: { success: boolean; error?: string; data?: unknown; changeSummary?: string; denied?: boolean }): string {
  if (result.denied) return `${tool}: DENIED by the user.`;
  if (!result.success) return `${tool}: FAILED - ${result.error ?? 'unknown error'}`;

  const summary = result.changeSummary ? ` - ${result.changeSummary}` : '';
  // Large outputs are trimmed: the model needs the signal, not the whole log.
  let payload = '';
  try {
    payload = JSON.stringify(result.data ?? null);
  } catch {
    payload = '';
  }
  if (payload.length > 6000) payload = `${payload.slice(0, 6000)}…[truncated]`;
  return `${tool}: OK${summary}\n${payload}`;
}

function truncate(value: string, max: number): string {
  const single = (value ?? '').replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max)}…` : single;
}

export type { AgentToolCall };
