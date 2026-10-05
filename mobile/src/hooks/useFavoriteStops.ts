import { useCallback, useEffect, useState } from 'react';

import { KEYS, loadJson, saveJson } from '../lib/storage';
import type { Stop } from '../types/bus';

/** תחנות מועדפות (נשמרות מקומית במכשיר) */
export function useFavoriteStops() {
  const [favorites, setFavorites] = useState<Stop[]>([]);

  useEffect(() => {
    void loadJson<Stop[]>(KEYS.favoriteStops, []).then(setFavorites);
  }, []);

  const toggle = useCallback((stop: Stop) => {
    setFavorites((previous) => {
      const next = previous.some((s) => s.id === stop.id)
        ? previous.filter((s) => s.id !== stop.id)
        : [...previous, stop];
      void saveJson(KEYS.favoriteStops, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((s) => s.id === id), [favorites]);

  return { favorites, toggle, isFavorite };
}
