import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';

import type { AppConfig } from './config';
import {
  asyncHandler,
  errorHandler,
  notFound,
  notFoundHandler
} from './http/errors';
import {
  parseClampedInt,
  parseId,
  parseLatLon,
  parseRouteIdList,
  parseSearchQuery
} from './http/validation';
import type { GtfsFetcherService } from './services/gtfsFetcher.service';

/** החלק של ה-fetcher שה-API תלוי בו (מאפשר להזריק מימוש מדומה בטסטים) */
export type ApiFetcher = Pick<
  GtfsFetcherService,
  | 'getStatus'
  | 'getProviders'
  | 'getRouteSummaries'
  | 'getRouteDetails'
  | 'getStops'
  | 'getStop'
  | 'getNearbyStops'
  | 'getArrivalsForStop'
  | 'refreshStop'
  | 'getVehicles'
  | 'getVehicle'
  | 'getUpcomingForVehicle'
  | 'search'
>;

export function createApp(
  fetcher: ApiFetcher,
  config: Pick<AppConfig, 'corsOrigin'>,
  now: () => number = Date.now
): Express {
  const app = express();
  const startedAt = now();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.corsOrigin.includes('*') ? '*' : config.corsOrigin,
      methods: ['GET', 'HEAD', 'OPTIONS'],
      maxAge: 600
    })
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round((now() - startedAt) / 1000),
      ...fetcher.getStatus(),
      providers: fetcher.getProviders()
    });
  });

  app.get('/api/routes', (_req, res) => {
    res.json(fetcher.getRouteSummaries());
  });

  app.get('/api/routes/:id', (req, res) => {
    const id = parseId('id', req.params.id);
    const details = fetcher.getRouteDetails(id);
    if (!details) throw notFound('הקו לא נמצא');
    res.json(details);
  });

  app.get('/api/stops', (_req, res) => {
    res.json(fetcher.getStops());
  });

  /** חייב להופיע לפני /api/stops/:id/... */
  app.get(
    '/api/stops/nearby',
    asyncHandler(async (req, res) => {
      const { lat, lon } = parseLatLon(req.query);
      const radius = parseClampedInt('radius', req.query.radius, { min: 100, max: 2000, fallback: 500 });
      const limit = parseClampedInt('limit', req.query.limit, { min: 1, max: 15, fallback: 8 });
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
    })
  );

  app.get(
    '/api/stops/:id/arrivals',
    asyncHandler(async (req, res) => {
      const id = parseId('id', req.params.id);
      const stop = fetcher.getStop(id);
      if (!stop) throw notFound('התחנה לא נמצאה');
      await fetcher.refreshStop(stop.id).catch((error: unknown) => {
        console.warn('[server] רענון SIRI נכשל:', error instanceof Error ? error.message : error);
      });
      res.json({ stop, arrivals: fetcher.getArrivalsForStop(stop.id), serverTime: Date.now() });
    })
  );

  app.get('/api/vehicles', (req, res) => {
    res.json(fetcher.getVehicles(parseRouteIdList(req.query.routes)));
  });

  app.get('/api/vehicles/:id/upcoming', (req, res) => {
    const id = parseId('id', req.params.id);
    const vehicle = fetcher.getVehicle(id);
    if (!vehicle) throw notFound('הרכב לא נמצא');
    res.json({ vehicle, upcoming: fetcher.getUpcomingForVehicle(id), serverTime: Date.now() });
  });

  app.get('/api/search', (req, res) => {
    res.json(fetcher.search(parseSearchQuery(req.query.q)));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
