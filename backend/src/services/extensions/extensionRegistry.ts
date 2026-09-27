import { ExtensionManifest, ExtensionInfo, ExtensionState } from '@local-ide/shared';

export class ExtensionRegistry {
  private extensions: Map<string, ExtensionInfo> = new Map();

  async register(manifest: ExtensionManifest, installPath: string): Promise<void> {
    this.extensions.set(manifest.id, {
      manifest,
      state: 'installed',
      installPath,
    });
  }

  get(id: string): ExtensionInfo | undefined {
    return this.extensions.get(id);
  }

  getAll(): ExtensionInfo[] {
    return Array.from(this.extensions.values());
  }

  updateState(id: string, state: ExtensionState): void {
    const ext = this.extensions.get(id);
    if (ext) {
      ext.state = state;
    }
  }

  remove(id: string): void {
    this.extensions.delete(id);
  }
}

export const extensionRegistry = new ExtensionRegistry();
