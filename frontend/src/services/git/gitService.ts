import { apiService, unwrap } from '../api/apiService';
import type { GitStatus } from '@local-ide/shared';

class GitService {
  async getStatus(): Promise<GitStatus> {
    return unwrap<GitStatus>(apiService.get('/git/status'));
  }

  async stage(path: string): Promise<void> {
    await apiService.post('/git/stage', { path });
  }

  async unstage(path: string): Promise<void> {
    await apiService.post('/git/unstage', { path });
  }

  async commit(message: string): Promise<void> {
    await apiService.post('/git/commit', { message });
  }

  /** Working-tree diff for a single file, relative to the workspace root. */
  async getDiff(path: string): Promise<string> {
    return unwrap<string>(apiService.post('/git/diff', { path }));
  }
}

export const gitService = new GitService();
