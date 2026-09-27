import { AITool, AIToolResult } from '../tools/toolTypes';

export type AgentStatus = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AgentState {
  task: string;
  workspaceRoot: string;
  messages: { role: 'user' | 'assistant' | 'tool'; content: string }[];
  plan: string[];
  currentStep: number;
  toolCalls: { tool: string; args: Record<string, unknown> }[];
  toolResults: AIToolResult[];
  filesRead: string[];
  filesChanged: string[];
  verificationResults: string[];
  iterationCount: number;
  status: AgentStatus;
  error?: string;
}

export function createInitialState(task: string, workspaceRoot: string): AgentState {
  return {
    task,
    workspaceRoot,
    messages: [],
    plan: [],
    currentStep: 0,
    toolCalls: [],
    toolResults: [],
    filesRead: [],
    filesChanged: [],
    verificationResults: [],
    iterationCount: 0,
    status: 'IDLE',
  };
}
