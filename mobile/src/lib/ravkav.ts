/**
 * הרב-קו הוא כרטיס Calypso (ISO 14443-4). כאן מבוצעת הקריאה הבסיסית בלבד:
 * זיהוי הכרטיס (UID) ובחירת היישום (SELECT AID) לבדיקה שהוא מגיב.
 *
 * AID: זהו מזהה היישום הסטנדרטי של Calypso ("1TIC.ICA") ויש לאמת אותו מול
 * מפרט הרב-קו של משרד התחבורה/רב-פס לפני הפצה. אם הכרטיס אינו מגיב ב-9000 - זה המקום לבדוק.
 */
export const RAVKAV_AID_HEX = '315449432E494341';

export interface RavKavReadResult {
  uid: string | null;
  /** האם ה-SELECT הוחזר בהצלחה (SW=9000) */
  selectOk: boolean;
  statusWord: string;
  /** תוכן ה-FCI הגולמי (hex) */
  fciHex: string;
  /** יתרה באגורות, או null אם לא נקראה */
  balanceAgorot: number | null;
}

/**
 * קריאת יתרה דורשת READ RECORD על קבצי החוזים/המונים לפי מפרט Calypso של הרב-קו,
 * שאינו כלול כאן. מחזיר null עד שמממשים לפי המפרט (ראה README). טעינה/כתיבה לכרטיס
 * מתבצעות רק דרך מערכות הטעינה הרשמיות ולא נתמכות מאפליקציה צד-שלישי.
 */
export function parseRavKavBalance(_fci: number[]): number | null {
  return null;
}
