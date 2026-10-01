"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * The only surface the renderer gets. Deliberately tiny: no `fs`, no `child_process`,
 * no arbitrary IPC channels. Everything else goes through the backend HTTP API,
 * which enforces the workspace boundary server-side.
 */
const api = {
    openDirectory: () => electron_1.ipcRenderer.invoke('dialog:openDirectory'),
    openFiles: () => electron_1.ipcRenderer.invoke('dialog:openFiles'),
    getAppInfo: () => electron_1.ipcRenderer.invoke('app:info'),
    closeWindow: () => electron_1.ipcRenderer.send('window:close'),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
