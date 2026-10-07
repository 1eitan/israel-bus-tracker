import * as Haptics from 'expo-haptics';

/** משוב haptic עדין. כשל (מכשיר/אמולטור ללא תמיכה) מתעלמים בשקט. */
let enabled = true;
/** הגדרת המשתמש (הגדרות > רטט). כבוי = אף משוב haptic לא מופעל. */
export const setHapticsEnabled = (value: boolean): void => {
  enabled = value;
};

const safe = (run: () => Promise<void>): void => {
  if (!enabled) return;
  run().catch(() => undefined);
};

export const haptics = {
  /** לחיצה רגילה: בחירת טאב, צ'יפ, מועדף */
  select: () => safe(() => Haptics.selectionAsync()),
  /** פעולה משמעותית: החלפת מוצא/יעד, פתיחת sheet */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
};
