import http from 'http';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { config } from './config';
import { GtfsFetcherService } from './services/gtfsFetcher.service';
import { WebSocketService } from './services/websocket.service';

async function main(): Promise<void> {
  const app = express();
  const server = http.createServer(app);
  const fetcher = new GtfsFetcherService(config);

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.corsOrigin.includes('*') ? '*' : config.corsOrigin
    })
  );
  app.use(express.json());

  const startedAt = Date.now();

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      ...fetcher.getStatus()
    });
  });

  app.get('/api/routes', (_req: Request, res: Response) => {
    res.json(fetcher.getRouteSummaries());
  });

  app.get('/api/routes/:id', (req: Request, res: Response) => {
    const details = fetcher.getRouteDetails(req.params.id);
    if (!details) {
      res.status(404).json({ error: 'הקו לא נמצא' });
      return;
    }
    res.json(details);
  });

  app.get('/api/stops', (_req: Request, res: Response) => {
    res.json(fetcher.getStops());
  });

  /** תחנות קרובות + הגעות צפויות (לאפליקציית המובייל). חייב להופיע לפני /api/stops/:id/... */
  app.get('/api/stops/nearby', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        res.status(400).json({ error: 'חסרים פרמטרים lat ו-lon' });
        return;
      }
      const radius = Math.min(2000, Math.max(100, Number(req.query.radius) || 500));
      const limit = Math.min(15, Math.max(1, Number(req.query.limit) || 8));
      const nearby = fetcher.getNearbyStops(lat, lon, radius, limit);
      await Promise.allSettled(nearby.map(({ stop }) => fetcher.refreshStop(stop.id)));
      res.json({
        stops: nearby.map(({ stop, distanceM }) => ({
          stop,
          distanceM,
          arrivals: fetcher.getArrivalsForStop(stop.id, 6)
        })),
        serverTime: Date.now()
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stops/:id/arrivals', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stop = fetcher.getStop(req.params.id);
      if (!stop) {
        res.status(404).json({ error: 'התחנה לא נמצאה' });
        return;
      }
      await fetcher.refreshStop(stop.id).catch((error) => {
        console.warn('[server] רענון SIRI נכשל:', error instanceof Error ? error.message : error);
      });
      res.json({ stop, arrivals: fetcher.getArrivalsForStop(req.params.id), serverTime: Date.now() });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/vehicles', (req: Request, res: Response) => {
    const routesParam = typeof req.query.routes === 'string' ? req.query.routes : '';
    const routeIds = routesParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    res.json(fetcher.getVehicles(routeIds));
  });

  app.get('/api/vehicles/:id/upcoming', (req: Request, res: Response) => {
    const vehicle = fetcher.getVehicle(req.params.id);
    if (!vehicle) {
      res.status(404).json({ error: 'הרכב לא נמצא' });
      return;
    }
    res.json({
      vehicle,
      upcoming: fetcher.getUpcomingForVehicle(req.params.id),
      serverTime: Date.now()
    });
  });

  app.get('/api/search', (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    res.json(fetcher.search(query));
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'נתיב לא קיים' });
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] שגיאה לא צפויה:', error);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  });

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
