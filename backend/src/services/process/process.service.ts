import { spawn, ChildProcess } from 'child_process';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** True when the run was stopped by the user rather than exiting on its own. */
  cancelled?: boolean;
  timedOut?: boolean;
  command?: string;
  cwd?: string;
  durationMs?: number;
}

const MAX_OUTPUT_CHARS = 200_000;

export class ProcessService {
  private running = new Map<string, ChildProcess>();

  /**
   * Runs a command inside the workspace and resolves with its output.
   *
   * Unlike `exec`, this spawns a process directly so an `AbortSignal` can kill
   * the real process tree. That is what makes agent cancellation actually stop
   * work instead of just abandoning the promise.
   */
  executeCommand(
    command: string,
    cwd: string,
    timeoutMs: number = 30_000,
    options: { signal?: AbortSignal; taskId?: string; shell?: string } = {}
  ): Promise<CommandResult> {
    const { signal, taskId, shell } = options;
    const startedAt = Date.now();

    return new Promise<CommandResult>((resolve) => {
      if (signal?.aborted) {
        resolve({ stdout: '', stderr: '', exitCode: 143, cancelled: true, command, cwd });
        return;
      }

      const useShell = shell ?? (process.platform === 'win32' ? 'powershell.exe' : '/bin/sh');
      const args =
        process.platform === 'win32'
          ? ['-NoProfile', '-NonInteractive', '-Command', command]
          : ['-c', command];

      let child: ChildProcess;
      try {
        child = spawn(useShell, args, {
          cwd,
          env: process.env,
          windowsHide: true,
        });
      } catch (error) {
        resolve({
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Failed to start command',
          exitCode: 1,
          command,
          cwd,
        });
        return;
      }

      if (taskId) this.running.set(taskId, child);

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timedOut = false;

      const finish = (result: CommandResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        if (taskId) this.running.delete(taskId);
        resolve({ ...result, durationMs: Date.now() - startedAt, command, cwd });
      };

      child.stdout?.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_OUTPUT_CHARS) stdout += chunk.toString('utf-8');
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_OUTPUT_CHARS) stderr += chunk.toString('utf-8');
      });

      child.on('error', (error) => {
        finish({ stdout, stderr: stderr + error.message, exitCode: 1 });
      });

      child.on('close', (code, signalName) => {
        finish({
          stdout,
          stderr,
          exitCode: code ?? (signalName ? 143 : 0),
          cancelled: signal?.aborted === true,
          timedOut,
        });
      });

      const timer = setTimeout(() => {
        timedOut = true;
        this.kill(child);
      }, timeoutMs);

      const onAbort = () => {
        this.kill(child);
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Kills a command and everything it spawned. `task:kill` targets the process
   * tree on Windows, which is what npm/gradle-style wrappers rely on.
   */
  private kill(child: ChildProcess): void {
    if (child.pid === undefined || child.killed) return;
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      } else {
        child.kill('SIGKILL');
      }
    } catch {
      try {
        child.kill();
      } catch {
        // Process already gone.
      }
    }
  }

  /** Cancels every command belonging to a task. Used by agent cancellation. */
  cancelTask(taskId: string): boolean {
    const child = this.running.get(taskId);
    if (!child) return false;
    this.kill(child);
    return true;
  }
}

export const processService = new ProcessService();
