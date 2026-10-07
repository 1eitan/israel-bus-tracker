import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void): (() => void) => onlineManager.subscribe(listener);
const getSnapshot = (): boolean => onlineManager.isOnline();

/** true כשיש רשת (לפי NetInfo דרך React Query onlineManager) */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
