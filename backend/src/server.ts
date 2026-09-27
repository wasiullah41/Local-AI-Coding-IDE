import http from 'http';
import app from './app';
import { WSServer } from './websocket/websocket.server';
import { env } from './config/env';
import { getDatabase } from './database/database';
import { settingsService } from './services/settings/settings.service';
import { extensionManager } from './services/extensions/extensionManager';

async function start(): Promise<void> {
  // Initialize database
  getDatabase();

  // Load settings
  await settingsService.load();

  // Initialize extensions
  await extensionManager.init();

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server
  const wsServer = new WSServer(server);

  // Start listening
  server.listen(env.port, env.host, () => {
    console.log(`[Server] Local IDE Backend running at http://${env.host}:${env.port}`);
    console.log(`[Server] WebSocket available at ws://${env.host}:${env.port}/ws`);
    console.log(`[Server] Environment: ${env.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Server] Shutting down...');
    wsServer.cleanup();
    server.close(() => {
      console.log('[Server] Closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
