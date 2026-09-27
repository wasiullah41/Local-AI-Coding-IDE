import { Request, Response } from 'express';
import { extensionsService } from '../services/extensions/extensions.service';

export class ExtensionsController {
  getAll(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: extensionsService.getAll(),
      timestamp: new Date().toISOString(),
    });
  }

  getById(req: Request, res: Response): void {
    const ext = extensionsService.getById(req.params.id);
    res.json({
      success: true,
      data: ext || null,
      timestamp: new Date().toISOString(),
    });
  }

  enable(req: Request, res: Response): void {
    const result = extensionsService.enable(req.params.id);
    res.json({
      success: result,
      timestamp: new Date().toISOString(),
    });
  }

  disable(req: Request, res: Response): void {
    const result = extensionsService.disable(req.params.id);
    res.json({
      success: result,
      timestamp: new Date().toISOString(),
    });
  }
}

export const extensionsController = new ExtensionsController();
