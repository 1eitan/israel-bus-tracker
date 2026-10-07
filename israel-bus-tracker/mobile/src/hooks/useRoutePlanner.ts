import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppFailure } from '../core/outcome';
import { useServices } from '../providers/context';
import { planRoute } from '../routing/plan';
import { resolveWaypoint, type ResolveDeps } from '../routing/resolve';
import type { Itinerary, TimeSpec } from '../routing/types';
import { onlineManager } from '@tanstack/react-query';

export type PlannerUiState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'not_implemented'; reason: string }
  | { phase: 'error'; failure: AppFailure }
  | { phase: 'empty' }
  | { phase: 'ok'; itineraries: Itinerary[] };

const deviceResolveDeps: ResolveDeps = {
  async geocode(text) {
    const found = await Location.geocodeAsync(text);
    return found.length > 0 ? { lat: found[0].latitude, lon: found[0].longitude } : null;
  },
  /** רק אם כבר ניתנה הרשאה - לא קופצים בקשת הרשאה מתוך תכנון מסלול */
  async currentLocation() {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  }
};

export function useRoutePlanner() {
  const { routePlanner } = useServices();
  const [state, setState] = useState<PlannerUiState>({ phase: 'idle' });
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const plan = useCallback(
    async (fromText: string, toText: string, time: TimeSpec) => {
      controller.current?.abort();
      const ctl = new AbortController();
      controller.current = ctl;
      const id = (requestId.current += 1);
      setState({ phase: 'loading' });

      const origin = await resolveWaypoint(fromText, 'origin', deviceResolveDeps);
      const destination = await resolveWaypoint(toText, 'destination', deviceResolveDeps);
      let next: PlannerUiState;
      if (origin.kind !== 'ok' || destination.kind !== 'ok') {
        const bad = origin.kind !== 'ok' ? origin : destination;
        next = bad.kind === 'error' ? { phase: 'error', failure: bad.error } : { phase: 'idle' };
      } else {
        const result = await planRoute(
          routePlanner,
          { origin: origin.data, destination: destination.data, time },
          { isOnline: () => onlineManager.isOnline(), signal: ctl.signal }
        );
        if (result.kind === 'ok') next = result.data.length === 0 ? { phase: 'empty' } : { phase: 'ok', itineraries: result.data };
        else if (result.kind === 'not_implemented') next = { phase: 'not_implemented', reason: result.reason };
        else next = { phase: 'error', failure: result.error };
      }
      // תשובה ישנה (בקשה חדשה/ביטול) לא דורסת את המסך
      if (id === requestId.current && !(next.phase === 'error' && next.failure.code === 'cancelled')) setState(next);
    },
    [routePlanner]
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    requestId.current += 1;
    setState({ phase: 'idle' });
  }, []);

  return { state, plan, reset, isMock: routePlanner.isMock };
}
