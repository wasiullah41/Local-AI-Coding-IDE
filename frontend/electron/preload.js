import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    openDirectory: function () { return ipcRenderer.invoke('dialog:openDirectory'); },
    // Add other IPC handlers here as they are implemented
});
