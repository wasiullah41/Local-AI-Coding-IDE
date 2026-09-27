export interface AITool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // Simplified, should be more complex for true JSON schema
  execute: (args: Record<string, unknown>) => Promise<AIToolResult>;
}

export interface AIToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  changeSummary?: string; // For edit/create/delete
}
