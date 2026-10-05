import type http from 'http';
import { Server, type Socket } from 'socket.io';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  VehiclePosition
} from '../types/gtfs';
import { ALL_ROUTES_ROOM_KEY } from '../types/gtfs';
import type { GtfsFetcherService } from './gtfsFetcher.service';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const ROOM_PREFIX = 'route:';
const MAX_ROUTE_SUBSCRIPTIONS = 50;

/**
 * מנהל חיבורי Socket.io. כל לקוח נרשם לקווים שמעניינים אותו בלבד
 * (חדר לכל קו), כך שהוא מקבל עדכוני מיקום רק עבורם.
 */
export class WebSocketService {
  private readonly io: Server<ClientToServerEvents, ServerToClientEvents>;

  private statusTimer: NodeJS.Timeout | null = null;

  constructor(
    httpServer: http.Server,
    private readonly fetcher: GtfsFetcherService,
    corsOrigin: string[]
  ) {
    const origin = corsOrigin.includes('*') ? '*' : corsOrigin;
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: { origin, methods: ['GET', 'POST'] },
      pingInterval: 10000,
      pingTimeout: 8000
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
    this.fetcher.on('vehicles', (changed) => this.broadcastVehicles(changed));
    this.fetcher.on('removed', (ids) => this.io.emit('vehicles:remove', { ids }));
    this.statusTimer = setInterval(() => {
      this.io.emit('server:status', this.fetcher.getStatus());
    }, 10000);
  }

  private roomOf(routeId: string): string {
    return `${ROOM_PREFIX}${routeId}`;
  }

  private handleConnection(socket: TypedSocket): void {
    socket.emit('server:status', this.fetcher.getStatus());

    socket.on('subscribe', (payload) => {
      const requested = Array.isArray(payload?.routeIds) ? payload.routeIds : [];
      const routeIds = requested
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .slice(0, MAX_ROUTE_SUBSCRIPTIONS);

      this.replaceSubscriptions(socket, routeIds);

      const wantsAll = routeIds.includes(ALL_ROUTES_ROOM_KEY) || routeIds.length === 0;
      const vehicles = wantsAll ? this.fetcher.getVehicles() : this.fetcher.getVehicles(routeIds);
      socket.emit('snapshot', { vehicles, serverTime: Date.now() });
    });
  }

  private replaceSubscriptions(socket: TypedSocket, routeIds: string[]): void {
    for (const room of socket.rooms) {
      if (room.startsWith(ROOM_PREFIX)) {
        socket.leave(room);
      }
    }
    if (routeIds.includes(ALL_ROUTES_ROOM_KEY) || routeIds.length === 0) {
      socket.join(this.roomOf(ALL_ROUTES_ROOM_KEY));
      return;
    }
    for (const routeId of routeIds) {
      socket.join(this.roomOf(routeId));
    }
  }

  private broadcastVehicles(changed: VehiclePosition[]): void {
    const serverTime = Date.now();

    this.io
      .to(this.roomOf(ALL_ROUTES_ROOM_KEY))
      .emit('vehicles:update', { vehicles: changed, serverTime });

    const byRoute = new Map<string, VehiclePosition[]>();
    for (const vehicle of changed) {
      const list = byRoute.get(vehicle.routeId);
      if (list) list.push(vehicle);
      else byRoute.set(vehicle.routeId, [vehicle]);
    }

    for (const [routeId, vehicles] of byRoute) {
      this.io.to(this.roomOf(routeId)).emit('vehicles:update', { vehicles, serverTime });
    }
  }

  public async close(): Promise<void> {
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });
  }
}
