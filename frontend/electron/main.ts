import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'path';

// ---------------------------------------------------------------------------
// ForgeAI Studio - Electron main process
//
// The renderer is the Vite-built React app. In development it is served by the
// Vite dev server; in production it is loaded from the built `dist/` folder.
// Both paths are resolved from this file's location so the app never depends
// on a hardcoded absolute path or a fragile environment variable.
// ---------------------------------------------------------------------------

const IS_DEV = !app.isPackaged && process.env.NODE_ENV !== 'production';
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

// Electron otherwise derives the app name (and the userData directory) from the
// npm package name, which is scoped `@local-ide/frontend`. Pin the runtime
// identity to the product name so %APPDATA% and the app agree with the branding.
// Must run before anything reads app.getPath('userData').
app.setName('ForgeAI Studio');

let mainWindow: BrowserWindow | null = null;

function resolveRendererFile(): string {
  // __dirname is <app>/electron-dist when built, so the renderer bundle sits
  // one level up in <app>/dist.
  return path.join(__dirname, '..', 'dist', 'index.html');
}

/**
 * Waits for the Vite dev server to accept connections.
 *
 * `npm run dev` starts the renderer, backend and Electron concurrently, so
 * Electron can be ready before Vite is listening. Without this the window
 * would show a connection error and need a manual reload.
 */
async function waitForDevServer(url: string, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 404) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: '#0d1117',
    title: 'ForgeAI Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      webviewTag: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (process.env.IDE_OPEN_DEVTOOLS === '1') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Never let the renderer navigate away from the app or open windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = IS_DEV ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Electron] Renderer process gone:', details.reason);
  });
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[Electron] Preload failed to load:', preloadPath, error.message);
  });

  if (IS_DEV) {
    void waitForDevServer(DEV_SERVER_URL).then((ready) => {
      if (!ready) {
        console.error(
          `[Electron] Vite dev server never became ready at ${DEV_SERVER_URL}. ` +
            'Is `npm run dev:frontend` running?'
        );
      }
      mainWindow?.loadURL(DEV_SERVER_URL);
    });
  } else {
    const rendererFile = resolveRendererFile();
    mainWindow.loadFile(rendererFile);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC - deliberately small; everything else goes through the backend API.
// ---------------------------------------------------------------------------

/**
 * `showOpenDialog` is modal to a window when one exists. Without a parent window
 * the options-only overload is used, which still works but is not window-modal.
 */
async function showOpenDialog(
  options: Electron.OpenDialogOptions
): Promise<Electron.OpenDialogReturnValue> {
  return mainWindow ? dialog.showOpenDialog(mainWindow, options) : dialog.showOpenDialog(options);
}

ipcMain.handle('dialog:openDirectory', async (): Promise<string[]> => {
  const result = await showOpenDialog({
    title: 'Open Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('dialog:openFiles', async (): Promise<string[]> => {
  const result = await showOpenDialog({
    title: 'Open File',
    properties: ['openFile'],
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  isDev: IS_DEV,
  userDataPath: app.getPath('userData'),
}));

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
  else app.quit();
});

// A minimal application menu so window/zoom shortcuts behave natively.
function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'reload' },
    { role: 'forceReload' },
    { role: 'toggleDevTools' },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
    { role: 'window' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
