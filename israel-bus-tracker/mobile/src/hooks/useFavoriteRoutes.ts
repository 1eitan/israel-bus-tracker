import { useCallback } from 'react';

import { toggleFavoriteRoute } from '../favorites/places';
import { useServices } from '../providers/context';
import { usePersistedStore } from './usePersistedStore';

/** קווים מועדפים (מזהי קו, נשמרים מקומית במכשיר) */
export function useFavoriteRoutes() {
  const { favorites: stores } = useServices();
  const { value: ids } = usePersistedStore(stores.routes);
  const toggle = useCallback((id: string) => void stores.routes.update((l) => toggleFavoriteRoute(l, id)), [stores]);
  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);
  return { ids, toggle, isFavorite };
}
