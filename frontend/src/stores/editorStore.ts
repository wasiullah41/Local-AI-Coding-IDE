import { create } from 'zustand';
import { fsService } from '../services/filesystem/fsService';

interface EditorTab {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabPath: string | null;
  pendingNavigation: { line: number; column: number } | null;
  openFile: (path: string, line?: number, column?: number) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveTab: (path: string) => Promise<void>;
  clearPendingNavigation: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabPath: null,
  pendingNavigation: null,

  openFile: async (path, line, column) => {
    const state = get();
    const existingTab = state.tabs.find(t => t.path === path);

    if (existingTab) {
      set({
        activeTabPath: path,
        pendingNavigation: line !== undefined && column !== undefined ? { line, column } : null
      });
      return;
    }

    try {
      const fileData = await fsService.readFile(path);
      const name = path.split('/').pop() || path.split('\\').pop() || 'untitled';
      const ext = name.split('.').pop() || '';
      const languageMap: Record<string, string> = {
        'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
        'json': 'json', 'html': 'html', 'css': 'css', 'md': 'markdown', 'py': 'python'
      };
      const language = languageMap[ext] || 'plaintext';

      set((state) => ({
        tabs: [...state.tabs, {
          path,
          name,
          content: fileData.content,
          language: fileData.language || language,
          isDirty: false
        }],
        activeTabPath: path,
        pendingNavigation: line !== undefined && column !== undefined ? { line, column } : null
      }));
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  },

  clearPendingNavigation: () => set({ pendingNavigation: null }),

  closeTab: (path) =>
    set((state) => ({
      tabs: state.tabs.filter(t => t.path !== path),
      activeTabPath: state.activeTabPath === path ? null : state.activeTabPath
    })),
  setActiveTab: (path) => set({ activeTabPath: path }),
  updateContent: (path, content) =>
    set((state) => ({
      tabs: state.tabs.map(t => t.path === path ? { ...t, content, isDirty: true } : t)
    })),
  saveTab: async (path: string) => {
    const tab = get().tabs.find(t => t.path === path);
    if (!tab) return;
    await fsService.writeFile(path, tab.content);
    set((state) => ({
      tabs: state.tabs.map(t => t.path === path ? { ...t, isDirty: false } : t)
    }));
  }
}));
