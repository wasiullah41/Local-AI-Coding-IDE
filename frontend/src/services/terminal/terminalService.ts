import { WS_EVENTS } from '@local-ide/shared';
import { ideSocket } from '../api/ideWebSocket';

export interface TerminalSession {
  sessionId: string;
  name: string;
  cwd: string;
  shell?: string;
}

export interface TerminalExit {
  sessionId: string;
  exitCode: number;
}

export interface TerminalError {
  message: string;
  sessionId?: string;
}

/** Shape the backend may send for a terminal session. */
interface RawTerminalSession {
  id?: string;
  sessionId?: string;
  name?: string;
  cwd?: string;
  shell?: string;
}

/**
 * The session record uses `id`, while terminal output/exit use `sessionId`.
 * Normalising here keeps one identifier for the lifetime of the session
 * instead of letting `undefined` silently become the xterm map key.
 */
function normalizeSession(raw: unknown): TerminalSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as RawTerminalSession;
  const sessionId = value.sessionId ?? value.id;
  if (typeof sessionId !== 'string' || sessionId.length === 0) return null;
  return {
    sessionId,
    name: value.name ?? 'Terminal',
    cwd: value.cwd ?? '',
    shell: value.shell,
  };
}

export interface TerminalClientHandlers {
  onCreate?: (session: TerminalSession) => void;
  onData?: (sessionId: string, chunk: string) => void;
  onExit?: (exit: TerminalExit) => void;
  onError?: (error: TerminalError) => void;
}

class TerminalClient {
  private handlers: TerminalClientHandlers = {};
  private subscribed = false;

  connect(): void {
    if (this.subscribed) return;
    this.subscribed = true;

    ideSocket.on((type, data) => {
      switch (type) {
        case WS_EVENTS.TERMINAL_CREATE: {
          const session = normalizeSession(data);
          if (session) {
            this.handlers.onCreate?.(session);
          } else {
            this.handlers.onError?.({
              message: 'The backend created a terminal session with an unusable identifier.',
            });
          }
          break;
        }
        case WS_EVENTS.TERMINAL_OUTPUT:
          this.handlers.onData?.(
            String(data.sessionId ?? ''),
            typeof data.data === 'string' ? data.data : ''
          );
          break;
        case WS_EVENTS.TERMINAL_EXIT:
          this.handlers.onExit?.({
            sessionId: String(data.sessionId ?? ''),
            exitCode: Number(data.exitCode ?? 0),
          });
          break;
        case WS_EVENTS.ERROR:
          this.handlers.onError?.({
            message:
              typeof data.message === 'string' ? data.message : 'The terminal reported an error.',
            sessionId: data.sessionId ? String(data.sessionId) : undefined,
          });
          break;
      }
    });

    ideSocket.connect();
  }

  setHandlers(handlers: TerminalClientHandlers): void {
    this.handlers = handlers;
  }

  createTerminal(name: string, cwd: string, shell?: string): boolean {
    return ideSocket.send(WS_EVENTS.TERMINAL_CREATE, { name, cwd, shell });
  }

  sendInput(sessionId: string, data: string): boolean {
    return ideSocket.send(WS_EVENTS.TERMINAL_INPUT, { sessionId, data });
  }

  /** Keeps the PTY in step with the visible column/row count. */
  resize(sessionId: string, cols: number, rows: number): boolean {
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) return false;
    return ideSocket.send(WS_EVENTS.TERMINAL_RESIZE, { sessionId, cols, rows });
  }

  close(sessionId: string): boolean {
    return ideSocket.send(WS_EVENTS.TERMINAL_CLOSE, { sessionId });
  }
}

export const terminalClient = new TerminalClient();
