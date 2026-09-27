import { ExtensionManifest } from '@local-ide/shared';
import path from 'path';

export class ExtensionValidator {
  static validateManifest(manifest: any, installPath: string): ExtensionManifest {
    if (!manifest.id || typeof manifest.id !== 'string') throw new Error('Invalid extension ID');
    if (!manifest.name || typeof manifest.name !== 'string') throw new Error('Invalid extension name');
    if (!manifest.version || typeof manifest.version !== 'string') throw new Error('Invalid extension version');
    if (!manifest.main || typeof manifest.main !== 'string') throw new Error('Invalid main entry point');

    // Path traversal protection
    const mainPath = path.resolve(installPath, manifest.main);
    if (!mainPath.startsWith(path.resolve(installPath))) {
      throw new Error('Path traversal detected in manifest');
    }

    return manifest as ExtensionManifest;
  }
}
