import { apiService } from './apiService';

export const aiApiService = {
  runTask: async (task: string, workspaceRoot: string) => {
    return await apiService.post('/agent/task', { task, workspaceRoot });
  },
  cancelTask: async (taskId: string) => {
    return await apiService.post('/agent/cancel', { taskId });
  }
};
