import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';

export const deleteFileTool: AITool = {
  name: 'delete_file',
  description: 'Delete a file or directory within the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file or directory' },
    },
    required: ['path'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path } = args as { path: string };
    try {
      await filesystemService.delete(path);
      return {
        success: true,
        changeSummary: `Deleted: ${path}`,
        data: { path },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete file' };
    }
  },
};
