import { AITool, AIToolResult } from './toolTypes';
import { processService } from '../../services/process/process.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';
import path from 'path';

const DANGEROUS_COMMANDS = ['shutdown', 'format', 'diskpart', 'rm -rf', 'rmdir /s', 'del /s'];

export const terminalTool: AITool = {
  name: 'terminal',
  description: 'Execute a command in the terminal inside the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
      cwd: { type: 'string', description: 'Working directory relative to workspaceRoot' },
      timeoutMs: { type: 'number', description: 'Timeout in milliseconds' },
    },
    required: ['command'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { command, cwd = '.', timeoutMs = 30000 } = args as { command: string; cwd?: string; timeoutMs?: number };

    // 1. Security: Check for dangerous commands
    if (DANGEROUS_COMMANDS.some(cmd => command.includes(cmd))) {
      return { success: false, error: 'Command blocked: dangerous command detected' };
    }

    // 2. Security: Ensure cwd is within workspaceRoot
    const rootPath = getWorkspaceRoot() || process.cwd();
    const resolvedCwd = path.join(rootPath, cwd);
    if (!resolvedCwd.startsWith(rootPath)) {
      return { success: false, error: 'Invalid working directory' };
    }

    try {
      const result = await processService.executeCommand(command, resolvedCwd, timeoutMs);
      return {
        success: result.exitCode === 0,
        data: result,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Terminal execution failed' };
    }
  },
};
