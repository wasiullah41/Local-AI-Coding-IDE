import { create } from 'zustand';
import { gitService } from '../services/git/gitService';
import type { GitStatus } from '@local-ide/shared';

interface GitState {
  status: GitStatus | null;
  loading: boolean;
  error: string | null;
  selectedFile: string | null;
  diff: string | null;
  diffLoading: boolean;

  refresh: () => Promise<void>;
  setSelectedFile: (path: string | null) => void;
  loadDiff: (path: string) => Promise<void>;
  clearDiff: () => void;
  stage: (path: string) => Promise<void>;
  unstage: (path: string) => Promise<void>;
  commit: (message: string) => Promise<void>;
  reset: () => void;
}

export const useGitStore = create<GitState>((set, get) => ({
  status: null,
  loading: false,
  error: null,
  selectedFile: null,
  diff: null,
  diffLoading: false,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const status = await gitService.getStatus();
      set({ status, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not read Git status.',
      });
    }
  },

  setSelectedFile: (selectedFile) => set({ selectedFile, diff: selectedFile ? null : null }),

  loadDiff: async (path) => {
    set({ diffLoading: true, selectedFile: path, error: null });
    try {
      const diff = await gitService.getDiff(path);
      set({ diff, diffLoading: false });
    } catch (error) {
      set({
        diffLoading: false,
        error: error instanceof Error ? error.message : 'Could not read the diff.',
      });
    }
  },

  clearDiff: () => set({ diff: null, selectedFile: null }),

  stage: async (path) => {
    try {
      await gitService.stage(path);
      await get().refresh();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Staging failed.' });
    }
  },

  unstage: async (path) => {
    try {
      await gitService.unstage(path);
      await get().refresh();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unstaging failed.' });
    }
  },

  commit: async (message) => {
    try {
      await gitService.commit(message);
      await get().refresh();
    } catch (error) {
      const message2 = error instanceof Error ? error.message : 'Commit failed.';
      set({ error: message2 });
      throw new Error(message2);
    }
  },

  reset: () =>
    set({ status: null, error: null, selectedFile: null, diff: null, diffLoading: false }),
}));

export const selectChangeCount = (state: GitState): number => state.status?.changes?.length ?? 0;
