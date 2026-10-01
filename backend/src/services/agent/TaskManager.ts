import { AgentState, createInitialState } from '../../ai/agent/agentState';
import { AgentEventType, AgentPhase, AgentTaskSnapshot } from '@local-ide/shared';
import { permissionManager } from '../../ai/permissions/permissionManager';
import { processService } from '../../services/process/process.service';

export interface PermissionRequestPayload {
  requestId: string;
  taskId: string;
  type: string;
  tool: string;
  action: string;
  detail?: string;
  reason?: string;
  requestedAt: number;
}

interface TaskEntry {
  state: AgentState;
  controller: AbortController;
  emit: (type: AgentEventType, phase: AgentPhase, payload: Record<string, unknown>) => void;
}

export class TaskManager {
  private tasks = new Map<string, TaskEntry>();

  createTask(
    taskId: string,
    task: string,
    workspaceRoot: string,
    emit: TaskEntry['emit']
  ): { state: AgentState; signal: AbortSignal } {
    const state = createInitialState(task, workspaceRoot, taskId);
    const controller = new AbortController();
    this.tasks.set(taskId, { state, controller, emit });
    return { state, signal: controller.signal };
  }

  getState(taskId: string): AgentState | undefined {
    return this.tasks.get(taskId)?.state;
  }

  /**
   * Really stops the task: aborts the signal the orchestrator and every tool
   * are watching, kills any command it started, and denies any permission
   * dialog still on screen so nothing resumes afterwards.
   */
  cancelTask(taskId: string): boolean {
    const entry = this.tasks.get(taskId);
    if (!entry) return false;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(entry.state.status)) return false;

    entry.controller.abort();
    processService.cancelTask(taskId);
    permissionManager.denyTask(taskId);

    entry.state.status = 'CANCELLED';
    entry.state.finishedAt = Date.now();
    entry.state.error = 'Cancelled by the user.';
    return true;
  }

  finishTask(taskId: string): void {
    permissionManager.clearTaskGrants(taskId);
  }

  isRunning(taskId: string): boolean {
    const entry = this.tasks.get(taskId);
    if (!entry) return false;
    return !['COMPLETED', 'FAILED', 'CANCELLED'].includes(entry.state.status);
  }

  countRunning(): number {
    let count = 0;
    for (const entry of this.tasks.values()) {
      if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(entry.state.status)) count++;
    }
    return count;
  }

  /** Normalises the backend status onto the contract the renderer consumes. */
  snapshot(taskId: string): AgentTaskSnapshot | null {
    const entry = this.tasks.get(taskId);
    if (!entry) return null;
    const s = entry.state;
    return {
      taskId,
      task: s.task,
      status: s.status as AgentTaskSnapshot['status'],
      phase: (s.status === 'EXECUTING' ? 'RUNNING' : s.status) as AgentPhase,
      iterations: s.iterationCount,
      filesRead: [...new Set(s.filesRead)],
      filesChanged: [...new Set(s.filesChanged)],
      result: {
        summary: s.summary,
        filesRead: [...new Set(s.filesRead)],
        filesChanged: [...new Set(s.filesChanged)],
        verification: s.verificationResults,
        iterations: s.iterationCount,
      },
      error: s.error,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
    };
  }
}

export const taskManager = new TaskManager();
