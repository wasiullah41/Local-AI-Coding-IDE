import { create } from 'zustand';
import { FileEntry } from '@local-ide/shared';
import { fsService } from '../services/filesystem/fsService';

interface ExplorerState {
  rootFiles: FileEntry[];
  expandedFolders: Set<string>;
  loadRootFiles: (path?: string) => Promise<void>;
  toggleFolder: (path: string) => Promise<void>;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  rootFiles: [],
  expandedFolders: new Set(),
  loadRootFiles: async (path?: string) => {
    const files = await fsService.readDirectory(path);
    set({ rootFiles: files });
  },
  toggleFolder: async (path: string) => {
    const { expandedFolders } = get();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    set({ expandedFolders: newExpanded });
  }
}));
