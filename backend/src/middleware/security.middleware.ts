import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { AppError } from './error.middleware';

let workspaceRoot: string | null = null;

export function setWorkspaceRoot(root: string): void {
  workspaceRoot = path.resolve(root);
}

export function getWorkspaceRoot(): string | null {
  return workspaceRoot;
}

export function isPathInsideWorkspace(targetPath: string): boolean {
  if (!workspaceRoot) return true;

  const resolvedTarget = path.resolve(workspaceRoot, targetPath);
  const relative = path.relative(workspaceRoot, resolvedTarget);

  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function validateWorkspaceBoundary(req: Request, _res: Response, next: NextFunction): void {
  if (!workspaceRoot) {
    next();
    return;
  }

  const filePath = req.body?.path || req.query?.path || req.body?.oldPath || req.body?.newPath;
  if (!filePath) {
    next();
    return;
  }

  if (!isPathInsideWorkspace(filePath)) {
    next(new AppError(403, 'ACCESS_DENIED', 'Path is outside workspace boundary'));
    return;
  }

  next();
}
