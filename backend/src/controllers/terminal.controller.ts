import { Request, Response } from 'express';
import { terminalService } from '../services/terminal/terminal.service';

export class TerminalController {
  getSessions(_req: Request, res: Response): void {
    const sessions = terminalService.getAllSessions();
    res.json({
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    });
  }

  getDefaultShell(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: { shell: terminalService.getDefaultShell() },
      timestamp: new Date().toISOString(),
    });
  }
}

export const terminalController = new TerminalController();
