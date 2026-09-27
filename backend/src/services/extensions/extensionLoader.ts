import fs from 'fs/promises';
import path from 'path';
import { ExtensionManifest } from '@local-ide/shared';
import { ExtensionValidator } from './extensionValidator';

export class ExtensionLoader {
  static async load(extensionDir: string): Promise<ExtensionManifest> {
    const manifestPath = path.join(extensionDir, 'extension.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    return ExtensionValidator.validateManifest(manifest, extensionDir);
  }
}
