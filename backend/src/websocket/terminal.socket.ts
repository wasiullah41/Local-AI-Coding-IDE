import { WebSocket } from 'ws';
import { terminalService } from '../services/terminal/terminal.service';
import { WS_EVENTS } from './events';

// node-pty types
interface IPty {
  pid: number;
  cols: number;
  rows: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData: (callback: (data: string) => void) => { dispose: () => void };
  onExit: (callback: (e: { exitCode: number; signal?: number }) => void) => { dispose: () => void };
}

let pty: any;
try {
  pty = require('node-pty');
} catch {
  console.warn('node-pty not available. Terminal functionality will be limited.');
}

const terminals: Map<string, IPty> = new Map();

export function handleTerminalMessage(ws: WebSocket, message: any): void {
  const { type, data } = message;

  switch (type) {
    case WS_EVENTS.TERMINAL_CREATE:
      createTerminal(ws, data);
      break;
    case WS_EVENTS.TERMINAL_INPUT:
      writeToTerminal(data.sessionId, data.data);
      break;
    case WS_EVENTS.TERMINAL_RESIZE:
      resizeTerminal(data.sessionId, data.cols, data.rows);
      break;
    case WS_EVENTS.TERMINAL_CLOSE:
      closeTerminal(ws, data.sessionId);
      break;
  }
}

function createTerminal(ws: WebSocket, data: { shell?: string; cwd?: string; name?: string }): void {
  if (!pty) {
    ws.send(JSON.stringify({
      type: WS_EVENTS.ERROR,
      data: { message: 'Terminal not available: node-pty not installed' },
    }));
    return;
  }

  const shell = data.shell || terminalService.getDefaultShell();
  const cwd = data.cwd || process.cwd();

  const session = terminalService.createSession(shell, cwd, data.name);

  try {
    const term: IPty = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd,
      env: process.env as Record<string, string>,
    });

    terminals.set(session.id, term);
    terminalService.updateSession(session.id, { pid: term.pid });

    term.onData((output: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: WS_EVENTS.TERMINAL_OUTPUT,
          data: {
            sessionId: session.id,
            data: output,
            timestamp: new Date().toISOString(),
          },
        }));
      }
    });

    term.onExit(({ exitCode }: { exitCode: number }) => {
      terminalService.updateSession(session.id, {
        status: 'exited',
        exitCode,
      });
      terminals.delete(session.id);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: WS_EVENTS.TERMINAL_EXIT,
          data: { sessionId: session.id, exitCode },
        }));
      }
    });

    ws.send(JSON.stringify({
      type: WS_EVENTS.TERMINAL_CREATE,
      data: session,
    }));
  } catch (err: any) {
    terminalService.removeSession(session.id);
    ws.send(JSON.stringify({
      type: WS_EVENTS.ERROR,
      data: { message: `Failed to create terminal: ${err.message}` },
    }));
  }
}

function writeToTerminal(sessionId: string, data: string): void {
  const term = terminals.get(sessionId);
  if (term) {
    term.write(data);
  }
}

function resizeTerminal(sessionId: string, cols: number, rows: number): void {
  const term = terminals.get(sessionId);
  if (term) {
    term.resize(cols, rows);
  }
}

function closeTerminal(ws: WebSocket, sessionId: string): void {
  const term = terminals.get(sessionId);
  if (term) {
    term.kill();
    terminals.delete(sessionId);
    terminalService.removeSession(sessionId);
  }
}

export function cleanupTerminals(): void {
  for (const [id, term] of terminals) {
    try {
      term.kill();
    } catch {
      // Ignore
    }
    terminalService.removeSession(id);
  }
  terminals.clear();
}
