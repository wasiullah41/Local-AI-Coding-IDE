import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings/settings.service';

export class SettingsController {
  async get(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.load();
      res.json({
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.save(req.body);
      res.json({
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  getDefaults(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: settingsService.getDefaults(),
      timestamp: new Date().toISOString(),
    });
  }
}

export const settingsController = new SettingsController();
