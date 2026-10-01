import { Request, Response, NextFunction } from 'express';
import { gitService } from '../services/git/git.service';
import { getWorkspaceRoot, isPathInsideWorkspace } from '../middleware/security.middleware';
import { AppError } from '../middleware/error.middleware';
import path from 'path';

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

  /**
   * Diff for a single file. The path is resolved against the workspace root and
   * rejected if it escapes, so this cannot be used to read arbitrary files.
   */
  async getDiff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: requestedPath } = req.body;
      const workspace = getWorkspaceRoot();
      if (!workspace || !requestedPath) throw new AppError(400, 'BAD_REQUEST', 'Missing path');

      const absolute = path.resolve(workspace, requestedPath);
      if (!isPathInsideWorkspace(absolute)) {
        throw new AppError(403, 'PATH_ESCAPE', 'That path is outside the workspace.');
      }

      const status = await gitService.getStatus(workspace);
      const relativePath = path.relative(workspace, absolute);
      const change = status.changes.find(
        (candidate) => path.resolve(candidate.path) === absolute
      );

      const diff = await gitService.getFileDiff(
        workspace,
        absolute,
        relativePath,
        change?.staged ?? false
      );

      res.json({ success: true, data: diff });
    } catch (err) {
      next(err);
    }
  }
}

export const gitController = new GitController();
