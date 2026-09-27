export interface AgentTaskRequest {
    task: string;
    workspaceRoot: string;
}

export type AgentStatus = 'QUEUED' | 'RUNNING' | 'WAITING_PERMISSION' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AgentTask {
    taskId: string;
    status: AgentStatus;
    messages: { role: string; content: string }[];
}

export interface AgentEvent {
    taskId: string;
    type: 'TASK_CREATED' | 'TASK_STARTED' | 'TASK_QUEUED' | 'PLAN_CREATED' | 'TOOL_STARTED' | 'TOOL_RESULT' | 'FILE_CHANGED' | 'TERMINAL_STARTED' | 'TERMINAL_OUTPUT' | 'VERIFICATION_STARTED' | 'VERIFICATION_RESULT' | 'PERMISSION_REQUESTED' | 'PERMISSION_RESOLVED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'TASK_CANCELLED';
    payload: any;
    timestamp: number;
}
