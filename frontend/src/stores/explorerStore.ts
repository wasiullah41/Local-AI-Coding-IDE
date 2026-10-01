import { create } from 'zustand';
import { FileEntry } from '@local-ide/shared';
import { fsService } from '../services/filesystem/fsService';

interface ExplorerState {
  rootFiles: FileEntry[];
  expandedFolders: Set<string>;
  loading: boolean;
  error: string | null;
  loadRootFiles: (path?: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  reveal: (path: string) => Promise<void>;
  reset: () => void;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  rootFiles: [],
  expandedFolders: new Set(),
  loading: false,
  error: null,

  loadRootFiles: async (path) => {
    set({ loading: true, error: null });
    try {
      const files = await fsService.readDirectory(path);
      set({ rootFiles: files, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not read the workspace.',
        rootFiles: [],
      });
    }
  },

  toggleFolder: (path) => {
    const expandedFolders = new Set(get().expandedFolders);
    if (expandedFolders.has(path)) {
      expandedFolders.delete(path);
    } else {
      expandedFolders.add(path);
    }
    set({ expandedFolders });
  },

  /** Expands every ancestor of a path so a file can be shown as selected. */
  reveal: async (path) => {
    const expanded = new Set(get().expandedFolders);
    const segments = path.split('/');
    for (let i = 1; i < segments.length; i++) {
      expanded.add(segments.slice(0, i).join('/'));
    }
    set({ expandedFolders: expanded });
  },

  reset: () => set({ rootFiles: [], expandedFolders: new Set(), error: null }),
}));
