/// <reference types="vite/client" />

/**
 * The preload bridge. Present only when the renderer runs inside Electron; the
 * browser-only dev server has no `window.electronAPI`, so every use is guarded.
 */
export interface ElectronAPI {
  openDirectory: () => Promise<string[]>;
  openFiles: () => Promise<string[]>;
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    isDev: boolean;
    userDataPath: string;
  }>;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Only the extra variables are declared here; `ImportMeta.env` itself is
 * provided by the `vite/client` reference above. The interface is never
 * referenced by name, so the unused-vars rule needs to be told that merging
 * this ambient declaration is the whole point.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_BACKEND_HOST?: string;
  readonly VITE_BACKEND_PORT?: string;
}

export {};
