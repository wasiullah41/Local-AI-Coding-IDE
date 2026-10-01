import { useCallback, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

import { ThemeApplier } from '../themes/ThemeApplier';
import { TitleBar } from '../components/layout/TitleBar';
import { ActivityBar } from '../components/layout/ActivityBar';
import { Sidebar } from '../components/layout/Sidebar';
import { EditorArea } from '../components/editor/EditorArea';
import { BottomPanel } from '../components/layout/BottomPanel';
import { StatusBar } from '../components/layout/StatusBar';
import { ResizeHandle } from '../components/layout/ResizeHandle';
import { CommandPalette } from '../components/commandPalette/CommandPalette';
import { AIPanel } from '../components/ai/AIPanel';

import { useLayoutStore, AI_PANEL_MAX_WIDTH, AI_PANEL_MIN_WIDTH, BOTTOM_PANEL_MIN_HEIGHT } from '../stores/layoutStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAIStore } from '../stores/aiStore';
import { useEditorStore } from '../stores/editorStore';
import { useExplorerStore } from '../stores/explorerStore';
import { useGitStore } from '../stores/gitStore';
import { bindAgentEvents } from '../services/api/aiWebSocketService';
import { aiApiService } from '../services/api/aiApiService';

export default function App() {
  const layout = useLayoutStore();
  const { workspace, restoreSession, error, setError, connection } = useWorkspaceStore();
  const { addMessage, setRunning, setStatus, setError: setAiError } = useAIStore();
  const resetExplorer = useExplorerStore((s) => s.reset);
  const resetGit = useGitStore((s) => s.reset);

  // One connection for agent events and terminal I/O, bound for the app's life.
  useEffect(() => {
    bindAgentEvents();
    void restoreSession();
  }, [restoreSession]);

  // Global shortcuts. Registered once and aware of the current focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'p':
            event.preventDefault();
            layout.togglePalette();
            return;
          case 'e':
            event.preventDefault();
            layout.setActiveView('explorer');
            return;
          case 'f':
            event.preventDefault();
            layout.setActiveView('search');
            return;
          case 'g':
            event.preventDefault();
            layout.setActiveView('git');
            return;
          case 'i':
            event.preventDefault();
            layout.setAiPanelVisible(true);
            return;
          default:
            return;
        }
      }

      if (mod && event.key === '`') {
        event.preventDefault();
        layout.toggleBottomPanel();
        return;
      }

      // Ctrl+B toggles the sidebar, matching the common editor convention.
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        layout.setSidebarVisible(!layout.sidebarVisible);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layout]);

  // Warn before losing unsaved work, and warn before closing with a task running.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const dirty = useEditorStore.getState().tabs.filter((t) => t.isDirty).length;
      if (dirty > 0 || useAIStore.getState().running) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const startTask = useCallback(
    async (task: string) => {
      if (!workspace || !task.trim()) return;
      addMessage({ role: 'user', content: task.trim() });
      setRunning(true);
      setStatus('QUEUED');
      try {
        const res = await aiApiService.runTask(task.trim(), workspace.path);
        useAIStore.getState().setTaskId(res.taskId);
        layout.setAiPanelVisible(true);
      } catch (err) {
        setRunning(false);
        setStatus('FAILED');
        setAiError(err instanceof Error ? err.message : 'Could not start the task.');
      }
    },
    [workspace, addMessage, setAiError, setRunning, setStatus, layout]
  );

  const closeWorkspace = useCallback(() => {
    useWorkspaceStore.getState().closeWorkspace();
    resetExplorer();
    resetGit();
    useAIStore.getState().newConversation();
  }, [resetExplorer, resetGit]);

  const activityBarVisible = true;
  const { bottomPanelVisible, bottomPanelHeight, aiPanelVisible, aiPanelWidth } = layout;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ThemeApplier />

      <TitleBar />

      <div className="flex-1 flex min-h-0">
        {activityBarVisible && <ActivityBar />}

        <Sidebar />

        <main className="flex-1 flex min-w-0 flex-col">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <EditorArea onStartTask={(task) => void startTask(task)} />
            </div>

            {aiPanelVisible && workspace && (
              <>
                <ResizeHandle
                  orientation="vertical"
                  ariaLabel="Resize AI panel"
                  min={AI_PANEL_MIN_WIDTH}
                  max={AI_PANEL_MAX_WIDTH}
                  direction={-1}
                  getCurrentSize={() => useLayoutStore.getState().aiPanelWidth}
                  currentSize={aiPanelWidth}
                  onResize={layout.setAiPanelWidth}
                  onDoubleClick={() => layout.setAiPanelVisible(false)}
                />
                <aside
                  className="shrink-0 h-full flex flex-col min-w-0"
                  style={{ width: aiPanelWidth, borderLeft: '1px solid var(--color-border)' }}
                  aria-label="AI Assistant"
                >
                  <AIPanel workspaceRoot={workspace.path} />
                </aside>
              </>
            )}
          </div>

          {bottomPanelVisible && (
            <>
              <ResizeHandle
                orientation="horizontal"
                ariaLabel="Resize panel"
                min={BOTTOM_PANEL_MIN_HEIGHT}
                max={Math.max(BOTTOM_PANEL_MIN_HEIGHT, window.innerHeight - 220)}
                getCurrentSize={() => useLayoutStore.getState().bottomPanelHeight}
                currentSize={bottomPanelHeight}
                onResize={layout.setBottomPanelHeight}
                onDoubleClick={() => layout.setBottomPanelVisible(false)}
              />
              <div
                className="shrink-0"
                style={{ height: bottomPanelHeight, borderTop: '1px solid var(--color-border)' }}
              >
                <BottomPanel />
              </div>
            </>
          )}
        </main>
      </div>

      <StatusBar />

      <CommandPalette isOpen={layout.paletteOpen} onClose={() => layout.setPaletteOpen(false)} />

      {/* Non-blocking banners. Errors are dismissible; nothing blocks the UI. */}
      <div className="fixed bottom-8 right-4 z-40 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {error && (
          <div
            className="anim-slide-up flex items-start gap-2 p-2.5 rounded-lg text-[12px]"
            style={{
              background: 'var(--color-panel)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-panel)',
            }}
            role="alert"
          >
            <AlertCircle size={14} className="shrink-0 mt-px" style={{ color: 'var(--color-danger)' }} />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              className="ide-icon-button shrink-0"
              style={{ width: 18, height: 18 }}
              aria-label="Dismiss"
              onClick={() => setError(null)}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {connection === 'disconnected' && workspace && (
          <div
            className="anim-slide-up p-2.5 rounded-lg text-[12px]"
            style={{
              background: 'var(--color-panel)',
              border: '1px solid var(--color-warning)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-panel)',
            }}
            role="status"
          >
            Lost the connection to the backend. Reconnecting automatically — the app will keep
            working once it comes back.
          </div>
        )}
      </div>

      {workspace && (
        <button
          type="button"
          onClick={closeWorkspace}
          className="fixed top-10 right-4 z-30 text-[11px] px-2 py-1 rounded"
          style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          title="Close this folder"
        >
          Close folder
        </button>
      )}
    </div>
  );
}
