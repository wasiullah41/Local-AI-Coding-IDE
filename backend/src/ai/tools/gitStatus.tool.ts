import { AITool, AIToolResult } from './toolTypes';
import { gitService } from '../../services/git/git.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';

export const gitStatusTool: AITool = {
  name: 'git_status',
  description: 'Get the status of the Git repository.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute: async (): Promise<AIToolResult> => {
    try {
      const rootPath = getWorkspaceRoot() || process.cwd();
      const status = await gitService.getStatus(rootPath);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get git status' };
    }
  },
};
