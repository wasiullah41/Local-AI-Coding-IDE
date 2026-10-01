"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// ---------------------------------------------------------------------------
// ForgeAI Studio - Electron main process
//
// The renderer is the Vite-built React app. In development it is served by the
// Vite dev server; in production it is loaded from the built `dist/` folder.
// Both paths are resolved from this file's location so the app never depends
// on a hardcoded absolute path or a fragile environment variable.
// ---------------------------------------------------------------------------
const IS_DEV = !electron_1.app.isPackaged && process.env.NODE_ENV !== 'production';
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
// Electron otherwise derives the app name (and the userData directory) from the
// npm package name, which is scoped `@local-ide/frontend`. Pin the runtime
// identity to the product name so %APPDATA% and the app agree with the branding.
// Must run before anything reads app.getPath('userData').
electron_1.app.setName('ForgeAI Studio');
let mainWindow = null;
function resolveRendererFile() {
    // __dirname is <app>/electron-dist when built, so the renderer bundle sits
    // one level up in <app>/dist.
    return path_1.default.join(__dirname, '..', 'dist', 'index.html');
}
/**
 * Waits for the Vite dev server to accept connections.
 *
 * `npm run dev` starts the renderer, backend and Electron concurrently, so
 * Electron can be ready before Vite is listening. Without this the window
 * would show a connection error and need a manual reload.
 */
async function waitForDevServer(url, timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { method: 'GET' });
            if (response.ok || response.status === 404)
                return true;
        }
        catch {
            // Not up yet.
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 720,
        minHeight: 480,
        show: false,
        backgroundColor: '#0d1117',
        title: 'ForgeAI Studio',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.cjs'),
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
        if (/^https?:\/\//.test(url))
            void electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const allowed = IS_DEV ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://');
        if (!allowed)
            event.preventDefault();
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
                console.error(`[Electron] Vite dev server never became ready at ${DEV_SERVER_URL}. ` +
                    'Is `npm run dev:frontend` running?');
            }
            mainWindow?.loadURL(DEV_SERVER_URL);
        });
    }
    else {
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
async function showOpenDialog(options) {
    return mainWindow ? electron_1.dialog.showOpenDialog(mainWindow, options) : electron_1.dialog.showOpenDialog(options);
}
electron_1.ipcMain.handle('dialog:openDirectory', async () => {
    const result = await showOpenDialog({
        title: 'Open Folder',
        properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled)
        return [];
    return result.filePaths;
});
electron_1.ipcMain.handle('dialog:openFiles', async () => {
    const result = await showOpenDialog({
        title: 'Open File',
        properties: ['openFile'],
    });
    if (result.canceled)
        return [];
    return result.filePaths;
});
electron_1.ipcMain.handle('app:info', () => ({
    version: electron_1.app.getVersion(),
    platform: process.platform,
    isDev: IS_DEV,
    userDataPath: electron_1.app.getPath('userData'),
}));
electron_1.ipcMain.on('window:close', () => {
    if (mainWindow)
        mainWindow.close();
    else
        electron_1.app.quit();
});
// A minimal application menu so window/zoom shortcuts behave natively.
function buildMenu() {
    const template = [
        ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
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
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
electron_1.app.whenReady().then(() => {
    buildMenu();
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
