import path from 'path';
import fs from 'fs/promises';
import { extensionRegistry } from './extensionRegistry';
import { ExtensionLoader } from './extensionLoader';
import { ExtensionRuntime } from './extensionRuntime';

export class ExtensionManager {
  private baseDir = path.join('D:', 'Local AI Coding IDE', 'extensions');

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      const dirs = await fs.readdir(this.baseDir);
      for (const dir of dirs) {
        await this.install(path.join(this.baseDir, dir));
      }
    } catch (e) {
      console.error('Failed to init extensions', e);
    }
  }

  async install(extensionDir: string): Promise<void> {
    const manifest = await ExtensionLoader.load(extensionDir);
    await extensionRegistry.register(manifest, extensionDir);
  }

  async enable(id: string): Promise<void> {
    const ext = extensionRegistry.get(id);
    if (!ext) throw new Error('Extension not found');

    extensionRegistry.updateState(id, 'activating');
    await ExtensionRuntime.activate(id, ext.manifest, ext.installPath);
    extensionRegistry.updateState(id, 'active');
  }
}

export const extensionManager = new ExtensionManager();
