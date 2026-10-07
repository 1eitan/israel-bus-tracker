import { Platform } from 'react-native';

/**
 * זמינות המפה נקבעת לפי מפתח Google Maps אמיתי. בלי מפתח תקין לא מרנדרים MapView בכלל:
 * באנדרואיד MapView עם provider=google בלי מפתח קורס (או מציג מפה אפורה), ובאייפון
 * PROVIDER_GOOGLE בלי ה-SDK קורס. במקום זה מוצג מסך "מפה לא זמינה" והאפליקציה ממשיכה לעבוד.
 *
 * הערה: ה-process.env.EXPO_PUBLIC_* חייבים להופיע כמשתנה מלא כדי ש-Metro יטמיע אותם.
 */
const GOOGLE_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;
const isRealKey = (key: string | undefined): boolean => !!key && GOOGLE_KEY_PATTERN.test(key.trim());

const androidKeyOk = isRealKey(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY);
const iosKeyOk = isRealKey(process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY);

/** google: Google Maps + סגנון כהה · default: Apple Maps (iOS בלי מפתח) · none: אין מפה */
export type MapProviderKind = 'google' | 'default' | 'none';

export const MAP_PROVIDER: MapProviderKind =
  Platform.OS === 'android' ? (androidKeyOk ? 'google' : 'none') : iosKeyOk ? 'google' : 'default';

export const MAPS_AVAILABLE = MAP_PROVIDER !== 'none';
