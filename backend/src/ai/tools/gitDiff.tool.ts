import { AITool, AIToolResult } from './toolTypes';
import { gitService } from '../../services/git/git.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';

export const gitDiffTool: AITool = {
  name: 'git_diff',
  description: 'Get the diff of the Git repository.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute: async (): Promise<AIToolResult> => {
    try {
      const rootPath = getWorkspaceRoot() || process.cwd();
      const diff = await gitService.getDiff(rootPath);
      return {
        success: true,
        data: { diff },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get git diff' };
    }
  },
};
