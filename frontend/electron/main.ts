import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';

console.log('Main process started');

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler Placeholders
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.filePaths;
});
