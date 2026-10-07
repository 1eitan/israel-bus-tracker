import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from '../core/store';

/**
 * מתאם AsyncStorage ל-KeyValueStore. המפתחות (bus.*.v1) מוגדרים ליד כל תחום
 * (favorites/places.ts, history/recents.ts, profile/provider.ts) ולא כאן.
 * אין לשמור כאן נתוני כרטיס אשראי / סודות - createServices עוטף את האחסון במסנן שדוחה אותם.
 */
export const asyncStorageKV: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key)
};
