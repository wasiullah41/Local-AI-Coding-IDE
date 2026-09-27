import { create } from 'zustand';
import { WorkspaceSettings, defaultSettings } from '@local-ide/shared';
import { persist } from 'zustand/middleware';

interface SettingsState {
  settings: WorkspaceSettings;
  updateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'local-ide-settings',
    }
  )
);
