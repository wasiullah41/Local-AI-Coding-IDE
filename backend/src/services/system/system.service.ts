import os from 'os';

export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  nodeVersion: string;
  ideVersion: string;
}

export class SystemService {
  getInfo(): SystemInfo {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      ideVersion: '0.1.0',
    };
  }

  getHealth(): { status: 'ok'; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

export const systemService = new SystemService();
