import { AIToolResult } from '../tools/toolTypes';

export type AgentStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'WAITING_PERMISSION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentState {
  taskId: string;
  task: string;
  workspaceRoot: string;
  messages: { role: 'user' | 'assistant' | 'tool'; content: string }[];
  plan: string[];
  currentStep: number;
  toolCalls: { tool: string; args: Record<string, unknown> }[];
  toolResults: AIToolResult[];
  filesRead: string[];
  filesChanged: string[];
  verificationResults: { command?: string; success: boolean; exitCode?: number }[];
  iterationCount: number;
  status: AgentStatus;
  summary?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export function createInitialState(
  task: string,
  workspaceRoot: string,
  taskId = 'adhoc'
): AgentState {
  return {
    taskId,
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
    startedAt: Date.now(),
  };
}

/** Maps a backend status to the phase label the UI renders. */
export function toPhase(status: AgentStatus): string {
  switch (status) {
    case 'QUEUED':
      return 'IDLE';
    case 'PLANNING':
    case 'EXECUTING':
      return 'THINKING';
    case 'VERIFYING':
      return 'VERIFYING';
    case 'WAITING_PERMISSION':
      return 'WAITING_PERMISSION';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
      return 'FAILED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'IDLE';
  }
}
