import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export function validatePath(req: Request, _res: Response, next: NextFunction): void {
  const filePath = req.body?.path || req.query?.path || req.params?.path;

  if (filePath && typeof filePath === 'string') {
    // Prevent path traversal
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.includes('\0')) {
      next(new AppError(400, 'INVALID_PATH', 'Path contains invalid characters'));
      return;
    }
  }

  next();
}

export function validateRequired(...fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        next(new AppError(400, 'MISSING_FIELD', `Required field '${field}' is missing`));
        return;
      }
    }
    next();
  };
}
