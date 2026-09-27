import { AgentState } from '../agent/agentState';
import { filesystemService } from '../../services/filesystem/filesystem.service';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10000; // chars

export class ContextBuilder {
  static async build(state: AgentState): Promise<string> {
    let context = `Task: ${state.task}\n\n`;

    // 1. Files read / Recent context
    if (state.filesRead.length > 0) {
      context += 'Recently read files:\n';
      // Truncate number of files and content
      for (const filePath of state.filesRead.slice(-MAX_FILES)) {
        try {
          const file = await filesystemService.readFile(filePath);
          const content = file.content.length > MAX_FILE_SIZE
            ? file.content.substring(0, MAX_FILE_SIZE) + '... (truncated)'
            : file.content;
          context += `--- ${filePath} ---\n${content}\n\n`;
        } catch {
          context += `--- ${filePath} ---\n(Unable to read)\n\n`;
        }
      }
    }

    // 2. Recent tool results
    if (state.toolResults.length > 0) {
      context += 'Recent tool results:\n';
      context += JSON.stringify(state.toolResults.slice(-5), null, 2) + '\n\n';
    }

    return context;
  }
}
