import { create } from 'zustand';
import { apiService } from '../services/api/apiService';
import { fsService } from '../services/filesystem/fsService';

export interface WorkspaceInfo {
  path: string;
  name: string;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: string;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface WorkspaceState {
  workspace: WorkspaceInfo | null;
  recent: RecentWorkspace[];
  /** Folders offered on the welcome screen, for one-click opening. */
  suggestions: WorkspaceInfo[];

  loading: boolean;
  error: string | null;
  connection: ConnectionState;

  openWorkspace: (path: string) => Promise<boolean>;
  restoreSession: () => Promise<void>;
  refreshRecent: () => Promise<void>;
  closeWorkspace: () => void;
  setConnection: (state: ConnectionState) => void;
  setError: (error: string | null) => void;
  /** True when a local folder is available to open without a native dialog. */
  canBrowse: boolean;
  browseForFolder: () => Promise<string[]>;
}

const LAST_WORKSPACE_KEY = 'local-ide-last-workspace';

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  recent: [],
  suggestions: [],
  loading: false,
  error: null,
  connection: 'connecting',
  canBrowse: typeof window !== 'undefined' && Boolean(window.electronAPI?.openDirectory),

  openWorkspace: async (path) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.post('/workspace/open', { path });
      const workspace = response.data.data as WorkspaceInfo;
      set({ workspace, loading: false, error: null, connection: 'connected' });
      try {
        localStorage.setItem(LAST_WORKSPACE_KEY, workspace.path);
      } catch {
        // Storage is optional.
      }
      void get().refreshRecent();
      return true;
    } catch (error) {
      set({
        loading: false,
        error: describeError(error, 'Could not open that folder.'),
      });
      return false;
    }
  },

  restoreSession: async () => {
    let lastPath: string | null = null;
    try {
      lastPath = localStorage.getItem(LAST_WORKSPACE_KEY);
    } catch {
      lastPath = null;
    }

    if (lastPath) {
      const opened = await get().openWorkspace(lastPath);
      if (opened) return;
    }

    // Otherwise just report whatever folder the backend still has open.
    try {
      const response = await apiService.get('/workspace/current');
      const current = response.data.data as WorkspaceInfo | null;
      if (current) {
        set({ workspace: current, connection: 'connected' });
        return;
      }
    } catch {
      // No workspace is a normal state, not an error.
    }

    try {
      await get().refreshRecent();
    } catch {
      // Ignore: the welcome screen still works without recents.
    }
  },

  refreshRecent: async () => {
    try {
      const response = await apiService.get('/workspace/recent');
      const recent = (response.data.data as RecentWorkspace[]) ?? [];
      set({ recent, suggestions: recent.slice(0, 6) });
    } catch {
      set({ recent: [], suggestions: [] });
    }
  },

  closeWorkspace: () => {
    set({ workspace: null });
    try {
      localStorage.removeItem(LAST_WORKSPACE_KEY);
    } catch {
      // Ignore.
    }
  },

  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),

  browseForFolder: async () => {
    if (!window.electronAPI?.openDirectory) return [];
    try {
      return await window.electronAPI.openDirectory();
    } catch {
      return [];
    }
  },
}));

/** Turns an axios error into something a developer can act on. */
export function describeError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    const message = response?.data?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Re-exported so components do not need to import the service directly. */
export { fsService };
