import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Minimal WebSocket double. The real bug was that a message sent while the
 * socket was still CONNECTING was dropped, so `terminal:create` never reached
 * the backend and the integrated terminal came up blank forever.
 */
class FakeSocket {
  // The client compares readyState against these static constants, so the
  // double has to provide them or every guard reads `undefined`.
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

type SocketClient = {
  connect(): void;
  disconnect(): void;
  send(type: string, data: Record<string, unknown>): boolean;
  on(listener: (type: string, data: Record<string, unknown>) => void): () => void;
  onStatus(listener: (status: 'connecting' | 'connected' | 'disconnected') => void): () => void;
  getStatus(): string;
};

describe('ideWebSocket', () => {
  let mod: typeof import('../../services/api/ideWebSocket');
  let ideSocket: SocketClient;

  beforeEach(async () => {
    FakeSocket.instances = [];
    vi.resetModules();
    vi.stubGlobal('WebSocket', FakeSocket as unknown as typeof WebSocket);
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: '127.0.0.1' },
      configurable: true,
    });
    mod = await import('../../services/api/ideWebSocket');
    ideSocket = mod.ideSocket;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queues a message sent while connecting and flushes it on open', () => {
    ideSocket.connect();
    const socket = FakeSocket.instances[0];
    expect(socket.readyState).toBe(0);

    // The terminal panel does exactly this: connect, then immediately create.
    const accepted = ideSocket.send('terminal:create', { name: 'Terminal 1' });
    expect(accepted).toBe(true);
    expect(socket.sent).toHaveLength(0);

    socket.open();

    expect(socket.sent).toHaveLength(1);
    const message = JSON.parse(socket.sent[0]);
    expect(message.type).toBe('terminal:create');
    expect(message.data.name).toBe('Terminal 1');
  });

  it('sends immediately when the socket is already open', () => {
    ideSocket.connect();
    FakeSocket.instances[0].open();

    ideSocket.send('terminal:input', { sessionId: 's1', data: 'ls\r' });

    const socket = FakeSocket.instances[0];
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0]).type).toBe('terminal:input');
  });

  it('preserves message order across the queue flush', () => {
    ideSocket.connect();
    const socket = FakeSocket.instances[0];
    ideSocket.send('terminal:create', { name: 'a' });
    ideSocket.send('terminal:input', { sessionId: 's1', data: '1' });
    ideSocket.send('terminal:input', { sessionId: 's1', data: '2' });
    socket.open();

    expect(socket.sent.map((m) => JSON.parse(m).data.data ?? JSON.parse(m).data.name)).toEqual([
      'a',
      '1',
      '2',
    ]);
  });

  it('reports connection status transitions to subscribers', () => {
    const seen: string[] = [];
    ideSocket.onStatus((s) => seen.push(s));

    ideSocket.connect();
    FakeSocket.instances[0].open();

    expect(seen).toContain('connecting');
    expect(seen).toContain('connected');
    expect(ideSocket.getStatus()).toBe('connected');
  });

  it('delivers inbound messages to subscribers', () => {
    const received: { type: string; data: unknown }[] = [];
    ideSocket.on((type, data) => received.push({ type, data }));
    ideSocket.connect();
    const socket = FakeSocket.instances[0];
    socket.open();

    socket.onmessage?.({
      data: JSON.stringify({ type: 'terminal:output', data: { sessionId: 's1', data: 'hi' } }),
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('terminal:output');
  });
});
