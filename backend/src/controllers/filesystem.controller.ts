import { Request, Response, NextFunction } from 'express';
import { filesystemService } from '../services/filesystem/filesystem.service';
import { getWorkspaceRoot } from '../middleware/security.middleware';
import { AppError } from '../middleware/error.middleware';
import path from 'path';

export class FilesystemController {
  async readDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = req.query.path as string;
      const workspace = getWorkspaceRoot();

      const targetPath = dirPath || workspace;
      if (!targetPath) {
        throw new AppError(400, 'NO_WORKSPACE', 'No workspace is open');
      }

      const rootPath = workspace || targetPath;
      const entries = await filesystemService.readDirectory(targetPath, rootPath);

      res.json({
        success: true,
        data: entries,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async readFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        throw new AppError(400, 'MISSING_PATH', 'File path is required');
      }

      const result = await filesystemService.readFile(filePath);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async writeFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath) {
        throw new AppError(400, 'MISSING_PATH', 'File path is required');
      }

      await filesystemService.writeFile(filePath, content);
      res.json({
        success: true,
        data: { path: filePath },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async createFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: filePath, content = '' } = req.body;
      if (!filePath) {
        throw new AppError(400, 'MISSING_PATH', 'File path is required');
      }

      await filesystemService.createFile(filePath, content);
      res.json({
        success: true,
        data: { path: filePath },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async createDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: dirPath } = req.body;
      if (!dirPath) {
        throw new AppError(400, 'MISSING_PATH', 'Directory path is required');
      }

      await filesystemService.createDirectory(dirPath);
      res.json({
        success: true,
        data: { path: dirPath },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async rename(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldPath, newPath } = req.body;
      if (!oldPath || !newPath) {
        throw new AppError(400, 'MISSING_PATHS', 'Both oldPath and newPath are required');
      }

      await filesystemService.rename(oldPath, newPath);
      res.json({
        success: true,
        data: { oldPath, newPath },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: targetPath } = req.body;
      if (!targetPath) {
        throw new AppError(400, 'MISSING_PATH', 'Path is required');
      }

      await filesystemService.delete(targetPath);
      res.json({
        success: true,
        data: { path: targetPath },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        throw new AppError(400, 'MISSING_PATH', 'Path is required');
      }

      const stats = await filesystemService.getStats(filePath);
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const filesystemController = new FilesystemController();
