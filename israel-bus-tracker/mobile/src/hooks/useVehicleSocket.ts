import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '../lib/config';
import type { ConnectionStatus, ServiceStatus, Vehicle } from '../types/bus';

interface SnapshotPayload {
  vehicles: Vehicle[];
  serverTime: number;
}

export interface VehicleSocketState {
  status: ConnectionStatus;
  vehicles: Record<string, Vehicle>;
  serverStatus: ServiceStatus | null;
}

/**
 * אותה לוגיקה כמו ב-web (snapshot / vehicles:update / vehicles:remove / subscribe לפי קווים),
 * עם השהיית החיבור כשהאפליקציה ברקע (enabled=false).
 */
export function useVehicleSocket(routeIds: string[], enabled = true): VehicleSocketState {
  const socketRef = useRef<Socket | null>(null);
  const routeIdsRef = useRef<string[]>(routeIds);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [serverStatus, setServerStatus] = useState<ServiceStatus | null>(null);
  const routeKey = routeIds.join('|');

  useEffect(() => {
    if (!enabled) return undefined;
    setStatus('connecting');
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('subscribe', { routeIds: routeIdsRef.current });
    });
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.on('connect_error', () => setStatus('reconnecting'));
    socket.on('snapshot', (payload: SnapshotPayload) => {
      const next: Record<string, Vehicle> = {};
      for (const vehicle of payload.vehicles) next[vehicle.id] = vehicle;
      setVehicles(next);
    });
    socket.on('vehicles:update', (payload: SnapshotPayload) => {
      setVehicles((previous) => {
        const next = { ...previous };
        for (const vehicle of payload.vehicles) next[vehicle.id] = vehicle;
        return next;
      });
    });
    socket.on('vehicles:remove', (payload: { ids: string[] }) => {
      setVehicles((previous) => {
        const next = { ...previous };
        for (const id of payload.ids) delete next[id];
        return next;
      });
    });
    socket.on('server:status', (payload: ServiceStatus) => setServerStatus(payload));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    routeIdsRef.current = routeIds;
    const socket = socketRef.current;
    if (socket?.connected) socket.emit('subscribe', { routeIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return { status, vehicles, serverStatus };
}
