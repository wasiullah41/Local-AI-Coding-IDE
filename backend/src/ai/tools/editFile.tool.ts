import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';

export const editFileTool: AITool = {
  name: 'edit_file',
  description:
    'Edit an existing file. Either pass oldText/newText to replace an exact snippet (it must appear exactly once), or pass content to rewrite the whole file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file, relative to the workspace root' },
      oldText: { type: 'string', description: 'Exact existing text to replace' },
      newText: { type: 'string', description: 'Replacement text' },
      content: { type: 'string', description: 'Full new contents of the file' },
    },
    required: ['path'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path, oldText, newText, content } = args as {
      path: string;
      oldText?: string;
      newText?: string;
      content?: string;
    };

    try {
      const fileData = await filesystemService.readFile(path);
      const existing = fileData.content;

      let updated: string;
      let summary: string;

      if (typeof content === 'string') {
        updated = content;
        summary =
          existing === content
            ? `No change needed in ${path}`
            : `Rewrote ${path} (${existing.length} → ${content.length} chars)`;
      } else if (typeof oldText === 'string' && typeof newText === 'string') {
        const occurrences = existing.split(oldText).length - 1;
        if (occurrences === 0) {
          return {
            success: false,
            error: `oldText was not found in ${path}. Read the file first and copy the text exactly, or use "content" to rewrite it.`,
          };
        }
        if (occurrences > 1) {
          return {
            success: false,
            error: `oldText appears ${occurrences} times in ${path}. Include more surrounding context so it matches exactly one place.`,
          };
        }
        updated = existing.replace(oldText, newText);
        summary = `Edited ${path}: replaced "${truncate(oldText)}" with "${truncate(newText)}"`;
      } else {
        return {
          success: false,
          error: 'edit_file needs either oldText/newText or content.',
        };
      }

      await filesystemService.writeFile(path, updated);

      return {
        success: true,
        changeSummary: summary,
        data: { path, originalContent: existing, newContent: updated },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to edit file.' };
    }
  },
};

function truncate(value: string, max = 60): string {
  const single = value.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max)}…` : single;
}
