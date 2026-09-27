// Future AI Tool Types - NOT implemented yet
export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, AIToolParam>;
  execute: (args: Record<string, unknown>) => Promise<AIToolResult>;
}

export interface AIToolParam {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export interface AIToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
