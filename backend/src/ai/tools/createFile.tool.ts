import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';
import { PermissionType } from '../permissions/permissionManager';

export const createFileTool: AITool = {
  name: 'create_file',
  description: 'Create a new file within the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path for the new file' },
      content: { type: 'string', description: 'Content of the new file' },
    },
    required: ['path', 'content'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path, content } = args as { path: string; content: string };
    try {
      await filesystemService.createFile(path, content);
      return {
        success: true,
        changeSummary: `Created new file: ${path}`,
        data: { path },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create file' };
    }
  },
};
