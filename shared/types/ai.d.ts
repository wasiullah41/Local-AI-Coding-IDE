import type { GitStatus } from './git';
export interface AIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: string;
    toolCalls?: AIToolCall[];
    toolCallId?: string;
}
export interface AIContext {
    workspacePath: string;
    activeFile?: string;
    selectedText?: string;
    openFiles: string[];
    terminalHistory?: string[];
    gitStatus?: GitStatus;
}
export interface AITool {
    name: string;
    description: string;
    parameters: Record<string, AIToolParameter>;
    handler?: string;
}
export interface AIToolParameter {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
    enum?: string[];
    default?: unknown;
}
export interface AIToolCall {
    id: string;
    tool: string;
    arguments: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: unknown;
    error?: string;
}
export interface AIPlan {
    id: string;
    title: string;
    description: string;
    steps: AgentStep[];
    status: AgentStatus;
    createdAt: string;
    updatedAt: string;
}
export interface AgentTask {
    id: string;
    type: 'code' | 'terminal' | 'file' | 'search' | 'git' | 'debug';
    description: string;
    status: AgentStatus;
    result?: unknown;
    error?: string;
    toolCalls: AIToolCall[];
}
export interface AgentStep {
    id: string;
    title: string;
    description: string;
    status: AgentStatus;
    tasks: AgentTask[];
    reasoning?: string;
}
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
