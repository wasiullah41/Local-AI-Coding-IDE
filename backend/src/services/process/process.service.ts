import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ProcessService {
  async executeCommand(command: string, cwd: string, timeoutMs: number = 30000): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd, timeout: timeoutMs });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }
}

export const processService = new ProcessService();
