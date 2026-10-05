import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { ConnectionStatus, ServiceStatus, Vehicle } from '../types/bus';

interface SnapshotPayload {
  vehicles: Vehicle[];
  serverTime: number;
}

interface RemovePayload {
  ids: string[];
}

export interface VehicleSocketState {
  status: ConnectionStatus;
  vehicles: Record<string, Vehicle>;
  serverStatus: ServiceStatus | null;
}

/**
 * מתחבר ל-Socket.io ומנהל את רשימת הרכבים בזמן אמת.
 * routeIds קובע לאילו קווים הלקוח נרשם (['*'] = כל הקווים).
 */
export function useVehicleSocket(routeIds: string[]): VehicleSocketState {
  const socketRef = useRef<Socket | null>(null);
  const routeIdsRef = useRef<string[]>(routeIds);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [serverStatus, setServerStatus] = useState<ServiceStatus | null>(null);

  const routeKey = routeIds.join('|');

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL;
    const socket: Socket = url
      ? io(url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        })
      : io({
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });
    socketRef.current = socket;

    const subscribe = (): void => {
      socket.emit('subscribe', { routeIds: routeIdsRef.current });
    };

    socket.on('connect', () => {
      setStatus('connected');
      subscribe();
    });

    socket.on('disconnect', () => {
      setStatus('reconnecting');
    });

    socket.on('connect_error', () => {
      setStatus('reconnecting');
    });

    socket.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
    });

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

    socket.on('vehicles:remove', (payload: RemovePayload) => {
      setVehicles((previous) => {
        const next = { ...previous };
        for (const id of payload.ids) delete next[id];
        return next;
      });
    });

    socket.on('server:status', (payload: ServiceStatus) => {
      setServerStatus(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.io.off('reconnect_attempt');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    routeIdsRef.current = routeIds;
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('subscribe', { routeIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return { status, vehicles, serverStatus };
}
