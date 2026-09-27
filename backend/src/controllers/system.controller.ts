import { Request, Response } from 'express';
import { systemService } from '../services/system/system.service';

export class SystemController {
  getInfo(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: systemService.getInfo(),
      timestamp: new Date().toISOString(),
    });
  }

  health(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: systemService.getHealth(),
      timestamp: new Date().toISOString(),
    });
  }
}

export const systemController = new SystemController();
