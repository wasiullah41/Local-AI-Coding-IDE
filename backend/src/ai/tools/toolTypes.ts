export interface ToolExecutionOptions {
  /** Aborted when the user cancels the task; long-running tools must honour it. */
  signal?: AbortSignal;
  taskId?: string;
}

export interface AITool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    args: Record<string, unknown>,
    options?: ToolExecutionOptions
  ) => Promise<AIToolResult>;
}

export interface AIToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** Human readable summary of a mutation, for the activity timeline. */
  changeSummary?: string;
  /** The user refused this action; the agent should not retry it verbatim. */
  denied?: boolean;
  /** The task was cancelled while/just before this tool ran. */
  cancelled?: boolean;
}
