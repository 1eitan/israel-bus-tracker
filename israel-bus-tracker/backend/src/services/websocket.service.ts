import type http from 'http';
import { Server, type Socket } from 'socket.io';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  VehiclePosition
} from '../types/gtfs';
import { sanitizeSocketRouteIds } from '../http/validation';
import { ALL_ROUTES_ROOM_KEY } from '../types/gtfs';
import type { GtfsFetcherService } from './gtfsFetcher.service';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const ROOM_PREFIX = 'route:';

/**
 * מנהל חיבורי Socket.io. כל לקוח נרשם לקווים שמעניינים אותו בלבד
 * (חדר לכל קו), כך שהוא מקבל עדכוני מיקום רק עבורם.
 */
export class WebSocketService {
  private readonly io: Server<ClientToServerEvents, ServerToClientEvents>;

  private statusTimer: NodeJS.Timeout | null = null;

  private readonly onVehicles = (changed: VehiclePosition[]): void => this.broadcastVehicles(changed);

  private readonly onRemoved = (ids: string[]): void => {
    this.io.emit('vehicles:remove', { ids });
  };

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
    this.fetcher.on('vehicles', this.onVehicles);
    this.fetcher.on('removed', this.onRemoved);
    this.statusTimer = setInterval(() => {
      this.io.emit('server:status', this.fetcher.getStatus());
    }, 10000);
  }

  private roomOf(routeId: string): string {
    return `${ROOM_PREFIX}${routeId}`;
  }

  private handleConnection(socket: TypedSocket): void {
    socket.emit('server:status', this.fetcher.getStatus());

    // ה-listeners נרשמים פעם אחת לכל socket (בתוך 'connection'), ולכן reconnect
    // של לקוח יוצר socket חדש עם listeners חדשים ולא מכפיל את הישנים.
    socket.on('subscribe', (payload) => {
      const routeIds = sanitizeSocketRouteIds(payload);
      this.replaceSubscriptions(socket, routeIds);

      const wantsAll = routeIds.includes(ALL_ROUTES_ROOM_KEY) || routeIds.length === 0;
      const vehicles = wantsAll ? this.fetcher.getVehicles() : this.fetcher.getVehicles(routeIds);
      // snapshot מחליף את ה-state אצל הלקוח, כך שאין כפילויות אחרי subscribe/reconnect
      socket.emit('snapshot', { vehicles, serverTime: Date.now() });
    });

    socket.on('unsubscribe', (payload) => {
      const routeIds = sanitizeSocketRouteIds(payload);
      const before = this.fetcher.getVehicles().filter((v) => this.isSubscribed(socket, v.routeId));

      if (routeIds.length === 0) {
        this.leaveRouteRooms(socket);
      } else {
        for (const routeId of routeIds) socket.leave(this.roomOf(routeId));
      }

      // רכבים שהלקוח כבר לא מנוי עליהם נמחקים אצלו
      const ids = before.filter((v) => !this.isSubscribed(socket, v.routeId)).map((v) => v.id);
      if (ids.length > 0) socket.emit('vehicles:remove', { ids });
    });
  }

  private isSubscribed(socket: TypedSocket, routeId: string): boolean {
    return (
      socket.rooms.has(this.roomOf(ALL_ROUTES_ROOM_KEY)) || socket.rooms.has(this.roomOf(routeId))
    );
  }

  private leaveRouteRooms(socket: TypedSocket): void {
    for (const room of [...socket.rooms]) {
      if (room.startsWith(ROOM_PREFIX)) socket.leave(room);
    }
  }

  private replaceSubscriptions(socket: TypedSocket, routeIds: string[]): void {
    this.leaveRouteRooms(socket);
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
    this.fetcher.off('vehicles', this.onVehicles);
    this.fetcher.off('removed', this.onRemoved);
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });
  }
}
