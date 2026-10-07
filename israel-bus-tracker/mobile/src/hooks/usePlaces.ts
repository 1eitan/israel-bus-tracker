import { useCallback } from 'react';

import { addFavoritePlace, isFavoritePlace, removeFavoritePlace, toggleFavoritePlace, type FavoritePlace } from '../favorites/places';
import type { RecentInput, RecentSearch } from '../history/recents';
import { useServices } from '../providers/context';
import { usePersistedStore } from './usePersistedStore';

export type Place = FavoritePlace;

/** מקומות מועדפים + חיפושים אחרונים (מקומי, עובד offline). */
export function usePlaces() {
  const { favorites: stores, recents: history } = useServices();
  const fav = usePersistedStore(stores.places);
  const rec = usePersistedStore(history.store);

  const removeFavorite = useCallback((id: string) => void stores.places.update((l) => removeFavoritePlace(l, id)), [stores]);
  const addFavorite = useCallback(
    (input: Parameters<typeof addFavoritePlace>[1]) => void stores.places.update((l) => addFavoritePlace(l, input)),
    [stores]
  );
  const toggleFavorite = useCallback(
    (input: Parameters<typeof addFavoritePlace>[1]) => void stores.places.update((l) => toggleFavoritePlace(l, input)),
    [stores]
  );
  const isFavorite = useCallback((title: string) => isFavoritePlace(fav.value, title), [fav.value]);

  const addRecent = useCallback((input: RecentInput) => void history.record(input), [history]);
  const removeRecent = useCallback((id: string) => void history.remove(id), [history]);
  const clearRecents = useCallback(() => void history.clear(), [history]);

  return {
    ready: fav.ready && rec.ready,
    favorites: fav.value,
    recents: rec.value as RecentSearch[],
    addFavorite,
    toggleFavorite,
    removeFavorite,
    isFavorite,
    addRecent,
    removeRecent,
    clearRecents
  };
}
