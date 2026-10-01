import React, { useEffect, useRef, useState } from 'react';
import { Terminal, AlertTriangle, ScrollText, X, Trash2 } from 'lucide-react';
import { useLayoutStore, type BottomPanelTab } from '../../stores/layoutStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useEditorStore } from '../../stores/editorStore';
import { TerminalPanel } from '../terminal/TerminalPanel';

const TABS: { id: BottomPanelTab; label: string; icon: React.ElementType }[] = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'problems', label: 'Problems', icon: AlertTriangle },
  { id: 'output', label: 'Output', icon: ScrollText },
];

/** Longest run of lines kept in the output tab. */
const MAX_LOG_LINES = 500;

export const BottomPanel: React.FC = () => {
  const { bottomPanelTab, setBottomPanelTab, setBottomPanelVisible } = useLayoutStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const tabs = useEditorStore((s) => s.tabs);

  const [log, setLog] = useState<string[]>([]);
  const seenWorkspace = useRef<string | null>(null);
  const seenDirty = useRef(0);

  const unsavedCount = tabs.filter((t) => t.isDirty).length;

  const append = (line: string) =>
    setLog((prev) => [...prev.slice(-(MAX_LOG_LINES - 1)), line]);

  // The output tab records real state changes rather than sitting empty.
  useEffect(() => {
    if (workspace && workspace.name !== seenWorkspace.current) {
      seenWorkspace.current = workspace.name;
      append(`Workspace opened: ${workspace.path}`);
    }
    if (unsavedCount !== seenDirty.current) {
      const delta = unsavedCount - seenDirty.current;
      seenDirty.current = unsavedCount;
      if (delta !== 0) {
        // More dirty files means edits were made, not saved; only reaching zero
        // means a save actually happened.
        const verb = delta > 0 ? 'Edited' : 'Saved';
        append(`${verb}: ${unsavedCount} file(s) with unsaved changes`);
      }
    }
    // `append` is stable enough for this effect's purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.path, unsavedCount]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-panel)' }}>
      <div
        className="flex items-center gap-1 px-2 h-8 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = bottomPanelTab === id;
          const badge = id === 'problems' && unsavedCount > 0 ? unsavedCount : 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setBottomPanelTab(id)}
              className="flex items-center gap-1.5 px-2 h-7 text-[12px] relative"
              style={{ color: isActive ? 'var(--color-text-strong)' : 'var(--color-text-muted)' }}
            >
              <Icon size={13} />
              {label}
              {badge > 0 && (
                <span
                  className="ml-0.5 px-1 rounded-full text-[10px]"
                  style={{ background: 'var(--color-elevated)', color: 'var(--color-text-muted)' }}
                >
                  {badge}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-1 right-1 -bottom-px h-px"
                  style={{ background: 'var(--color-text-strong)' }}
                />
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        {bottomPanelTab === 'output' && log.length > 0 && (
          <button
            type="button"
            className="ide-icon-button"
            title="Clear output"
            aria-label="Clear output"
            onClick={() => setLog([])}
          >
            <Trash2 size={13} />
          </button>
        )}
        <button
          type="button"
          className="ide-icon-button"
          title="Close panel (Ctrl+`)"
          aria-label="Close panel"
          onClick={() => setBottomPanelVisible(false)}
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {bottomPanelTab === 'terminal' &&
          (workspace ? (
            <TerminalPanel cwd={workspace.path} />
          ) : (
            <p className="p-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
              Open a folder to start a terminal.
            </p>
          ))}

        {bottomPanelTab === 'problems' && (
          <div className="h-full overflow-y-auto ide-scroll">
            {unsavedCount === 0 ? (
              <p className="p-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
                No problems detected.
              </p>
            ) : (
              <ul>
                {tabs
                  .filter((t) => t.isDirty)
                  .map((tab) => (
                    <li
                      key={tab.path}
                      className="px-3 py-1 text-[12px] flex items-center gap-2"
                    >
                      <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                      <span className="truncate">{tab.name}</span>
                      <span style={{ color: 'var(--color-text-subtle)' }}>unsaved</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {bottomPanelTab === 'output' && (
          <pre
            data-selectable
            className="h-full overflow-auto ide-scroll p-2 text-[11px] font-mono whitespace-pre-wrap"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {log.length > 0 ? log.join('\n') : 'No output yet.'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default BottomPanel;
