import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

import type { AppConfig } from '../config';
import { buildDemoData } from '../data/demoData';
import type {
  Arrival,
  Route,
  RouteDetails,
  RouteSummary,
  SearchResults,
  ServiceStatus,
  StaticGtfsData,
  Stop,
  TripUpdate,
  UpcomingStop,
  VehiclePosition
} from '../types/gtfs';
import { colorFromString, haversine, readableTextColor } from '../utils/geo';
import { SiriService } from './siri.service';
import { BusSimulator } from './simulator.service';

interface FetcherEvents {
  vehicles: (changed: VehiclePosition[]) => void;
  removed: (ids: string[]) => void;
  status: (status: ServiceStatus) => void;
}

/** ממיר ערך מספרי של protobuf (number | Long | null) למספר רגיל */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const candidate = (value as { toNumber: () => number }).toNumber;
    if (typeof candidate === 'function') {
      return candidate.call(value);
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * שירות שמושך נתוני GTFS-RT (Protobuf) מהשרת של משרד התחבורה או משרת ביניים,
 * מפענח אותם ומחזיק Cache בזיכרון. במצב הדגמה הנתונים מגיעים מסימולטור.
 */
export class GtfsFetcherService extends EventEmitter {
  private routes = new Map<string, Route>();

  private stops = new Map<string, Stop>();

  private vehicles = new Map<string, VehiclePosition>();

  private vehicleSeenAt = new Map<string, number>();

  private tripUpdates = new Map<string, TripUpdate>();

  private timer: NodeJS.Timeout | null = null;

  private simulator: BusSimulator | null = null;

  private inFlight = false;

  private siri: SiriService | null = null;

  /** תחנות ש-SIRI נשאל עליהן לאחרונה (id -> זמן בקשה אחרון) */
  private hotStops = new Map<string, number>();

  private stopFetchedAt = new Map<string, number>();

  private status: ServiceStatus;

  constructor(private readonly config: AppConfig) {
    super();
    if (!config.demoMode && config.siriSmUrl) {
      this.siri = new SiriService(config);
    }
    this.status = {
      mode: config.demoMode ? 'demo' : 'live',
      ok: false,
      lastFetchAt: null,
      lastError: null,
      vehicleCount: 0
    };
  }

  /* ------------------------------ typed emitter ------------------------------ */

  public on<K extends keyof FetcherEvents>(event: K, listener: FetcherEvents[K]): this {
    return super.on(event, listener);
  }

  public emit<K extends keyof FetcherEvents>(
    event: K,
    ...args: Parameters<FetcherEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  /* --------------------------------- lifecycle -------------------------------- */

  public async start(): Promise<void> {
    this.loadStaticData();

    if (this.config.demoMode) {
      this.simulator = new BusSimulator([...this.routes.values()], [...this.stops.values()]);
      console.log('[fetcher] מצב הדגמה: מדמה אוטובוסים בתל אביב');
    } else {
      console.log(
        this.siri
          ? `[fetcher] מצב חי (SIRI-SM): ${this.config.siriSmUrl}`
          : `[fetcher] מצב חי: ${this.config.vehiclePositionsUrl}`
      );
    }

    await this.poll();
    this.timer = setInterval(() => {
      void this.poll();
    }, this.config.pollIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /* ------------------------------- static data -------------------------------- */

  private loadStaticData(): void {
    let data: StaticGtfsData | null = null;

    if (this.config.staticDataPath) {
      try {
        const resolved = path.resolve(process.cwd(), this.config.staticDataPath);
        const raw = fs.readFileSync(resolved, 'utf-8');
        const parsed = JSON.parse(raw) as StaticGtfsData;
        data = this.normalizeStaticData(parsed);
        console.log(
          `[fetcher] נטענו ${data.routes.length} קווים ו-${data.stops.length} תחנות מ-${resolved}`
        );
      } catch (error) {
        console.error('[fetcher] כשל בטעינת STATIC_DATA_PATH', error);
      }
    }

    if (!data && this.config.demoMode) {
      data = buildDemoData();
    }

    const finalData: StaticGtfsData = data ?? { routes: [], stops: [] };
    this.routes = new Map(finalData.routes.map((route) => [route.id, route]));
    this.stops = new Map(finalData.stops.map((stop) => [stop.id, stop]));
  }

  private normalizeStaticData(input: StaticGtfsData): StaticGtfsData {
    const routes: Route[] = (input.routes ?? []).map((route) => {
      const color = route.color || colorFromString(route.id);
      return {
        id: String(route.id),
        shortName: String(route.shortName ?? route.id),
        longName: String(route.longName ?? ''),
        agency: String(route.agency ?? ''),
        color,
        textColor: route.textColor || readableTextColor(color),
        stopIds: (route.stopIds ?? []).map(String),
        shape: route.shape ?? []
      };
    });
    const stops: Stop[] = (input.stops ?? []).map((stop) => ({
      id: String(stop.id),
      code: String(stop.code ?? stop.id),
      name: String(stop.name ?? ''),
      lat: Number(stop.lat),
      lon: Number(stop.lon)
    }));
    return { routes, stops };
  }

  /** במצב חי: קו שלא קיים בנתונים הסטטיים נוצר אוטומטית כדי שאפשר יהיה להציג אותו */
  private ensureRoute(routeId: string): Route {
    const existing = this.routes.get(routeId);
    if (existing) return existing;
    const color = colorFromString(routeId);
    const created: Route = {
      id: routeId,
      shortName: routeId,
      longName: `קו ${routeId}`,
      agency: '',
      color,
      textColor: readableTextColor(color),
      stopIds: [],
      shape: []
    };
    this.routes.set(routeId, created);
    return created;
  }

  /* ---------------------------------- polling --------------------------------- */

  private async poll(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      if (this.simulator) {
        const frame = this.simulator.step();
        this.applyFrame(frame.vehicles, frame.tripUpdates);
      } else if (this.siri) {
        await this.pollSiri();
      } else {
        const [vehicles, tripUpdates] = await this.fetchLive();
        this.applyFrame(vehicles, tripUpdates);
      }
      this.status = {
        ...this.status,
        ok: true,
        lastFetchAt: Date.now(),
        lastError: null,
        vehicleCount: this.vehicles.size
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[fetcher] שגיאה במשיכת נתונים:', message);
      this.status = { ...this.status, ok: false, lastError: message };
    } finally {
      this.inFlight = false;
      this.emit('status', this.getStatus());
    }
  }

  private buildRequestUrl(url: string): string {
    if (!this.config.apiKey || !this.config.apiKeyParam) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${encodeURIComponent(this.config.apiKeyParam)}=${encodeURIComponent(
      this.config.apiKey
    )}`;
  }

  private async downloadFeed(url: string) {
    const headers: Record<string, string> = { Accept: 'application/x-protobuf' };
    if (this.config.apiKey && this.config.apiKeyHeader) {
      headers[this.config.apiKeyHeader] = this.config.apiKey;
    }
    const response = await axios.get<ArrayBuffer>(this.buildRequestUrl(url), {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers
    });
    return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(response.data)
    );
  }

  private async fetchLive(): Promise<[VehiclePosition[], TripUpdate[]]> {
    const tripUpdates: TripUpdate[] = [];

    if (this.config.tripUpdatesUrl) {
      try {
        const feed = await this.downloadFeed(this.config.tripUpdatesUrl);
        const headerTimestamp = toNumber(feed.header?.timestamp) || Math.floor(Date.now() / 1000);
        for (const entity of feed.entity) {
          const update = entity.tripUpdate;
          if (!update || !update.trip) continue;
          const routeId = update.trip.routeId ?? '';
          const stopTimeUpdates = (update.stopTimeUpdate ?? [])
            .map((stu) => {
              const arrivalTime = toNumber(stu.arrival?.time) || toNumber(stu.departure?.time);
              return {
                stopId: stu.stopId ?? '',
                stopSequence: stu.stopSequence ?? 0,
                arrivalTime,
                delaySeconds: toNumber(stu.arrival?.delay ?? stu.departure?.delay)
              };
            })
            .filter((stu) => stu.stopId !== '' && stu.arrivalTime > 0);

          const tripId = update.trip.tripId ?? entity.id;
          const delay = update.delay ?? stopTimeUpdates[0]?.delaySeconds ?? 0;
          const route = routeId ? this.routes.get(routeId) : undefined;
          tripUpdates.push({
            tripId,
            routeId,
            vehicleId: update.vehicle?.id ?? null,
            headsign: route?.longName ?? '',
            delaySeconds: toNumber(delay),
            timestamp: toNumber(update.timestamp) || headerTimestamp,
            stopTimeUpdates
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[fetcher] כשל במשיכת TripUpdates (ממשיך בלעדיו):', message);
      }
    }

    const delayByTrip = new Map(tripUpdates.map((tu) => [tu.tripId, tu]));
    const feed = await this.downloadFeed(this.config.vehiclePositionsUrl);
    const headerTimestamp = toNumber(feed.header?.timestamp) || Math.floor(Date.now() / 1000);
    const vehicles: VehiclePosition[] = [];

    for (const entity of feed.entity) {
      const vehicle = entity.vehicle;
      if (!vehicle || !vehicle.position) continue;
      const latitude = vehicle.position.latitude;
      const longitude = vehicle.position.longitude;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const routeId = vehicle.trip?.routeId ?? '';
      const tripId = vehicle.trip?.tripId ?? '';
      const id = vehicle.vehicle?.id ?? entity.id;
      const route = routeId ? this.ensureRoute(routeId) : undefined;
      const tripUpdate = tripId ? delayByTrip.get(tripId) : undefined;
      const direction = vehicle.trip?.directionId === 1 ? 1 : 0;

      vehicles.push({
        id,
        label: vehicle.vehicle?.label || id,
        routeId,
        routeShortName: route?.shortName ?? routeId,
        routeColor: route?.color ?? '#475569',
        routeTextColor: route?.textColor ?? '#ffffff',
        headsign: tripUpdate?.headsign || route?.longName || '',
        tripId,
        directionId: direction,
        lat: latitude,
        lon: longitude,
        bearing: vehicle.position.bearing ?? 0,
        speedKmh: Math.round((vehicle.position.speed ?? 0) * 3.6),
        timestamp: toNumber(vehicle.timestamp) || headerTimestamp,
        delaySeconds: tripUpdate?.delaySeconds ?? 0,
        nextStopId: vehicle.stopId || tripUpdate?.stopTimeUpdates[0]?.stopId || null
      });
    }

    return [vehicles, tripUpdates];
  }

  /* ----------------------------- SIRI-SM (לפי תחנה) ----------------------------- */

  /** מרענן תחנות "חמות" (שנתבקשו לאחרונה) + תחנות קבועות מההגדרות */
  private async pollSiri(): Promise<void> {
    const now = Date.now();
    for (const id of this.config.siriWarmStopIds) this.hotStops.set(id, now);
    for (const [id, requestedAt] of this.hotStops) {
      if (now - requestedAt > this.config.siriHotStopTtlMs) this.hotStops.delete(id);
    }
    const ids = [...this.hotStops.keys()];
    const concurrency = 5;
    for (let i = 0; i < ids.length; i += concurrency) {
      await Promise.allSettled(ids.slice(i, i + concurrency).map((id) => this.refreshStop(id, false)));
    }
    this.applyFrame([], [...this.tripUpdates.values()]);
  }

  /**
   * שואל את SIRI-SM על תחנה אחת (עם cache קצר) וממזג את התוצאה ל-cache הכללי.
   * נקרא לפי דרישה מ-API ההגעות / התחנות הקרובות, כדי שהלקוח יקבל נתון טרי.
   */
  public async refreshStop(stopId: string, markHot = true): Promise<void> {
    if (!this.siri) return;
    const stop = this.stops.get(stopId);
    if (!stop) return;
    const now = Date.now();
    if (markHot) this.hotStops.set(stopId, now);
    if (now - (this.stopFetchedAt.get(stopId) ?? 0) < this.config.siriMinRefreshMs) return;
    this.stopFetchedAt.set(stopId, now);

    const result = await this.siri.fetchStop(stop, (lineRef, publishedName) => {
      const route = this.ensureRoute(lineRef);
      if (publishedName && route.shortName === route.id) route.shortName = publishedName;
      return route;
    });

    // ממזגים: כל עדכון נסיעה מחליף/מוסיף את זמן ההגעה לתחנה הזו בלבד
    for (const update of result.tripUpdates) {
      const existing = this.tripUpdates.get(update.tripId);
      if (!existing) {
        this.tripUpdates.set(update.tripId, update);
        continue;
      }
      const others = existing.stopTimeUpdates.filter((stu) => stu.stopId !== stopId);
      existing.stopTimeUpdates = [...others, ...update.stopTimeUpdates].sort(
        (a, b) => a.arrivalTime - b.arrivalTime
      );
      existing.delaySeconds = update.delaySeconds;
      existing.timestamp = update.timestamp;
    }
    const cutoff = Math.floor(Date.now() / 1000) - 60;
    for (const [tripId, update] of this.tripUpdates) {
      update.stopTimeUpdates = update.stopTimeUpdates.filter((stu) => stu.arrivalTime >= cutoff);
      if (update.stopTimeUpdates.length === 0) this.tripUpdates.delete(tripId);
    }
    if (result.vehicles.length > 0) this.applyFrame(result.vehicles, [...this.tripUpdates.values()]);
  }

  /** תחנות סביב נקודה, ממוינות לפי מרחק (במטרים) */
  public getNearbyStops(
    lat: number,
    lon: number,
    radiusM: number,
    limit: number
  ): { stop: Stop; distanceM: number }[] {
    const origin = { lat, lon };
    const found: { stop: Stop; distanceM: number }[] = [];
    for (const stop of this.stops.values()) {
      // סינון גס מהיר לפני Haversine
      if (Math.abs(stop.lat - lat) > radiusM / 100000 || Math.abs(stop.lon - lon) > radiusM / 90000) continue;
      const distanceM = haversine(origin, { lat: stop.lat, lon: stop.lon });
      if (distanceM <= radiusM) found.push({ stop, distanceM: Math.round(distanceM) });
    }
    return found.sort((a, b) => a.distanceM - b.distanceM).slice(0, limit);
  }

  /* ---------------------------------- cache ---------------------------------- */

  private applyFrame(vehicles: VehiclePosition[], tripUpdates: TripUpdate[]): void {
    const now = Date.now();
    const changed: VehiclePosition[] = [];

    for (const vehicle of vehicles) {
      const previous = this.vehicles.get(vehicle.id);
      const hasChanged =
        !previous ||
        previous.lat !== vehicle.lat ||
        previous.lon !== vehicle.lon ||
        previous.timestamp !== vehicle.timestamp ||
        previous.delaySeconds !== vehicle.delaySeconds ||
        previous.speedKmh !== vehicle.speedKmh;
      this.vehicles.set(vehicle.id, vehicle);
      this.vehicleSeenAt.set(vehicle.id, now);
      if (hasChanged) changed.push(vehicle);
    }

    this.tripUpdates = new Map(tripUpdates.map((update) => [update.tripId, update]));

    const removed: string[] = [];
    for (const [id, seenAt] of this.vehicleSeenAt) {
      if (now - seenAt > this.config.vehicleStaleMs) {
        removed.push(id);
        this.vehicleSeenAt.delete(id);
        this.vehicles.delete(id);
      }
    }

    if (changed.length > 0) this.emit('vehicles', changed);
    if (removed.length > 0) this.emit('removed', removed);
  }

  /* ---------------------------------- queries --------------------------------- */

  public getStatus(): ServiceStatus {
    return { ...this.status, vehicleCount: this.vehicles.size };
  }

  public getVehicles(routeIds?: string[]): VehiclePosition[] {
    const all = [...this.vehicles.values()];
    if (!routeIds || routeIds.length === 0) return all;
    const wanted = new Set(routeIds);
    return all.filter((vehicle) => wanted.has(vehicle.routeId));
  }

  public getVehicle(id: string): VehiclePosition | undefined {
    return this.vehicles.get(id);
  }

  public getRouteSummaries(): RouteSummary[] {
    return [...this.routes.values()]
      .map((route) => this.toSummary(route))
      .sort((a, b) => a.shortName.localeCompare(b.shortName, 'he', { numeric: true }));
  }

  public getRouteDetails(id: string): RouteDetails | undefined {
    const route = this.routes.get(id);
    if (!route) return undefined;
    const stops = route.stopIds
      .map((stopId) => this.stops.get(stopId))
      .filter((stop): stop is Stop => Boolean(stop));
    const shape =
      route.shape.length > 0 ? route.shape : stops.map((stop) => ({ lat: stop.lat, lon: stop.lon }));
    return { ...this.toSummary(route), shape, stops };
  }

  public getStops(): Stop[] {
    return [...this.stops.values()];
  }

  public getStop(id: string): Stop | undefined {
    return this.stops.get(id);
  }

  private toSummary(route: Route): RouteSummary {
    return {
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      agency: route.agency,
      color: route.color,
      textColor: route.textColor
    };
  }

  /** הגעות צפויות לתחנה, ממוינות לפי זמן */
  public getArrivalsForStop(stopId: string, limit = 20): Arrival[] {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const arrivals: Arrival[] = [];

    for (const tripUpdate of this.tripUpdates.values()) {
      const update = tripUpdate.stopTimeUpdates.find((stu) => stu.stopId === stopId);
      if (!update) continue;
      if (update.arrivalTime < nowSeconds - 30) continue;
      const route = this.routes.get(tripUpdate.routeId);
      arrivals.push({
        routeId: tripUpdate.routeId,
        routeShortName: route?.shortName ?? tripUpdate.routeId,
        routeColor: route?.color ?? '#475569',
        routeTextColor: route?.textColor ?? '#ffffff',
        headsign: tripUpdate.headsign || route?.longName || '',
        tripId: tripUpdate.tripId,
        vehicleId: tripUpdate.vehicleId,
        arrivalTime: update.arrivalTime,
        delaySeconds: update.delaySeconds || tripUpdate.delaySeconds,
        minutes: Math.max(0, Math.ceil((update.arrivalTime - nowSeconds) / 60))
      });
    }

    return arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime).slice(0, limit);
  }

  /** התחנות הבאות של רכב מסוים */
  public getUpcomingForVehicle(vehicleId: string, limit = 8): UpcomingStop[] {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return [];
    const nowSeconds = Math.floor(Date.now() / 1000);

    let tripUpdate = vehicle.tripId ? this.tripUpdates.get(vehicle.tripId) : undefined;
    if (!tripUpdate) {
      tripUpdate = [...this.tripUpdates.values()].find((tu) => tu.vehicleId === vehicleId);
    }
    if (!tripUpdate) return [];

    const upcoming: UpcomingStop[] = [];
    for (const update of tripUpdate.stopTimeUpdates) {
      if (update.arrivalTime < nowSeconds - 30) continue;
      const stop = this.stops.get(update.stopId);
      if (!stop) continue;
      upcoming.push({
        stop,
        stopSequence: update.stopSequence,
        arrivalTime: update.arrivalTime,
        delaySeconds: update.delaySeconds || tripUpdate.delaySeconds,
        minutes: Math.max(0, Math.ceil((update.arrivalTime - nowSeconds) / 60))
      });
    }
    return upcoming
      .sort((a, b) => a.arrivalTime - b.arrivalTime)
      .slice(0, limit);
  }

  /** חיפוש קווים ותחנות להשלמה אוטומטית */
  public search(query: string, limit = 8): SearchResults {
    const q = query.trim().toLowerCase();
    if (q === '') return { routes: [], stops: [] };

    const routes = this.getRouteSummaries()
      .map((route) => {
        const short = route.shortName.toLowerCase();
        let score = 0;
        if (short === q) score = 100;
        else if (short.startsWith(q)) score = 80;
        else if (route.longName.toLowerCase().includes(q)) score = 40;
        else if (short.includes(q)) score = 30;
        return { route, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.route);

    const stops = this.getStops()
      .map((stop) => {
        const name = stop.name.toLowerCase();
        let score = 0;
        if (stop.code === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 50;
        else if (stop.code.startsWith(q)) score = 30;
        return { stop, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.stop);

    return { routes, stops };
  }
}
