import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WS_EVENTS } from '@local-ide/shared';

type Handler = (type: string, data: Record<string, unknown>) => void;

class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeSocket[] = [];
  readyState = FakeSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close() {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  send(payload: string) {
    this.sent.push(payload);
  }
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
}

type TerminalClientLike = {
  connect(): void;
  setHandlers(handlers: import('../../services/terminal/terminalService').TerminalClientHandlers): void;
  createTerminal(name: string, cwd: string, shell?: string): boolean;
  sendInput(sessionId: string, data: string): boolean;
};

describe('terminalService', () => {
  let terminalClient: TerminalClientLike;
  let deliver: Handler;

  beforeEach(async () => {
    FakeSocket.instances = [];
    vi.resetModules();
    vi.stubGlobal('WebSocket', FakeSocket as unknown as typeof WebSocket);
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: '127.0.0.1' },
      configurable: true,
    });
    const mod = await import('../../services/terminal/terminalService');
    terminalClient = mod.terminalClient;
    // The client registers with the shared socket on connect(); capture that
    // subscription so tests can push server messages in.
    const socketMod = await import('../../services/api/ideWebSocket');
    const listeners = (socketMod.ideSocket as unknown as { listeners: Set<Handler> }).listeners;
    terminalClient.connect();
    deliver = (type, data) => {
      for (const listener of listeners) listener(type, data);
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a create payload keyed by id, as the backend sends it', () => {
    const created: { sessionId: string; name: string; cwd: string }[] = [];
    terminalClient.setHandlers({ onCreate: (s) => created.push(s) });

    deliver(WS_EVENTS.TERMINAL_CREATE, {
      id: 'sess-1',
      name: 'Terminal 1',
      shell: 'C:\\Windows\\system32\\cmd.exe',
      cwd: 'C:\\work',
      status: 'running',
    });

    expect(created).toHaveLength(1);
    // The regression: this used to be `undefined`, keying the xterm host map
    // under `undefined` so every TERMINAL_OUTPUT lookup missed.
    expect(created[0].sessionId).toBe('sess-1');
    expect(created[0].cwd).toBe('C:\\work');
  });

  it('prefers sessionId when both are present', () => {
    const created: { sessionId: string }[] = [];
    terminalClient.setHandlers({ onCreate: (s) => created.push(s) });

    deliver(WS_EVENTS.TERMINAL_CREATE, { id: 'from-id', sessionId: 'from-session-id' });

    expect(created[0].sessionId).toBe('from-session-id');
  });

  it('reports an error instead of creating a session with no identifier', () => {
    const created: unknown[] = [];
    const errors: { message: string }[] = [];
    terminalClient.setHandlers({ onCreate: (s) => created.push(s), onError: (e) => errors.push(e) });

    deliver(WS_EVENTS.TERMINAL_CREATE, { name: 'Terminal 1' });

    expect(created).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/unusable identifier/i);
  });

  it('delivers output using the same identifier the create used', () => {
    const created: { sessionId: string }[] = [];
    const output: { sessionId: string; chunk: string }[] = [];
    terminalClient.setHandlers({
      onCreate: (s) => created.push(s),
      onData: (sessionId, chunk) => output.push({ sessionId, chunk }),
    });

    deliver(WS_EVENTS.TERMINAL_CREATE, { id: 'sess-9', name: 't', cwd: 'c' });
    deliver(WS_EVENTS.TERMINAL_OUTPUT, { sessionId: 'sess-9', data: 'hello' });

    expect(created[0].sessionId).toBe('sess-9');
    expect(output).toEqual([{ sessionId: 'sess-9', chunk: 'hello' }]);
  });

  it('forwards create and input over the socket with matching keys', () => {
    terminalClient.connect();
    const socket = FakeSocket.instances[0];
    socket.open();

    terminalClient.createTerminal('Terminal 1', 'C:\\work');
    terminalClient.sendInput('sess-1', 'dir\r');

    const types = socket.sent.map((m) => JSON.parse(m).type);
    expect(types).toEqual([WS_EVENTS.TERMINAL_CREATE, WS_EVENTS.TERMINAL_INPUT]);
  });
});
