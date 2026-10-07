import { useCallback } from 'react';

import { toggleFavoriteStop } from '../favorites/places';
import { useServices } from '../providers/context';
import type { Stop } from '../types/bus';
import { usePersistedStore } from './usePersistedStore';

/** תחנות מועדפות (נשמרות מקומית במכשיר) */
export function useFavoriteStops() {
  const { favorites: stores } = useServices();
  const { value: favorites } = usePersistedStore(stores.stops);
  const toggle = useCallback((stop: Stop) => void stores.stops.update((l) => toggleFavoriteStop(l, stop)), [stores]);
  const isFavorite = useCallback((id: string) => favorites.some((s) => s.id === id), [favorites]);
  return { favorites, toggle, isFavorite };
}
