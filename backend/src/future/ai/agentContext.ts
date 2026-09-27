// Future Agent Context - NOT implemented yet
export interface AgentContext {
  workspacePath: string;
  activeFile?: string;
  selectedText?: string;
  openFiles: string[];
  conversationHistory: AgentMessage[];
  availableTools: string[];
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: AgentToolCall[];
}

export interface AgentToolCall {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting' | 'error';
