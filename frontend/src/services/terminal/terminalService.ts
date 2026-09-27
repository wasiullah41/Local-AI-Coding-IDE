import { WS_EVENTS } from '@local-ide/shared';

interface TerminalSession {
  sessionId: string;
  name: string;
  cwd: string;
}

class TerminalClient {
  private socket: WebSocket | null = null;
  private onDataCallback: ((sessionId: string, data: string) => void) | null = null;
  private onCreateCallback: ((session: TerminalSession) => void) | null = null;

  connect() {
    this.socket = new WebSocket('ws://localhost:3001/ws');
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === WS_EVENTS.TERMINAL_OUTPUT && this.onDataCallback) {
        this.onDataCallback(message.data.sessionId, message.data.data);
      } else if (message.type === WS_EVENTS.TERMINAL_CREATE && this.onCreateCallback) {
        this.onCreateCallback(message.data);
      }
    };
  }

  setOnData(callback: (sessionId: string, data: string) => void) {
    this.onDataCallback = callback;
  }

  setOnCreate(callback: (session: TerminalSession) => void) {
    this.onCreateCallback = callback;
  }

  createTerminal(name: string, cwd: string) {
    this.socket?.send(JSON.stringify({
      type: WS_EVENTS.TERMINAL_CREATE,
      data: { name, cwd }
    }));
  }

  sendInput(sessionId: string, data: string) {
    this.socket?.send(JSON.stringify({
      type: WS_EVENTS.TERMINAL_INPUT,
      data: { sessionId, data }
    }));
  }
}

export const terminalClient = new TerminalClient();
