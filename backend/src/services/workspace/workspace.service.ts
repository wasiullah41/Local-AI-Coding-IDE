import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { APP_PATHS } from '../../config/paths';
import { AppError } from '../../middleware/error.middleware';

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: string;
}

export class WorkspaceService {
  private currentWorkspace: string | null = null;
  private recentWorkspacesPath: string;

  constructor() {
    this.recentWorkspacesPath = path.join(APP_PATHS.data, 'recent-workspaces.json');
  }

  async open(workspacePath: string): Promise<{ path: string; name: string }> {
    const resolved = path.resolve(workspacePath);

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isDirectory()) {
        throw new AppError(400, 'NOT_DIRECTORY', 'Path is not a directory');
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(404, 'NOT_FOUND', `Directory not found: ${resolved}`);
    }

    this.currentWorkspace = resolved;
    const name = path.basename(resolved);

    // Update recent workspaces
    await this.addToRecent(resolved, name);

    return { path: resolved, name };
  }

  getCurrent(): { path: string; name: string } | null {
    if (!this.currentWorkspace) return null;
    return {
      path: this.currentWorkspace,
      name: path.basename(this.currentWorkspace),
    };
  }

  async getRecent(): Promise<RecentWorkspace[]> {
    try {
      if (fsSync.existsSync(this.recentWorkspacesPath)) {
        const data = await fs.readFile(this.recentWorkspacesPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  }

  private async addToRecent(workspacePath: string, name: string): Promise<void> {
    const recent = await this.getRecent();
    const filtered = recent.filter(w => w.path !== workspacePath);
    filtered.unshift({
      path: workspacePath,
      name,
      lastOpenedAt: new Date().toISOString(),
    });

    // Keep max 20 recent workspaces
    const trimmed = filtered.slice(0, 20);

    try {
      const dir = path.dirname(this.recentWorkspacesPath);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(this.recentWorkspacesPath, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save recent workspaces:', err);
    }
  }
}

export const workspaceService = new WorkspaceService();
