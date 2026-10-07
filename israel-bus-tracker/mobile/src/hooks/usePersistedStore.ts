import { useEffect, useSyncExternalStore } from 'react';

import type { PersistedStore } from '../core/store';

/** קורא store מתמיד בצורה ריאקטיבית; מבצע hydrate פעם אחת (idempotent). */
export function usePersistedStore<T>(store: PersistedStore<T>): { value: T; ready: boolean } {
  useEffect(() => {
    void store.hydrate();
  }, [store]);
  const value = useSyncExternalStore(store.subscribe, store.get, store.get);
  const ready = useSyncExternalStore(store.subscribe, store.isHydrated, store.isHydrated);
  return { value, ready };
}
