export enum PermissionType {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  TERMINAL = 'TERMINAL',
  GIT_STATUS = 'GIT_STATUS',
  GIT_DIFF = 'GIT_DIFF',
  GIT_COMMIT = 'GIT_COMMIT',
  GIT_PUSH = 'GIT_PUSH',
  NETWORK = 'NETWORK',
}

export type PermissionAction = 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION';

export interface PermissionPolicy {
  [PermissionType.READ]: PermissionAction;
  [PermissionType.WRITE]: PermissionAction;
  [PermissionType.DELETE]: PermissionAction;
  [PermissionType.TERMINAL]: PermissionAction;
  [PermissionType.GIT_STATUS]: PermissionAction;
  [PermissionType.GIT_DIFF]: PermissionAction;
  [PermissionType.GIT_COMMIT]: PermissionAction;
  [PermissionType.GIT_PUSH]: PermissionAction;
  [PermissionType.NETWORK]: PermissionAction;
}

const DEFAULT_POLICY: PermissionPolicy = {
  READ: 'ALLOW',
  WRITE: 'ALLOW',
  DELETE: 'REQUIRE_CONFIRMATION',
  TERMINAL: 'REQUIRE_CONFIRMATION',
  GIT_STATUS: 'ALLOW',
  GIT_DIFF: 'ALLOW',
  GIT_COMMIT: 'REQUIRE_CONFIRMATION',
  GIT_PUSH: 'DENY',
  NETWORK: 'DENY',
};

export class PermissionManager {
  private policy: PermissionPolicy = { ...DEFAULT_POLICY };

  setPolicy(type: PermissionType, action: PermissionAction): void {
    this.policy[type] = action;
  }

  checkPermission(type: PermissionType): PermissionAction {
    return this.policy[type] || 'DENY';
  }

  requestPermission(type: PermissionType): boolean {
    // In a real implementation, this would handle the user confirmation flow.
    // For now, based on policy, we can determine if we have permission.
    const action = this.checkPermission(type);
    return action === 'ALLOW';
  }
}

export const permissionManager = new PermissionManager();
