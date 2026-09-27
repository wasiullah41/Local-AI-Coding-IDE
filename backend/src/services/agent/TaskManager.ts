import { AgentState, createInitialState } from '../../ai/agent/agentState';

export class TaskManager {
  private tasks: Map<string, AgentState> = new Map();

  createTask(taskId: string, task: string, workspaceRoot: string): AgentState {
    const initialState = createInitialState(task, workspaceRoot);
    this.tasks.set(taskId, initialState);
    return initialState;
  }

  getTask(taskId: string): AgentState | undefined {
    return this.tasks.get(taskId);
  }

  updateTaskStatus(taskId: string, status: AgentState['status']) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
    }
  }

  cancelTask(taskId: string) {
    this.updateTaskStatus(taskId, 'CANCELLED');
  }
}

export const taskManager = new TaskManager();
