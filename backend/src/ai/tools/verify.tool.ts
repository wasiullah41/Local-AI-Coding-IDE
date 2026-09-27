import { AITool, AIToolResult } from './toolTypes';
import { processService } from '../../services/process/process.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';
import path from 'path';
import fs from 'fs';

export const verifyTool: AITool = {
  name: 'verify',
  description: 'Run project verification commands (test, build, lint).',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['test', 'build', 'lint', 'typecheck', 'command'] },
      command: { type: 'string' }
    },
    required: ['type'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { type } = args as { type: 'test' | 'build' | 'lint' | 'typecheck' | 'command' };
    const rootPath = getWorkspaceRoot() || process.cwd();

    let command = '';
    try {
      const pkgPath = path.join(rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        switch (type) {
          case 'test': command = pkg.scripts?.test || 'npm test'; break;
          case 'build': command = pkg.scripts?.build || 'npm run build'; break;
          case 'lint': command = pkg.scripts?.lint || 'npm run lint'; break;
          case 'typecheck': command = 'tsc --noEmit'; break;
        }
      }
    } catch (e) {
      // Ignore
    }

    if (!command) {
        if (type === 'typecheck') command = 'tsc --noEmit';
        else if (type === 'command' && args.command) command = args.command as string;
        else return { success: false, error: 'Verification command not determined' };
    }

    try {
      const result = await processService.executeCommand(command, rootPath);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  },
};
