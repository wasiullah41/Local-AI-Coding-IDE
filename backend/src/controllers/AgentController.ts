import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { taskManager } from '../services/agent/TaskManager';
import { AgentOrchestrator } from '../ai/agent/agentOrchestrator';
import { toolRegistry } from '../ai/tools/toolRegistry';
import { llmProviderFactory } from '../ai/llm/llmProviderFactory';
import { permissionManager, PermissionType, PermissionAction } from '../ai/permissions/permissionManager';
import { WSServer } from '../websocket/websocket.server';
import { getWorkspaceRoot } from '../middleware/security.middleware';
import { AppError } from '../middleware/error.middleware';
import { AgentEvent, AgentEventType, AgentPhase } from '@local-ide/shared';
import path from 'path';

export class AgentController {
  /**
   * Starts an agent task and returns immediately; progress streams over the
   * WebSocket. `workspaceRoot` in the body is not trusted — the agent is
   * pinned to whatever workspace is actually open on the server.
   */
  async runTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { task } = req.body as { task?: string; workspaceRoot?: string };

      if (typeof task !== 'string' || task.trim().length === 0) {
        throw new AppError(400, 'INVALID_TASK', 'Describe what you want the agent to do.');
      }

      const activeRoot = getWorkspaceRoot();
      if (!activeRoot) {
        throw new AppError(
          400,
          'NO_WORKSPACE',
          'Open a folder before starting an agent task. The agent only works inside the open workspace.'
        );
      }

      const requested = (req.body as { workspaceRoot?: string }).workspaceRoot;
      if (requested && path.resolve(requested) !== activeRoot) {
        throw new AppError(
          403,
          'ACCESS_DENIED',
          'The task targets a different folder than the open workspace.'
        );
      }

      let provider;
      try {
        provider = llmProviderFactory.getProvider();
      } catch (error) {
        throw new AppError(
          500,
          'PROVIDER_CONFIG',
          error instanceof Error ? error.message : 'The model provider is misconfigured.'
        );
      }

      if (!(await provider.isAvailable())) {
        const reason = (await provider.describeFailure?.()) ?? 'The model provider is unavailable.';
        throw new AppError(503, 'PROVIDER_UNAVAILABLE', reason);
      }

      const taskId = uuidv4();
      const ws = WSServer.getInstance();

      const emit = (type: AgentEventType, phase: AgentPhase, payload: Record<string, unknown>) => {
        const event: AgentEvent = { taskId, type, phase, payload, timestamp: Date.now() };
        ws.broadcast('agent:event', event);
      };

      const { state, signal } = taskManager.createTask(taskId, task.trim(), activeRoot, emit);
      state.status = 'QUEUED';

      res.json({
        success: true,
        data: { taskId, status: 'QUEUED' },
        timestamp: new Date().toISOString(),
      });

      emit('TASK_QUEUED', 'IDLE', { task: state.task });

      const orchestrator = new AgentOrchestrator(provider, toolRegistry);

