import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { GitStatus, GitFileChange, GitFileStatus } from '@local-ide/shared';
import { AppError } from '../../middleware/error.middleware';

const execFileAsync = util.promisify(execFile);

/** Lines shown when previewing a newly added, unstaged file. */
const MAX_UNTRACKED_DIFF_LINES = 2000;

const firstNonEmpty = (values: (string | undefined)[]): string | undefined => {
  for (const value of values) {
    if (value && value.trim()) return value;
  }
  return undefined;
};

/**
 * Trims git's output down to the part a user needs, dropping only the node
 * wrapper line, which just repeats the command. `fatal:` lines are kept because
 * they carry the actual reason.
 */
function cleanGitOutput(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('Command failed:'));

  return lines.slice(0, 6).join('\n') || 'git failed';
}

export class GitService {
  /**
   * Runs git without a shell.
   *
   * Args are passed as an array, so paths and commit messages containing
   * quotes, `$`, or backticks are passed through verbatim instead of being
   * interpreted by the shell.
   */
  private async runGit(args: string[], cwd: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      return stdout;
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      // Git often explains itself on stdout and exits non-zero, so stderr alone
      // is not enough; the node wrapper message ("Command failed: git ...") is
      // the least useful of the three and is only used as a last resort.
      const detail = firstNonEmpty([err.stderr, err.stdout]) ?? err.message ?? 'git failed';
      // A failing git command is almost always the user's situation (nothing
      // staged, no repository, bad path), not a server fault. Reporting it as
      // a 400 keeps the real reason visible instead of a generic 500.
      throw new AppError(400, 'GIT_ERROR', cleanGitOutput(detail));
    }
  }

  async isRepository(cwd: string): Promise<boolean> {
    try {
      await this.runGit(['rev-parse', '--is-inside-work-tree'], cwd);
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(cwd: string): Promise<GitStatus> {
    const isRepo = await this.isRepository(cwd);
    if (!isRepo) {
      return { isRepository: false, currentBranch: null, changes: [], remote: null };
    }

    const branch = (await this.runGit(['branch', '--show-current'], cwd)).trim();
    const statusOutput = await this.runGit(['status', '--porcelain', '-z'], cwd);

    // Parsing porcelain v1 with -z (null byte separated)
    const changes: GitFileChange[] = [];
    if (statusOutput) {
      const entries = statusOutput.split('\0');
      for (const entry of entries) {
        if (!entry) continue;

        const xy = entry.substring(0, 2);
        const filePath = entry.substring(3);

        let status: GitFileStatus = 'untracked';

        if (xy === '??') status = 'untracked';
        else if (xy[0] === 'M' || xy[1] === 'M') status = 'modified';
        else if (xy[0] === 'A' || xy[1] === 'A') status = 'added';
        else if (xy[0] === 'D' || xy[1] === 'D') status = 'deleted';
        else if (xy[0] === 'R' || xy[1] === 'R') status = 'renamed';
        else if (xy[0] === 'U' || xy[1] === 'U') status = 'conflicted';

        changes.push({
          path: path.join(cwd, filePath),
          relativePath: filePath,
          status,
          staged: xy[0] !== ' ' && xy[0] !== '?'
        });
      }
    }

    return {
      isRepository: true,
      currentBranch: branch,
      changes,
      remote: null, // Upstream tracking is resolved lazily by the branch view
    };
  }

  async stageFile(cwd: string, filePath: string): Promise<void> {
    // `--` stops git treating the path as an option or a revision.
    await this.runGit(['add', '--', filePath], cwd);
  }

  async unstageFile(cwd: string, filePath: string): Promise<void> {
    await this.runGit(['restore', '--staged', '--', filePath], cwd);
  }

  async commit(cwd: string, message: string): Promise<void> {
    if (!message.trim()) {
      throw new AppError(400, 'GIT_ERROR', 'The commit message is empty.');
    }
    // Message is a single argv entry, so it needs no shell quoting.
    await this.runGit(['commit', '-m', message], cwd);
  }

  async getDiff(cwd: string): Promise<string> {
    return await this.runGit(['diff', '--no-color'], cwd);
  }

  /**
   * Diff for one file, preferring the staged view when the file is staged so the
   * Source Control view shows what will actually be committed.
   */
  async getFileDiff(cwd: string, filePath: string, relativePath: string, staged: boolean): Promise<string> {
    const isUntracked = await this.isUntracked(cwd, relativePath);
    if (isUntracked) {
      return await this.synthesizeNewFileDiff(cwd, filePath, relativePath);
    }

    const args = staged
      ? ['diff', '--no-color', '--cached', '--', relativePath]
      : ['diff', '--no-color', '--', relativePath];

    return await this.runGit(args, cwd);
  }

  private async isUntracked(cwd: string, relativePath: string): Promise<boolean> {
    try {
      const out = await this.runGit(['ls-files', '--error-unmatch', '--', relativePath], cwd);
      return out.trim().length === 0;
    } catch {
      // git exits non-zero when the path is not tracked.
      return true;
    }
  }

  /**
   * `git diff` has nothing to say about an untracked file, so the added lines are
   * rendered directly. This keeps the Source Control view honest: every line is
   * genuinely new content from disk.
   */
  private async synthesizeNewFileDiff(
    cwd: string,
    filePath: string,
    relativePath: string
  ): Promise<string> {
    let content: string;
    try {
      const absolute = path.resolve(cwd, relativePath);
      content = await fs.readFile(absolute, 'utf8');
    } catch {
      return `+++ b/${relativePath}\n@@ the file is on disk but could not be read for a preview @@\n`;
    }

    const lines = content.split('\n');
    const truncated = lines.length > MAX_UNTRACKED_DIFF_LINES;
    const shown = truncated ? lines.slice(0, MAX_UNTRACKED_DIFF_LINES) : lines;

    const header = [
      `--- /dev/null`,
      `+++ b/${relativePath}`,
      `@@ -0,0 +1,${shown.length} @@`,
    ];
    const body = shown.map((line) => `+${line}`);
    if (truncated) {
      body.push(`+… truncated at ${MAX_UNTRACKED_DIFF_LINES} lines (${lines.length} total)`);
    }
    void filePath;

    return [...header, ...body, ''].join('\n');
  }
}

export const gitService = new GitService();
