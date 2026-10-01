/**
 * The single WebSocket connection to the backend.
 *
 * Terminal I/O and agent events used to open two sockets with two hardcoded
 * ports. Both now share this one connection: it multiplexes by message type,
 * reconnects with backoff, and reports connection state to the UI.
 */

export const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST ?? '127.0.0.1';
export const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT ?? '3001';
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? `http://${BACKEND_HOST}:${BACKEND_PORT}/api`;

export function websocketUrl(): string {
  // A file:// document means we are in the packaged app, where window.location
  // has no useful hostname. Fall back to the configured backend.
  const host = window.location.protocol === 'http:' ? window.location.hostname : BACKEND_HOST;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${host}:${BACKEND_PORT}/ws`;
}

type Listener = (type: string, data: Record<string, unknown>) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;

const RECONNECT_BASE_MS = 600;
const RECONNECT_MAX_MS = 8000;

/**
 * Upper bound on messages held while the socket is still opening. A terminal
 * keystroke storm before the socket is ready must not grow without limit, but
 * a handful of control messages (create a PTY, submit a task) must survive.
 */
const MAX_QUEUED_MESSAGES = 200;

class IDEWebSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private closedByUs = false;
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private queue: string[] = [];

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.closedByUs = false;
    this.setStatus('connecting');

    try {
      this.socket = new WebSocket(websocketUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.flushQueue();
    };

    this.socket.onmessage = (event) => {
      let parsed: { type?: string; data?: Record<string, unknown> };
      try {
        parsed = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (!parsed?.type) return;

      const data = parsed.data ?? {};
      for (const listener of this.listeners) {
        try {
          listener(parsed.type, data);
        } catch (error) {
          // One bad subscriber must not take down the socket for the others.
          console.error('[ws] listener failed', error);
        }
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      this.setStatus('disconnected');
      if (!this.closedByUs) this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      // `onclose` always follows, which is where reconnection is handled.
    };
  }

  disconnect(): void {
    this.closedByUs = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    // An explicit disconnect ends the session, so queued work must not
    // resurface in a later connection.
    this.queue = [];
    this.socket?.close();
    this.socket = null;
    this.setStatus('disconnected');
  }

  /**
   * Sends a message, or queues it if the socket is still opening.
   *
   * Callers legitimately send as soon as a panel mounts, which can happen
   * before the socket finishes connecting. Dropping those messages silently
   * left the integrated terminal with no PTY at all: `terminal:create` was
   * discarded and nothing ever retried it. The same applied to submitting an
   * agent task. Returns true once the message is either written or queued.
   */
  send(type: string, data: Record<string, unknown>): boolean {
    const payload = JSON.stringify({ type, data });

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
      return true;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      if (this.queue.length < MAX_QUEUED_MESSAGES) this.queue.push(payload);
      return true;
    }

    // Not connected and not opening (fresh start or mid-reconnect): hold the
    // message so a subsequent connect() still delivers it.
    if (this.queue.length < MAX_QUEUED_MESSAGES) this.queue.push(payload);
    return true;
  }

  private flushQueue() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const pending = this.queue;
    this.queue = [];
    for (const payload of pending) {
      try {
        this.socket.send(payload);
      } catch (error) {
        console.error('[ws] failed to flush queued message', error);
      }
    }
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  getStatus() {
    return this.status;
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || this.closedByUs) return;
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export const ideSocket = new IDEWebSocket();