      // Fire and forget, but never unhandled: a crash here must become a
      // TASK_FAILED event, not a rejected promise nobody sees.
      orchestrator
        .run(state, {
          signal,
          onEvent: emit,
          context: {
            taskId,
            signal,
            onPermissionRequest: (payload) => {
              state.status = 'WAITING_PERMISSION';
              ws.broadcast('agent:task_status', { taskId, status: 'WAITING_PERMISSION' });
              emit('PERMISSION_REQUESTED', 'WAITING_PERMISSION', payload as unknown as Record<string, unknown>);
            },
            onPermissionResolved: ({ tool, allowed }) => {
              state.status = 'EXECUTING';
              emit('PERMISSION_RESOLVED', allowed ? 'THINKING' : 'THINKING', { tool, allowed });
            },
          },
        })
        .catch((error: unknown) => {
          state.status = 'FAILED';
          state.error = error instanceof Error ? error.message : 'The agent stopped unexpectedly.';
          state.finishedAt = Date.now();
          emit('TASK_FAILED', 'FAILED', { error: state.error });
        })
        .finally(() => {
          taskManager.finishTask(taskId);
          const snapshot = taskManager.snapshot(taskId);
          if (snapshot) ws.broadcast('agent:task_status', { ...snapshot, taskId });
        });
    } catch (err) {
      next(err);
    }
  }

  cancelTask(req: Request, res: Response, next: NextFunction): void {
    try {
      const { taskId } = req.body as { taskId?: string };
      if (!taskId) throw new AppError(400, 'MISSING_TASK_ID', 'taskId is required.');

      const cancelled = taskManager.cancelTask(taskId);
      const snapshot = taskManager.snapshot(taskId);

      if (cancelled) {
        const ws = WSServer.getInstance();
        const event: AgentEvent = {
          taskId,
          type: 'TASK_CANCELLED',
          phase: 'CANCELLED',
          payload: { reason: 'Cancelled by the user.' },
          timestamp: Date.now(),
        };
        ws.broadcast('agent:event', event);
        ws.broadcast('agent:task_status', { ...snapshot, taskId });
      }

      res.json({
        success: true,
        data: { taskId, status: snapshot?.status ?? (cancelled ? 'CANCELLED' : 'UNKNOWN') },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /** Answers a permission dialog raised by a running task. */
  respondPermission(req: Request, res: Response, next: NextFunction): void {
    try {
      const { requestId, allowed, remember } = req.body as {
        requestId?: string;
        allowed?: boolean;
        remember?: boolean;
      };
      if (!requestId || typeof allowed !== 'boolean') {
        throw new AppError(400, 'INVALID_RESPONSE', 'requestId and allowed are required.');
      }

      const ok = permissionManager.resolveByRequestId(requestId, allowed, remember === true);
      if (!ok) {
        throw new AppError(404, 'NOT_FOUND', 'That permission request is no longer pending.');
      }

      res.json({ success: true, data: { requestId, allowed }, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  /** Lets the user tune the policy the agent has to work under. */
  async getPermissions(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    res.json({
      success: true,
      data: { policy: permissionManager.getPolicy(), pending: permissionManager.getPendingCount() },
      timestamp: new Date().toISOString(),
    });
  }

  async setPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, action } = req.body as { type?: string; action?: string };
      const validTypes = Object.values(PermissionType);
      const validActions: PermissionAction[] = ['ALLOW', 'DENY', 'REQUIRE_CONFIRMATION'];

      if (!type || !validTypes.includes(type as PermissionType)) {
        throw new AppError(400, 'INVALID_TYPE', `type must be one of: ${validTypes.join(', ')}`);
      }
      if (!action || !validActions.includes(action as PermissionAction)) {
        throw new AppError(400, 'INVALID_ACTION', `action must be one of: ${validActions.join(', ')}`);
      }

      permissionManager.setPolicy(type as PermissionType, action as PermissionAction);
      res.json({
        success: true,
        data: { policy: permissionManager.getPolicy() },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /** Reports whether a model is reachable, so the UI can explain itself. */
  async getStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = llmProviderFactory.getProvider();
      const available = await provider.isAvailable();
      const message = available ? undefined : await provider.describeFailure?.();
      const { model, provider: providerName } = provider.getModelInfo();

      res.json({
        success: true,
        data: {
          provider: { provider: providerName, model, available, message },
          runningTasks: taskManager.countRunning(),
          tools: toolRegistry.listTools(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  getTask(req: Request, res: Response, next: NextFunction): void {
    try {
      const { taskId } = req.params as { taskId?: string };
      if (!taskId) throw new AppError(400, 'MISSING_TASK_ID', 'taskId is required.');
      const snapshot = taskManager.snapshot(taskId);
      if (!snapshot) throw new AppError(404, 'NOT_FOUND', 'Unknown task.');
      res.json({ success: true, data: snapshot, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }
}

export const agentController = new AgentController();
