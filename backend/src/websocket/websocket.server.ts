import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleTerminalMessage, cleanupTerminals } from './terminal.socket';

export class WSServer {
  private wss: WebSocketServer;

  private static instance: WSServer;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.init();
    WSServer.instance = this;
  }

  static getInstance(): WSServer {
    return WSServer.instance;
  }

  private init(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WS] Client connected');

      ws.on('message', (raw: Buffer) => {
        try {
          const message = JSON.parse(raw.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' },
          }));
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
      });

      ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    if (message.type?.startsWith('terminal:')) {
      handleTerminalMessage(ws, message);
    }
  }

  broadcast(type: string, data: any): void {
    const msg = JSON.stringify({ type, data });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  cleanup(): void {
    cleanupTerminals();
    this.wss.close();
  }
}
