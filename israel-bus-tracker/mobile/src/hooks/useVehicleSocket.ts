import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { isValidCoord } from '../lib/geo';
import { API_CONFIGURED, SOCKET_URL } from '../lib/config';
import type { ConnectionStatus, ServiceStatus, Vehicle } from '../types/bus';
import { useOnline } from './useOnline';

interface SnapshotPayload {
  vehicles: Vehicle[];
  serverTime: number;
}

export interface VehicleSocketState {
  status: ConnectionStatus;
  vehicles: Record<string, Vehicle>;
  serverStatus: ServiceStatus | null;
}

/** עדכוני מיקום מצטברים ומוזרמים ל-state פעם בחצי שנייה - לא רינדור מחדש של כל הסמנים על כל הודעה */
const FLUSH_MS = 500;
/** רכב שלא התעדכן כל כך הרבה זמן (לפי timestamp של השרת, בשניות) נעלם מהמפה */
const STALE_AFTER_S = 10 * 60;
const PRUNE_EVERY_MS = 30_000;

const toSeconds = (timestamp: number): number => (timestamp > 1e12 ? timestamp / 1000 : timestamp);
const isUsable = (vehicle: Vehicle): boolean => !!vehicle && !!vehicle.id && isValidCoord(vehicle.lat, vehicle.lon);

/**
 * WebSocket (Socket.IO) לרכבים בזמן אמת: snapshot / vehicles:update / vehicles:remove + מנוי לפי קווים.
 * - מתחבר רק כשהאפליקציה בחזית *וגם* יש רשת (enabled && online); מתנתק ומנקה timers אחרת.
 * - reconnect אוטומטי עם backoff; בכל חיבור מחדש נשלח subscribe והשרת מחזיר snapshot שמחליף את המצב.
 * - עדכונים מקובצים, רכבים עם מיקום לא תקין נזרקים, ורכבים שהתיישנו נמחקים.
 */
export function useVehicleSocket(routeIds: string[], enabled = true): VehicleSocketState {
  const online = useOnline();
  // בלי כתובת שרת תקינה (release בלי EXPO_PUBLIC_API_URL) לא פותחים socket בכלל
  const connectEnabled = enabled && online && API_CONFIGURED;

  const socketRef = useRef<Socket | null>(null);
  const routeIdsRef = useRef<string[]>(routeIds);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [serverStatus, setServerStatus] = useState<ServiceStatus | null>(null);
  const routeKey = routeIds.join('|');

  useEffect(() => {
    if (!connectEnabled) {
      setStatus(online && API_CONFIGURED ? 'connecting' : 'offline');
      return undefined;
    }

    setStatus('connecting');
    const pendingUpdates = new Map<string, Vehicle>();
    const pendingRemovals = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = (): void => {
      flushTimer = null;
      if (pendingUpdates.size === 0 && pendingRemovals.size === 0) return;
      const updates = [...pendingUpdates.values()];
      const removals = [...pendingRemovals];
      pendingUpdates.clear();
      pendingRemovals.clear();
      setVehicles((previous) => {
        const next = { ...previous };
        for (const id of removals) delete next[id];
        for (const vehicle of updates) next[vehicle.id] = vehicle;
        return next;
      });
    };
    const scheduleFlush = (): void => {
      if (flushTimer === null) flushTimer = setTimeout(flush, FLUSH_MS);
    };

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('subscribe', { routeIds: routeIdsRef.current });
    });
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.on('connect_error', () => setStatus('reconnecting'));

    socket.on('snapshot', (payload: SnapshotPayload) => {
      // snapshot מחליף הכול - עדכונים מצטברים ישנים כבר לא רלוונטיים
      pendingUpdates.clear();
      pendingRemovals.clear();
      const next: Record<string, Vehicle> = {};
      for (const vehicle of payload.vehicles ?? []) if (isUsable(vehicle)) next[vehicle.id] = vehicle;
      setVehicles(next);
    });
    socket.on('vehicles:update', (payload: SnapshotPayload) => {
      for (const vehicle of payload.vehicles ?? []) {
        if (!isUsable(vehicle)) continue;
        pendingRemovals.delete(vehicle.id);
        pendingUpdates.set(vehicle.id, vehicle);
      }
      scheduleFlush();
    });
    socket.on('vehicles:remove', (payload: { ids: string[] }) => {
      for (const id of payload.ids ?? []) {
        pendingUpdates.delete(id);
        pendingRemovals.add(id);
      }
      scheduleFlush();
    });
    socket.on('server:status', (payload: ServiceStatus) => setServerStatus(payload));

    // רכבים שהפסיקו לדווח (השרת לא תמיד שולח remove) נמחקים מהמפה
    const pruneTimer = setInterval(() => {
      const cutoff = Date.now() / 1000 - STALE_AFTER_S;
      setVehicles((previous) => {
        let changed = false;
        const next: Record<string, Vehicle> = {};
        for (const [id, vehicle] of Object.entries(previous)) {
          if (toSeconds(vehicle.timestamp) >= cutoff) next[id] = vehicle;
          else changed = true;
        }
        return changed ? next : previous;
      });
    }, PRUNE_EVERY_MS);

    return () => {
      clearInterval(pruneTimer);
      if (flushTimer !== null) clearTimeout(flushTimer);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [connectEnabled, online]);

  useEffect(() => {
    routeIdsRef.current = routeIds;
    const socket = socketRef.current;
    if (socket?.connected) socket.emit('subscribe', { routeIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return { status, vehicles, serverStatus };
}
