// ---------------------------------------------------------------------------
// Shared contract between the backend AI agent and the renderer.
// ---------------------------------------------------------------------------

export type AgentStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_PERMISSION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/** Coarse phase the agent is currently in, used for UI labelling. */
export type AgentPhase =
  | 'IDLE'
  | 'THINKING'
  | 'READING'
  | 'EDITING'
  | 'RUNNING'
  | 'VERIFYING'
  | 'WAITING_PERMISSION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentTaskRequest {
  task: string;
  workspaceRoot: string;
}

export interface AgentTaskAccepted {
  taskId: string;
  status: AgentStatus;
}

export interface AgentToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

/** A single entry in the activity timeline shown in the AI panel. */
export interface AgentActivityItem {
  id: string;
  kind:
    | 'info'
    | 'tool'
    | 'file'
    | 'success'
    | 'error'
    | 'permission'
    | 'warning'
    | 'thought';
  title: string;
  detail?: string;
  tool?: string;
  status: 'running' | 'success' | 'error' | 'skipped' | 'pending';
  timestamp: number;
}

export interface PermissionRequest {
  requestId: string;
  taskId: string;
  /** Permission class, e.g. TERMINAL, DELETE, WRITE. */
  type: string;
  /** Tool that wants to run, e.g. `terminal`. */
  tool: string;
  /** Human readable action, e.g. "Run a terminal command". */
  action: string;
  /** The exact command or path involved. */
  detail?: string;
  /** Why the agent wants to do it, when the model supplies one. */
  reason?: string;
  /** Full tool arguments, so the dialog can show exactly what will run. */
  args?: Record<string, unknown>;
  requestedAt: number;
  /** Epoch ms after which the request is denied automatically. */
  expiresAt?: number;
}

export interface PermissionResponse {
  requestId: string;
  taskId: string;
  allowed: boolean;
  /** Set when the user hits "always allow" for the rest of the task. */
  remember?: boolean;
}

export interface AgentFinalResult {
  summary?: string;
  filesRead: string[];
  filesChanged: string[];
  verification: { command?: string; success: boolean; exitCode?: number }[];
  iterations: number;
}

export type AgentEventType =
  | 'TASK_QUEUED'
  | 'TASK_STARTED'
  | 'THINKING'
  | 'PLAN_CREATED'
  | 'TOOL_STARTED'
  | 'TOOL_RESULT'
  | 'FILE_CHANGED'
  | 'TERMINAL_STARTED'
  | 'TERMINAL_RESULT'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_RESULT'
  | 'PERMISSION_REQUESTED'
  | 'PERMISSION_RESOLVED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED';

export interface AgentEvent {
  taskId: string;
  type: AgentEventType;
  phase?: AgentPhase;
  payload: Record<string, unknown>;
  timestamp: number;
}

/** Full snapshot of a task, delivered when a task finishes or is queried. */
export interface AgentTaskSnapshot {
  taskId: string;
  task: string;
  status: AgentStatus;
  phase: AgentPhase;
  iterations: number;
  filesRead: string[];
  filesChanged: string[];
  result?: AgentFinalResult;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export interface LLMProviderStatus {
  provider: string;
  model: string;
  available: boolean;
  /** Present when `available` is false, so the UI can explain what to do. */
  message?: string;
  baseUrl?: string;
}

export interface AgentStatusResponse {
  provider: LLMProviderStatus;
  runningTasks: number;
  tools: { name: string; description: string }[];
}
