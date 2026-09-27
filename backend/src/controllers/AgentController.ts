import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { taskManager } from '../services/agent/TaskManager';
import { AgentOrchestrator } from '../ai/agent/agentOrchestrator';
import { toolRegistry } from '../ai/tools/toolRegistry';
import { OllamaProvider } from '../ai/llm/ollamaProvider';
import { WSServer } from '../websocket/websocket.server';

export class AgentController {
  async runTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { task, workspaceRoot } = req.body;
      const taskId = uuidv4();

      const state = taskManager.createTask(taskId, task, workspaceRoot);
      res.json({ success: true, data: { taskId, status: 'QUEUED' } });

      const ws = WSServer.getInstance();
      ws.broadcast('agent:task_status', { taskId, status: 'QUEUED' });

      // Trigger orchestrator asynchronously
      const orchestrator = new AgentOrchestrator(new OllamaProvider(), toolRegistry);
      taskManager.updateTaskStatus(taskId, 'EXECUTING');
      ws.broadcast('agent:task_status', { taskId, status: 'EXECUTING' });

      orchestrator.run(state, (event) => {
        ws.broadcast('agent:event', event);
      }).then(finalState => {
          taskManager.updateTaskStatus(taskId, finalState.status);
          ws.broadcast('agent:task_status', { taskId, status: finalState.status });
      });

    } catch (err) {
      next(err);
    }
  }

  cancelTask(req: Request, res: Response): void {
    const { taskId } = req.body;
    taskManager.cancelTask(taskId);
    WSServer.getInstance().broadcast('agent:task_status', { taskId, status: 'CANCELLED' });
    res.json({ success: true });
  }
}

export const agentController = new AgentController();
