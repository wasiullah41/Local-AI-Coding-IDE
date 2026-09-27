import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { GitStatus, GitFileChange } from '@local-ide/shared';

const execAsync = util.promisify(exec);

export class GitService {
  private async runGit(args: string[], cwd: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd });
      return stdout;
    } catch (error: any) {
      throw new Error(`Git error: ${error.message}`);
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

        let status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted' = 'untracked';

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
      remote: null // Simplified for now
    };
  }

  async stageFile(cwd: string, filePath: string): Promise<void> {
    await this.runGit(['add', filePath], cwd);
  }

  async unstageFile(cwd: string, filePath: string): Promise<void> {
    await this.runGit(['restore', '--staged', filePath], cwd);
  }

  async commit(cwd: string, message: string): Promise<void> {
    await this.runGit(['commit', '-m', `"${message}"`], cwd);
  }

  async getDiff(cwd: string): Promise<string> {
    return await this.runGit(['diff'], cwd);
  }
}

export const gitService = new GitService();
