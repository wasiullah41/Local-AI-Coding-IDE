import { AITool, AIToolResult } from './toolTypes';
import { processService } from '../../services/process/process.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';
import path from 'path';

/**
 * Commands that can damage the machine or the user's data. These are refused
 * outright — they never reach the permission dialog, because there is no safe
 * way for a coding agent to run them unattended.
 */
const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bformat\b/i, reason: 'disk formatting' },
  { pattern: /\bdiskpart\b/i, reason: 'disk partitioning' },
  { pattern: /\brm\s+-rf\s+\//, reason: 'recursive delete from root' },
  { pattern: /\bdel\s+\/[sf]\b/i, reason: 'recursive force delete' },
  { pattern: /\brmdir\s+\/[s]/i, reason: 'recursive directory delete' },
  { pattern: /\bRemove-Item\b[\s\S]*-Recurse[\s\S]*-Force/i, reason: 'recursive force delete' },
  { pattern: /\bshutdown\b/i, reason: 'host shutdown' },
  { pattern: /\bStop-Computer\b/i, reason: 'host shutdown' },
  { pattern: /\bcipher\s+\/w/i, reason: 'secure wipe' },
  { pattern: /:\(\)\s*\{.*\};\s*:/, reason: 'fork bomb' },
  { pattern: /\bdd\s+if=.*of=\/dev\//i, reason: 'raw disk write' },
];

/**
 * Returns a refusal reason for commands that are never allowed, or undefined
 * when the command is merely suspicious. Exported so the registry can refuse
 * before asking the user for consent.
 */
export function refuseCommand(command: unknown): string | undefined {
  if (typeof command !== 'string' || command.trim().length === 0) {
    return 'No command supplied.';
  }
  const blocked = BLOCKED_PATTERNS.find((entry) => entry.pattern.test(command));
  return blocked ? `Command blocked: ${blocked.reason} is not permitted from the AI agent.` : undefined;
}

export const terminalTool: AITool = {
  name: 'terminal',
  description:
    'Run a shell command inside the workspace and return its output. Use it to install dependencies, run builds and tests, and inspect the project.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
      cwd: { type: 'string', description: 'Working directory relative to the workspace root' },
      timeoutMs: { type: 'number', description: 'Timeout in milliseconds (default 30000)' },
    },
    required: ['command'],
  },
  execute: async (args, options): Promise<AIToolResult> => {
    const { command, cwd = '.', timeoutMs = 30_000 } = args as {
      command: string;
      cwd?: string;
      timeoutMs?: number;
    };

    if (typeof command !== 'string' || command.trim().length === 0) {
      return { success: false, error: 'No command supplied.' };
    }

    const refusal = refuseCommand(command);
    if (refusal) {
      return { success: false, error: refusal };
    }

    const rootPath = getWorkspaceRoot() || process.cwd();
    const resolvedCwd = path.resolve(rootPath, cwd);
    const relative = path.relative(rootPath, resolvedCwd);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return { success: false, error: 'Working directory is outside the workspace.' };
    }

    try {
      const result = await processService.executeCommand(command, resolvedCwd, timeoutMs, {
        signal: options?.signal,
        taskId: options?.taskId,
      });

      if (result.cancelled) {
        return { success: false, cancelled: true, error: 'Command cancelled.' };
      }

      const summary = result.stdout.trim().split('\n').slice(-3).join('\n');
      return {
        success: result.exitCode === 0,
        data: {
          command,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
        },
        changeSummary: `$ ${command} → exit ${result.exitCode}${summary ? `\n${summary}` : ''}`,
        error: result.exitCode === 0 ? undefined : result.stderr.trim() || `Exit code ${result.exitCode}`,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Command failed.' };
    }
  },
};
