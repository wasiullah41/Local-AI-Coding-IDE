import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { APP_PATHS } from '../../config/paths';

export interface IDESettings {
  general: {
    language: string;
    autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
    autoSaveDelay: number;
  };
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: 'off' | 'on' | 'wordWrapColumn';
    wordWrapColumn: number;
    minimap: boolean;
    lineNumbers: 'on' | 'off' | 'relative';
    renderWhitespace: 'none' | 'boundary' | 'all';
    bracketPairColorization: boolean;
    guides: boolean;
    smoothScrolling: boolean;
    cursorBlinking: string;
    cursorStyle: string;
    formatOnSave: boolean;
    formatOnPaste: boolean;
  };
  terminal: {
    defaultShell: string;
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
    scrollback: number;
  };
  appearance: {
    theme: 'dark' | 'light' | 'high-contrast';
    sidebarPosition: 'left' | 'right';
    activityBarVisible: boolean;
    statusBarVisible: boolean;
    menuBarVisible: boolean;
  };
  files: {
    exclude: string[];
    watcherExclude: string[];
    defaultEncoding: string;
    trimTrailingWhitespace: boolean;
    insertFinalNewline: boolean;
  };
  search: {
    exclude: string[];
    maxResults: number;
    followSymlinks: boolean;
  };
  git: {
    enabled: boolean;
    path: string;
    autoFetch: boolean;
    autoFetchInterval: number;
  };
}

const DEFAULT_SETTINGS: IDESettings = {
  general: {
    language: 'en',
    autoSave: 'off',
    autoSaveDelay: 1000,
  },
  editor: {
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    wordWrapColumn: 80,
    minimap: true,
    lineNumbers: 'on',
    renderWhitespace: 'none',
    bracketPairColorization: true,
    guides: true,
    smoothScrolling: true,
    cursorBlinking: 'blink',
    cursorStyle: 'line',
    formatOnSave: false,
    formatOnPaste: false,
  },
  terminal: {
    defaultShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    cursorStyle: 'block',
    scrollback: 5000,
  },
  appearance: {
    theme: 'dark',
    sidebarPosition: 'left',
    activityBarVisible: true,
    statusBarVisible: true,
    menuBarVisible: true,
  },
  files: {
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
    watcherExclude: ['node_modules', '.git', 'dist', 'build'],
    defaultEncoding: 'utf-8',
    trimTrailingWhitespace: false,
    insertFinalNewline: false,
  },
  search: {
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
    maxResults: 500,
    followSymlinks: false,
  },
  git: {
    enabled: true,
    path: 'git',
    autoFetch: false,
    autoFetchInterval: 180,
  },
};

export class SettingsService {
  private settings: IDESettings = { ...DEFAULT_SETTINGS };
  private settingsPath: string;

  constructor() {
    this.settingsPath = APP_PATHS.settings;
  }

  async load(): Promise<IDESettings> {
    try {
      if (fsSync.existsSync(this.settingsPath)) {
        const data = await fs.readFile(this.settingsPath, 'utf-8');
        const saved = JSON.parse(data);
        this.settings = this.mergeSettings(DEFAULT_SETTINGS, saved);
      }
    } catch (err) {
      console.error('Failed to load settings, using defaults:', err);
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.settings;
  }

  async save(settings: Partial<IDESettings>): Promise<IDESettings> {
    this.settings = this.mergeSettings(this.settings, settings);

    try {
      const dir = path.dirname(this.settingsPath);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }

    return this.settings;
  }

  get(): IDESettings {
    return { ...this.settings };
  }

  getDefaults(): IDESettings {
    return { ...DEFAULT_SETTINGS };
  }

  private mergeSettings<T extends Record<string, any>>(base: T, overrides: Partial<T>): T {
    const result = { ...base };
    for (const key of Object.keys(overrides) as Array<keyof T>) {
      const val = overrides[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val) && typeof result[key] === 'object') {
          result[key] = this.mergeSettings(result[key] as any, val as any);
        } else {
          result[key] = val as T[keyof T];
        }
      }
    }
    return result;
  }
}

export const settingsService = new SettingsService();
