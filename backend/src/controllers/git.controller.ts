import { Request, Response, NextFunction } from 'express';
import { gitService } from '../services/git/git.service';
import { getWorkspaceRoot } from '../middleware/security.middleware';
import { AppError } from '../middleware/error.middleware';

export class GitController {
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspace = getWorkspaceRoot();
      if (!workspace) throw new AppError(400, 'NO_WORKSPACE', 'No workspace is open');

      const status = await gitService.getStatus(workspace);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async stage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path } = req.body;
      const workspace = getWorkspaceRoot();
      if (!workspace || !path) throw new AppError(400, 'BAD_REQUEST', 'Missing path');

      await gitService.stageFile(workspace, path);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async unstage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path } = req.body;
      const workspace = getWorkspaceRoot();
      if (!workspace || !path) throw new AppError(400, 'BAD_REQUEST', 'Missing path');

      await gitService.unstageFile(workspace, path);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async commit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message } = req.body;
      const workspace = getWorkspaceRoot();
      if (!workspace || !message) throw new AppError(400, 'BAD_REQUEST', 'Missing message');

      await gitService.commit(workspace, message);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export const gitController = new GitController();
