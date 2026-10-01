import { contextBridge, ipcRenderer } from 'electron';

/**
 * The only surface the renderer gets. Deliberately tiny: no `fs`, no `child_process`,
 * no arbitrary IPC channels. Everything else goes through the backend HTTP API,
 * which enforces the workspace boundary server-side.
 */
const api = {
  openDirectory: (): Promise<string[]> => ipcRenderer.invoke('dialog:openDirectory'),
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  getAppInfo: (): Promise<{
    version: string;
    platform: string;
    isDev: boolean;
    userDataPath: string;
  }> => ipcRenderer.invoke('app:info'),
  closeWindow: (): void => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
