import React from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export const TabBar: React.FC = () => {
  const { tabs, activeTabPath, setActiveTab, closeTab, saveTab } = useEditorStore();
  const setError = useWorkspaceStore((s) => s.setError);

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-stretch shrink-0 h-9 overflow-x-auto ide-scroll"
      style={{ background: 'var(--color-tabs)', borderColor: 'var(--color-border)' }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const workspace = useWorkspaceStore.getState().workspace;
        const relative =
          workspace && tab.path.startsWith(workspace.path)
            ? tab.path.slice(workspace.path.length).replace(/^[\\/]/, '')
            : tab.name;

        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            title={relative}
            onClick={() => setActiveTab(tab.path)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setActiveTab(tab.path);
            }}
            onAuxClick={(event) => {
              // Middle-click closes, as in VS Code.
              if (event.button === 1) void closeTab(tab.path);
            }}
            className="group flex items-center gap-1.5 px-3 shrink-0 cursor-pointer border-r transition-colors"
            style={{
              background: isActive ? 'var(--color-tab-active)' : 'var(--color-tabs)',
              borderColor: 'var(--color-border)',
              color: isActive ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
            }}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute"
                style={{ height: 1.5, top: 0, left: 0, right: 0, background: 'var(--color-accent)' }}
              />
            )}
            <span className="text-[13px] truncate max-w-[180px]">
              {tab.name}
              {tab.isDirty && (
                <span
                  className="ml-1"
                  style={{ color: 'var(--color-text-strong)' }}
                  title="Unsaved changes"
                >
                  ●
                </span>
              )}
            </span>
            <button
              type="button"
              aria-label={`Close ${tab.name}`}
              title={tab.isDirty ? 'Save and close' : 'Close'}
              className="ide-icon-button shrink-0"
              style={{ width: 18, height: 18, opacity: isActive || tab.isDirty ? 1 : 0 }}
              onClick={async (event) => {
                event.stopPropagation();
                try {
                  if (tab.isDirty) await saveTab(tab.path);
                  closeTab(tab.path);
                } catch (error) {
                  setError(error instanceof Error ? error.message : 'Save failed.');
                }
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default TabBar;
