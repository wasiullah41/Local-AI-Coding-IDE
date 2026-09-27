"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
console.log('Main process started');
// Prevent multiple instances
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // Explicitly set cache directory to a temporary folder within the project
    // app.setPath('userData', path.join(__dirname, '../temp_electron_cache'));
    // Diagnostics
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[Electron] Renderer failed to load:', errorCode, errorDescription);
    });
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer Console] ${message} (Level: ${level}) at ${sourceId}:${line}`);
    });
    mainWindow.webContents.on('did-frame-finish-load', () => {
        console.log('[Electron] Did finish load');
    });
    // Note: The following events are commented out due to TypeScript compatibility issues with the current electron types.
    // They can be re-enabled if needed for debugging.
    // mainWindow.webContents.on('render-process-gone', (event, details) => {
    //   console.error('[Electron] Renderer process gone:', details);
    // });
    // mainWindow.webContents.on('crashed', () => {
    //   console.error('[Electron] Renderer crashed');
    // });
    // mainWindow.webContents.on('unresponsive', () => {
    //   console.error('[Electron] Renderer unresponsive');
    // });
    // mainWindow.webContents.on('responsive', () => {
    //   console.log('[Electron] Renderer responsive again');
    // });
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC Handler Placeholders
electron_1.ipcMain.handle('dialog:openDirectory', async () => {
    const result = await electron_1.dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.filePaths;
});
