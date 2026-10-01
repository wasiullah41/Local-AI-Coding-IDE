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

/**
 * Defaults are deliberately conservative: reading is free, writing inside the
 * workspace is allowed (the workspace boundary already contains it), and
 * anything destructive or shell-shaped must be confirmed by the user.
 */
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

export interface PermissionRequestInput {
  taskId: string;
  type: PermissionType;
  tool: string;
  action: string;
  detail?: string;
  reason?: string;
  /** Full tool arguments, so the dialog can show exactly what will run. */
  args?: Record<string, unknown>;
}

/** The payload broadcast to the renderer as `PERMISSION_REQUESTED`. */
export interface PermissionRequestPayload {
  requestId: string;
  taskId: string;
  type: string;
  tool: string;
  action: string;
  detail?: string;
  reason?: string;
  args?: Record<string, unknown>;
  requestedAt: number;
  /** Epoch ms after which the request is denied automatically. */
  expiresAt: number;
}

interface PendingPermission {
  requestId: string;
  taskId: string;
  type: PermissionType;
  resolve: (allowed: boolean) => void;
  timer: NodeJS.Timeout;
}

const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Owns the user-consent round trip for tool calls. A tool that needs
 * confirmation blocks here until the renderer answers or the request times out;
 * it never proceeds optimistically.
 */
export class PermissionManager {
  private policy: PermissionPolicy = { ...DEFAULT_POLICY };
  private pending = new Map<string, PendingPermission>();
  private taskGrants = new Map<string, Set<PermissionType>>();

  setPolicy(type: PermissionType, action: PermissionAction): void {
    this.policy[type] = action;
  }

  getPolicy(): PermissionPolicy {
    return { ...this.policy };
  }

  checkPermission(type: PermissionType): PermissionAction {
    return this.policy[type] ?? 'DENY';
  }

  /** Called when the user answers a dialog. */
  resolve(requestId: string, allowed: boolean, remember: boolean, taskId: string): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(requestId);

    if (remember && allowed) {
      const grants = this.taskGrants.get(taskId) ?? new Set<PermissionType>();
      grants.add(entry.type);
      this.taskGrants.set(taskId, grants);
    }

    entry.resolve(allowed);
    return true;
  }

  /** Answers a dialog without the caller having to know which task it belongs to. */
  resolveByRequestId(requestId: string, allowed: boolean, remember: boolean): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    return this.resolve(requestId, allowed, remember, entry.taskId);
  }

  /** Deny every outstanding request for a task, e.g. when it is cancelled. */
  denyTask(taskId: string): void {
    for (const [requestId, entry] of Array.from(this.pending)) {
      if (entry.taskId !== taskId) continue;
      clearTimeout(entry.timer);
      this.pending.delete(requestId);
      entry.resolve(false);
    }
    this.taskGrants.delete(taskId);
  }

  clearTaskGrants(taskId: string): void {
    this.taskGrants.delete(taskId);
  }

  /**
   * Resolves to `true` when the tool may run. Blocks (awaiting the renderer)
   * when the policy requires user confirmation.
   *
   * `onRequest` is invoked exactly once per dialog so the caller can broadcast
   * a `PERMISSION_REQUESTED` event to every connected client.
   */
  async authorize(
    input: PermissionRequestInput,
    onRequest: (payload: PermissionRequestPayload) => void
  ): Promise<boolean> {
    const type = input.type;
    const action = this.checkPermission(type);

    if (action === 'DENY') return false;
    if (action === 'ALLOW') return true;

    if (this.taskGrants.get(input.taskId)?.has(type)) return true;

    const requestId = `${input.taskId}:${type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const requestedAt = Date.now();

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        // Timing out is a denial: a dangerous action never happens by default.
        resolve(false);
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(requestId, {
        requestId,
        taskId: input.taskId,
        type,
        resolve,
        timer,
      });

      onRequest({
        requestId,
        taskId: input.taskId,
        type,
        tool: input.tool,
        action: input.action,
        detail: input.detail,
        reason: input.reason,
        args: input.args,
        requestedAt,
        expiresAt: requestedAt + REQUEST_TIMEOUT_MS,
      });
    });
  }

  /** Test helper: count of dialogs currently awaiting an answer. */
  getPendingCount(): number {
    return this.pending.size;
  }
}

export const permissionManager = new PermissionManager();
