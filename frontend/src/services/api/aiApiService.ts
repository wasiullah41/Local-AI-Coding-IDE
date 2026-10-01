import { apiService, unwrap } from './apiService';
import { AgentStatusResponse, AgentTaskSnapshot, AgentTaskAccepted } from '@local-ide/shared';

export const aiApiService = {
  /** Whether a model is reachable, and if not, what the user should do about it. */
  getStatus: () => unwrap<AgentStatusResponse>(apiService.get('/agent/status')),

  runTask: (task: string, workspaceRoot: string) =>
    unwrap<AgentTaskAccepted>(apiService.post('/agent/task', { task, workspaceRoot })),

  cancelTask: (taskId: string) =>
    unwrap<{ taskId: string; status: string }>(apiService.post('/agent/cancel', { taskId })),

  respondPermission: (requestId: string, allowed: boolean, remember = false) =>
    apiService.post('/agent/permission/respond', { requestId, allowed, remember }),

  getTask: (taskId: string) => unwrap<AgentTaskSnapshot>(apiService.get(`/agent/task/${taskId}`)),

  getPermissions: () =>
    unwrap<{ policy: Record<string, string>; pending: number }>(apiService.get('/agent/permissions')),

  setPermission: (type: string, action: 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION') =>
    unwrap<{ policy: Record<string, string> }>(
      apiService.put('/agent/permissions', { type, action })
    ),
};
