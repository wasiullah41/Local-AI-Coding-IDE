import { apiService } from '../api/apiService';
import type { GitStatus } from '@local-ide/shared';

class GitService {
  async getStatus(): Promise<GitStatus> {
    const response = await apiService.get('/git/status');
    return response.data.data;
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
}

export const gitService = new GitService();
