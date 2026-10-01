import { AgentState } from '../agent/agentState';
import { filesystemService } from '../../services/filesystem/filesystem.service';

const MAX_FILES = 5;
const MAX_FILE_CHARS = 8000;
const MAX_HISTORY = 12;

/**
 * Assembles the state a model needs to reason about the next step: the task,
 * what it has read, and what its tools just returned.
 *
 * It is deliberately bounded — long files and long histories are trimmed so the
 * prompt cannot grow without limit over a multi-step task.
 */
export class ContextBuilder {
  static async build(state: AgentState): Promise<string> {
    const sections: string[] = [`TASK: ${state.task}`];

    if (state.plan.length > 0) {
      sections.push(`PLAN:\n${state.plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}`);
    }

    if (state.filesRead.length > 0) {
      const parts: string[] = ['FILES ALREADY READ:'];
      for (const filePath of state.filesRead.slice(-MAX_FILES)) {
        try {
          const file = await filesystemService.readFile(filePath);
          const content =
            file.content.length > MAX_FILE_CHARS
              ? `${file.content.slice(0, MAX_FILE_CHARS)}\n… (truncated)`
              : file.content;
          parts.push(`--- ${filePath} ---\n${content}`);
        } catch {
          parts.push(`--- ${filePath} ---\n(could not be re-read)`);
        }
      }
      sections.push(parts.join('\n'));
    }

    if (state.toolResults.length > 0) {
      const recent = state.toolResults.slice(-5).map((result, index) => {
        const summary = result.changeSummary ?? (result.success ? 'OK' : 'FAILED');
        const detail = result.error ? ` — ${result.error}` : '';
        return `[${index + 1}] ${summary}${detail}`;
      });
      sections.push(`RECENT TOOL RESULTS:\n${recent.join('\n')}`);
    }

    if (state.filesChanged.length > 0) {
      sections.push(`FILES CHANGED SO FAR: ${[...new Set(state.filesChanged)].join(', ')}`);
    }

    if (state.verificationResults.length > 0) {
      const lines = state.verificationResults
        .slice(-4)
        .map((v) => `${v.success ? 'passed' : 'FAILED'} (exit ${v.exitCode ?? '?'}) ${v.command ?? ''}`);
      sections.push(`VERIFICATION SO FAR:\n${lines.join('\n')}`);
    }

    if (state.error) {
      sections.push(`LAST ERROR: ${state.error}`);
    }

    return sections.join('\n\n');
  }

  /** The most recent turns, for callers that want the raw dialogue. */
  static recentMessages(state: AgentState, limit = MAX_HISTORY) {
    return state.messages.slice(-limit);
  }
}
