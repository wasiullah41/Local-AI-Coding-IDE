import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The AI assistant is not a sidebar view; it has its own right-hand panel. */
export type SidebarView = 'explorer' | 'search' | 'git' | 'extensions' | 'settings';
export type BottomPanelTab = 'terminal' | 'problems' | 'output';

export const SIDEBAR_VIEWS: readonly SidebarView[] = [
  'explorer',
  'search',
  'git',
  'extensions',
  'settings',
];

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 560;
export const BOTTOM_PANEL_MIN_HEIGHT = 120;
export const AI_PANEL_MIN_WIDTH = 300;
export const AI_PANEL_MAX_WIDTH = 720;

interface LayoutState {
  // Sidebar
  activeView: SidebarView;
  sidebarVisible: boolean;
  sidebarWidth: number;

  // Secondary (right-hand) panel
  aiPanelVisible: boolean;
  aiPanelWidth: number;

  // Bottom panel
  bottomPanelVisible: boolean;
  bottomPanelHeight: number;
  bottomPanelTab: BottomPanelTab;

  // Command palette
  paletteOpen: boolean;

  setActiveView: (view: SidebarView) => void;
  toggleView: (view: SidebarView) => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarWidth: (width: number) => void;

  setAiPanelVisible: (visible: boolean) => void;
  setAiPanelWidth: (width: number) => void;
  toggleAiPanel: () => void;

  setBottomPanelVisible: (visible: boolean) => void;
  toggleBottomPanel: () => void;
  setBottomPanelHeight: (height: number) => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;

  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;

  resetLayout: () => void;
}

const DEFAULTS = {
  activeView: 'explorer' as SidebarView,
  sidebarVisible: true,
  sidebarWidth: 260,
  aiPanelVisible: true,
  aiPanelWidth: 400,
  bottomPanelVisible: true,
  bottomPanelHeight: 240,
  bottomPanelTab: 'terminal' as BottomPanelTab,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      paletteOpen: false,

      // A plain setter: it only ever shows the view, so callers like the command
      // palette's "View: Show X" cannot accidentally hide it.
      setActiveView: (view) => set({ activeView: view, sidebarVisible: true }),

      // Clicking the active icon collapses the sidebar, like a real IDE.
      toggleView: (view) =>
        set((state) => {
          if (state.activeView === view) {
            return { sidebarVisible: !state.sidebarVisible };
          }
          return { activeView: view, sidebarVisible: true };
        }),

      setSidebarVisible: (sidebarVisible) => set({ sidebarVisible }),
      setSidebarWidth: (sidebarWidth) =>
        set({ sidebarWidth: clamp(sidebarWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH) }),

      setAiPanelVisible: (aiPanelVisible) => set({ aiPanelVisible }),
      setAiPanelWidth: (aiPanelWidth) =>
        set({ aiPanelWidth: clamp(aiPanelWidth, AI_PANEL_MIN_WIDTH, AI_PANEL_MAX_WIDTH) }),
      toggleAiPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),

      setBottomPanelVisible: (bottomPanelVisible) => set({ bottomPanelVisible }),
      toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),
      setBottomPanelHeight: (height) =>
        set({ bottomPanelHeight: clamp(height, BOTTOM_PANEL_MIN_HEIGHT, window.innerHeight - 200) }),
      setBottomPanelTab: (bottomPanelTab) => set({ bottomPanelTab, bottomPanelVisible: true }),

      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),

      resetLayout: () => set({ ...DEFAULTS, paletteOpen: false }),
    }),
    {
      name: 'local-ide-layout',
      // Transient UI state such as the palette should not survive a restart.
      partialize: (state) => ({
        activeView: state.activeView,
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        aiPanelVisible: state.aiPanelVisible,
        aiPanelWidth: state.aiPanelWidth,
        bottomPanelVisible: state.bottomPanelVisible,
        bottomPanelHeight: state.bottomPanelHeight,
        bottomPanelTab: state.bottomPanelTab,
      }),
      // A layout saved before the AI moved to its own panel can hold
      // activeView: 'ai', which no longer resolves to a view.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<LayoutState>;
        const view = saved.activeView;
        if (view && !SIDEBAR_VIEWS.includes(view)) {
          return { ...current, ...saved, activeView: 'explorer' as SidebarView };
        }
        return { ...current, ...saved };
      },
    }
  )
);

/** Effective sidebar width, accounting for the collapsed state. */
export const getSidebarWidth = (state: LayoutState): number =>
  state.sidebarVisible ? state.sidebarWidth : 0;
