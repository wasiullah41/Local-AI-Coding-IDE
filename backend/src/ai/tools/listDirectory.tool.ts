import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';

export const listDirectoryTool: AITool = {
  name: 'list_directory',
  description: 'List files and directories in a directory.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the directory' },
    },
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path = '.' } = args as { path?: string };
    try {
      const rootPath = getWorkspaceRoot() || '';
      const entries = await filesystemService.readDirectory(path, rootPath);
      return {
        success: true,
        data: {
          path,
          entries,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list directory' };
    }
  },
};
