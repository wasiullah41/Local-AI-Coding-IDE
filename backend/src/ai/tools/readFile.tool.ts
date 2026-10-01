import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';

const MAX_INLINE_CHARS = 20_000;

export const readFileTool: AITool = {
  name: 'read_file',
  description:
    'Read a file from the workspace and return its contents. Read a file before editing it.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file, relative to the workspace root' },
    },
    required: ['path'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path } = args as { path: string };
    try {
      const fileData = await filesystemService.readFile(path);
      const truncated = fileData.content.length > MAX_INLINE_CHARS;
      return {
        success: true,
        changeSummary: `Read ${path} (${fileData.size} bytes)`,
        data: {
          path,
          content: truncated
            ? `${fileData.content.slice(0, MAX_INLINE_CHARS)}\n… [truncated, ${fileData.content.length} chars total]`
            : fileData.content,
          size: fileData.size,
          modifiedAt: fileData.modifiedAt,
          language: fileData.language,
          truncated,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read file.' };
    }
  },
};
