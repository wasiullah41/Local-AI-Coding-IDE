import { AITool, AIToolResult } from './toolTypes';
import { processService } from '../../services/process/process.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';
import path from 'path';
import fs from 'fs';

/**
 * Verification is deliberately different from `terminal`: it picks a command
 * from the project's own package.json scripts rather than accepting arbitrary
 * shell. The user still has to approve the run (it is registered under
 * PermissionType.TERMINAL), so this is a convenience, not a bypass.
 */
export const verifyTool: AITool = {
  name: 'verify',
  description:
    'Verify the project by running one of its own scripts (test, build, lint, typecheck) and reporting the result.',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['test', 'build', 'lint', 'typecheck'] },
    },
    required: ['type'],
  },
  execute: async (args, options): Promise<AIToolResult> => {
    const type = (args as { type?: string }).type ?? 'test';
    const rootPath = getWorkspaceRoot() || process.cwd();

    let command = '';
    try {
      const pkgPath = path.join(rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const scripts = pkg.scripts ?? {};
        switch (type) {
          case 'test':
            command = scripts.test ?? '';
            break;
          case 'build':
            command = scripts.build ?? '';
            break;
          case 'lint':
            command = scripts.lint ?? '';
            break;
          case 'typecheck':
            command = scripts.typecheck ?? (scripts.build ? '' : '');
            break;
        }
      }
    } catch {
      // Fall through to the "no command" path below.
    }

    if (!command) {
      if (type === 'typecheck') {
        command = 'npx tsc --noEmit';
      } else {
        return {
          success: false,
          error: `This project has no "${type}" script in package.json, so there is nothing to verify.`,
        };
      }
    }

    try {
      const result = await processService.executeCommand(command, rootPath, 180_000, {
        signal: options?.signal,
        taskId: options?.taskId,
      });

      if (result.cancelled) {
        return { success: false, cancelled: true, error: 'Verification cancelled.' };
      }

      const tail = result.stdout.trim().split('\n').slice(-6).join('\n');
      return {
        success: result.exitCode === 0,
        data: { command, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr },
        changeSummary: `${type}: \`${command}\` exited ${result.exitCode}`,
        error: result.exitCode === 0 ? undefined : result.stderr.trim() || result.stdout.trim() || `Exit code ${result.exitCode}`,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Verification failed.' };
    }
  },
};
