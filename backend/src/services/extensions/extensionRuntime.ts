import { ExtensionManifest } from '@local-ide/shared';
import vm from 'vm';
import fs from 'fs/promises';
import path from 'path';

export class ExtensionRuntime {
  static async activate(_extensionId: string, manifest: ExtensionManifest, installPath: string): Promise<void> {
    const mainPath = path.join(installPath, manifest.main);
    const code = await fs.readFile(mainPath, 'utf-8');

    const context = {
      console,
      IDE: {
        commands: {
          registerCommand: (command: string, _handler: Function) => {
            console.log(`[Extension] Registered command: ${command}`);
          }
        }
      }
    };

    const script = new vm.Script(code);
    script.runInNewContext(context);

    // In a real implementation, we'd call activate() if it exists
  }
}
