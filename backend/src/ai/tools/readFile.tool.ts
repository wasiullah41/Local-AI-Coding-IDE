import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';
import { PermissionType } from '../permissions/permissionManager';

export const readFileTool: AITool = {
  name: 'read_file',
  description: 'Read the content of a file within the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file within the workspace' },
    },
    required: ['path'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path } = args as { path: string };
    try {
      const fileData = await filesystemService.readFile(path);
      return {
        success: true,
        data: {
          path,
          content: fileData.content,
          size: fileData.size,
          modifiedAt: fileData.modifiedAt,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read file' };
    }
  },
};
