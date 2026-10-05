import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* האחסון הוא best-effort */
  }
}

export const KEYS = {
  favorites: 'bus.favorites.v1',
  recents: 'bus.recents.v1',
  favoriteStops: 'bus.favoriteStops.v1',
  profile: 'bus.profile.v1',
  card: 'bus.ravkav.v1'
} as const;
