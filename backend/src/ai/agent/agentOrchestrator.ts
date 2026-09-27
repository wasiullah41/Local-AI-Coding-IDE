import { AgentState } from './agentState';
import { LLMProvider } from '../llm/llmProvider';
import { ToolRegistry } from '../tools/toolRegistry';
import { ContextBuilder } from '../context/contextBuilder';
import { AgentEvent } from '@local-ide/shared';

const MAX_ITERATIONS = 10;

export class AgentOrchestrator {
  constructor(
    private llm: LLMProvider,
    private tools: ToolRegistry
  ) {}

  async run(state: AgentState, onEvent?: (event: AgentEvent) => void): Promise<AgentState> {
    state.status = 'EXECUTING';

    while (state.iterationCount < MAX_ITERATIONS && state.status === 'EXECUTING') {
      state.iterationCount++;
      const context = await ContextBuilder.build(state);

      const messages = [
        { role: 'system', content: 'You are an AI coding agent. RESPOND ONLY WITH JSON. For tool call: {"type": "TOOL_CALL", "tool": "tool_name", "arguments": { ... }}. For final answer: {"type": "FINAL", "content": "..."}' },
        { role: 'user', content: context }
      ];

      const response = await this.llm.chat(messages as any);

      try {
        const parsedResponse = JSON.parse(response.content);

        if (parsedResponse.type === 'TOOL_CALL') {
          const { tool, arguments: args } = parsedResponse;

          if (onEvent) onEvent({ taskId: state.task, type: 'TOOL_STARTED', payload: { tool, args }, timestamp: Date.now() } as any);

          state.toolCalls.push({ tool, args });
          const result = await this.tools.execute(tool, args);
          state.toolResults.push(result);

          if (onEvent) onEvent({ taskId: state.task, type: 'TOOL_RESULT', payload: { tool, success: result.success, result }, timestamp: Date.now() } as any);

          if (tool === 'read_file') state.filesRead.push(args.path as string);
          if (['create_file', 'edit_file'].includes(tool)) state.filesChanged.push(args.path as string);

          state.messages.push({ role: 'assistant', content: JSON.stringify(parsedResponse) });
          state.messages.push({ role: 'tool', content: JSON.stringify(result) });

        } else if (parsedResponse.type === 'FINAL') {
          state.status = 'COMPLETED';
          state.messages.push({ role: 'assistant', content: parsedResponse.content });
          if (onEvent) onEvent({ taskId: state.task, type: 'TASK_COMPLETED', payload: { content: parsedResponse.content }, timestamp: Date.now() } as any);
        } else {
          throw new Error('Invalid response type');
        }
      } catch (e: any) {
        state.messages.push({ role: 'assistant', content: 'Error parsing response: ' + response.content });
        state.status = 'FAILED';
        if (onEvent) onEvent({ taskId: state.task, type: 'TASK_FAILED', payload: { error: e.message }, timestamp: Date.now() } as any);
      }
    }

    if (state.status === 'EXECUTING') {
      state.status = 'FAILED';
      if (onEvent) onEvent({ taskId: state.task, type: 'TASK_FAILED', payload: { error: 'Max iterations reached' }, timestamp: Date.now() } as any);
    }
    return state;
  }
}
