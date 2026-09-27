import { Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspace/workspace.service';
import { setWorkspaceRoot } from '../middleware/security.middleware';

export class WorkspaceController {
  async open(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: workspacePath } = req.body;
      const result = await workspaceService.open(workspacePath);
      setWorkspaceRoot(result.path);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  getCurrent(_req: Request, res: Response): void {
    const current = workspaceService.getCurrent();
    res.json({
      success: true,
      data: current,
      timestamp: new Date().toISOString(),
    });
  }

  async getRecent(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recent = await workspaceService.getRecent();
      res.json({
        success: true,
        data: recent,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const workspaceController = new WorkspaceController();
