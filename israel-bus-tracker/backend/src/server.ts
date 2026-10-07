import http from 'http';

import { createApp } from './app';
import { config } from './config';
import { GtfsFetcherService } from './services/gtfsFetcher.service';
import { WebSocketService } from './services/websocket.service';

async function main(): Promise<void> {
  const fetcher = new GtfsFetcherService(config);
  const app = createApp(fetcher, config);
  const server = http.createServer(app);

  const webSocketService = new WebSocketService(server, fetcher, config.corsOrigin);

  await fetcher.start();

  server.listen(config.port, () => {
    console.log(`[server] רץ על פורט ${config.port} (מצב: ${config.demoMode ? 'הדגמה' : 'חי'})`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] מקבל ${signal}, סוגר...`);
    fetcher.stop();
    await webSocketService.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[server] כשל באתחול', error);
  process.exit(1);
});
