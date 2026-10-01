import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Plus, X, Trash2 } from 'lucide-react';
import { terminalClient, type TerminalSession } from '../../services/terminal/terminalService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useSettingsStore } from '../../stores/settingsStore';

const readCssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const terminalTheme = () => ({
  background: readCssVar('--color-terminal-background', '#111827'),
  foreground: readCssVar('--color-terminal-foreground', '#d1d5db'),
  cursor: readCssVar('--color-text-strong', '#e5e7eb'),
  selectionBackground: readCssVar('--color-accent-muted', 'rgba(56,139,253,0.35)'),
});

/** Drops a key without tripping the unused-destructure lint rule. */
const omitKey = <T,>(record: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...record };
  delete next[key];
  return next;
};

export const TerminalPanel: React.FC<{ cwd: string }> = ({ cwd }) => {
  const setWorkspaceError = useWorkspaceStore((s) => s.setError);
  const { settings } = useSettingsStore();

  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [exited, setExited] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  // xterm instances keyed by session. Each gets its own host element so only
  // the active session is visible and focusable.
  const terminals = useRef(
    new Map<string, { term: Terminal; fit: FitAddon; host: HTMLDivElement }>()
  );
  const activeIdRef = useRef<string | null>(null);
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const attachSession = useCallback((session: TerminalSession) => {
    if (terminals.current.has(session.sessionId)) return;
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: terminalTheme(),
      fontFamily: settings.editor.fontFamily,
      fontSize: Math.max(10, settings.editor.fontSize - 1),
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 10_000,
      convertEol: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);

    // The container has no React-managed children, so appending is safe.
    const host = document.createElement('div');
    host.style.width = '100%';
    host.style.height = '100%';
    containerRef.current.appendChild(host);
    term.open(host);

    // Keystrokes must go to the session they were typed into, not whichever is
    // currently selected.
    term.onData((data) => {
      terminalClient.sendInput(session.sessionId, data);
    });

    terminals.current.set(session.sessionId, { term, fit, host });

    setSessions((prev) =>
      prev.some((s) => s.sessionId === session.sessionId) ? prev : [...prev, session]
    );
    setActiveId(session.sessionId);
    setExited((prev) => omitKey(prev, session.sessionId));

    // Fit after the DOM has the new size.
    requestAnimationFrame(() => {
      try {
        fit.fit();
        terminalClient.resize(session.sessionId, term.cols, term.rows);
      } catch {
        // The panel can be zero-sized while hidden; the observer will retry.
      }
    });
  }, [settings.editor.fontFamily, settings.editor.fontSize]);

  const createSession = useCallback(
    (name?: string) => {
      terminalClient.createTerminal(name ?? `Terminal ${sessions.length + 1}`, cwdRef.current);
    },
    [sessions.length]
  );

  const closeSession = useCallback((sessionId: string) => {
    const entry = terminals.current.get(sessionId);
    entry?.host.remove();
    entry?.term.dispose();
    terminals.current.delete(sessionId);
    terminalClient.close(sessionId);

    setSessions((prev) => {
      const remaining = prev.filter((s) => s.sessionId !== sessionId);
      setActiveId((current) =>
        current === sessionId ? (remaining[remaining.length - 1]?.sessionId ?? null) : current
      );
      return remaining;
    });
    setExited((prev) => omitKey(prev, sessionId));
  }, []);

  // One shared subscription for the panel's lifetime.
  useEffect(() => {
    terminalClient.setHandlers({
      onCreate: attachSession,
      onData: (sessionId, chunk) => {
        terminals.current.get(sessionId)?.term.write(chunk);
      },
      onExit: ({ sessionId, exitCode }) => {
        terminals.current.get(sessionId)?.term.write(
          `\r\n\x1b[2m[process exited with code ${exitCode}]\x1b[0m\r\n`
        );
        setExited((prev) => ({ ...prev, [sessionId]: exitCode }));
      },
      onError: ({ message }) => setWorkspaceError(message),
    });

    terminalClient.connect();
    if (sessions.length === 0) createSession();

    return () => {
      terminalClient.setHandlers({});
    };
    // Intentionally runs once: sessions are managed after this point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show only the selected session, then size and focus it. Fitting has to wait
  // until the host is visible, otherwise xterm measures a zero-width element.
  useEffect(() => {
    for (const [sessionId, entry] of terminals.current) {
      const isActive = sessionId === activeId;
      entry.host.style.display = isActive ? 'block' : 'none';
    }

    const active = activeId ? terminals.current.get(activeId) : undefined;
    if (!active) return;

    const focusTimer = window.setTimeout(() => {
      try {
        active.fit.fit();
        terminalClient.resize(activeId as string, active.term.cols, active.term.rows);
        active.term.focus();
      } catch {
        // The panel may be collapsed, leaving nothing to measure.
      }
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [activeId, sessions.length]);

  // Keep the PTY sized to the panel, including while the user drags the divider.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const entry = terminals.current.get(activeIdRef.current ?? '');
      if (!entry) return;
      try {
        entry.fit.fit();
        if (activeIdRef.current) {
          terminalClient.resize(activeIdRef.current, entry.term.cols, entry.term.rows);
        }
      } catch {
        // Ignore transient zero-size measurements.
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Re-theme when the app theme changes.
  useEffect(() => {
    for (const { term } of terminals.current.values()) {
      term.options.theme = terminalTheme();
    }
  }, [settings.appearance.theme]);

  // Release every PTY when the panel goes away.
  useEffect(
    () => () => {
      for (const [sessionId, entry] of terminals.current.entries()) {
        terminalClient.close(sessionId);
        entry.host.remove();
        entry.term.dispose();
      }
      terminals.current.clear();
    },
    []
  );

  const activeExited = activeId !== null ? exited[activeId] : undefined;
  const title = useMemo(() => sessions.length, [sessions.length]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {title > 1 && (
        <div
          className="flex items-center gap-1 px-2 h-7 shrink-0 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-tabs)' }}
        >
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              type="button"
              onClick={() => setActiveId(session.sessionId)}
              className="flex items-center gap-1 px-2 h-5 rounded text-[11px]"
              style={{
                background:
                  session.sessionId === activeId ? 'var(--color-active)' : 'transparent',
                color:
                  session.sessionId === activeId
                    ? 'var(--color-text-strong)'
                    : 'var(--color-text-muted)',
              }}
            >
              {session.name}
              {exited[session.sessionId] !== undefined && (
                <span title={`Exited with code ${exited[session.sessionId]}`} aria-label="exited">
                  •
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="flex-1 min-h-0 px-1 py-1" data-selectable />

      {activeExited !== undefined && (
        <div
          className="absolute bottom-2 right-3 flex items-center gap-2 px-2 py-1 rounded text-[11px]"
          style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Exited ({activeExited})</span>
          <button
            type="button"
            className="ide-button ide-button--secondary"
            style={{ height: 20, padding: '0 8px' }}
            onClick={() => {
              if (activeId) closeSession(activeId);
              createSession('Terminal');
            }}
          >
            <Trash2 size={11} /> New
          </button>
        </div>
      )}

      {/* A control that always exists, even with a single session. */}
      <div className="absolute top-1 right-2 flex gap-1" style={{ zIndex: 5 }}>
        <button
          type="button"
          className="ide-icon-button"
          title="New terminal"
          aria-label="New terminal"
          onClick={() => createSession()}
        >
          <Plus size={13} />
        </button>
        {activeId && (
          <button
            type="button"
            className="ide-icon-button"
            title="Kill terminal"
            aria-label="Kill terminal"
            onClick={() => closeSession(activeId)}
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;
