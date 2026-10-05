import { DevSettings, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * מכריח RTL גלובלי. שינוי ה-RTL המקורי נכנס לתוקף רק אחרי הפעלה מחדש של האפליקציה,
 * לכן בהרצה הראשונה (או אחרי התקנה) האפליקציה נטענת מחדש פעם אחת.
 * מחזיר true אם נדרשת/הופעלה טעינה מחדש.
 */
export function ensureRtl(): boolean {
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL) return false;

  I18nManager.forceRTL(true);
  setTimeout(() => {
    Updates.reloadAsync().catch(() => DevSettings.reload());
  }, 0);
  return true;
}

export const isRtl = (): boolean => I18nManager.isRTL;
