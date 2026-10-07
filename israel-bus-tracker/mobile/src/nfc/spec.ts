import type { Outcome } from '../core/outcome';
import type { ParsedResponse } from './apdu';

/**
 * מפרט קריאה מאומת של כרטיס הרב-קו.
 *
 * כלל ברזל: אסור לנחש AID, APDU, מבנה רשומות או פורמט יתרה.
 * עד שיש מפרט רשמי מאומת (מסמך + גרסה + תאריך אימות) הערך הוא null, והאפליקציה לא שולחת לכרטיס
 * שום פקודה: היא מזהה רק שכרטיס NFC (ISO-DEP) הוצמד ומציגה את ה-UID.
 *
 * כדי להפעיל קריאה: ממלאים אובייקט RavKavSpec אחד ומציבים אותו ב-VERIFIED_RAVKAV_SPEC.
 * ה-readPlan עובר assertReadOnlyApdu לפני כל שליחה, כך שגם מפרט שגוי לא יכול לכתוב לכרטיס.
 */
export interface ReadStep {
  /** מזהה יציב, משמש כמפתח ב-parsers */
  id: string;
  /** תיאור אנושי (לדיבוג) */
  description: string;
  apdu: readonly number[];
  /** אם true וה-SW אינו הצלחה - עוצרים ומדווחים. ברירת מחדל: true */
  required?: boolean;
}

export interface BalanceInfo {
  /** באגורות, מספר שלם */
  agorot: number;
}

export interface DiscountProfileInfo {
  /** שם הפרופיל כפי שמופיע במפרט (למשל "רגיל") */
  name: string;
}

export interface CardHistoryEntry {
  at: number;
  description: string;
}

export type StepResponses = ReadonlyMap<string, ParsedResponse>;

export interface RavKavSpec {
  /** מקור המפרט: שם מסמך + גרסה */
  readonly source: string;
  /** תאריך אימות מול המקור (YYYY-MM-DD) */
  readonly verifiedOn: string;
  readonly readPlan: readonly ReadStep[];
  /** האם התשובות מזהות כרטיס רב-קו */
  identify(responses: StepResponses): boolean;
  parseBalance(responses: StepResponses): Outcome<BalanceInfo>;
  parseProfile?(responses: StepResponses): Outcome<DiscountProfileInfo>;
  parseHistory?(responses: StepResponses): Outcome<CardHistoryEntry[]>;
}

/** אין מפרט מאומת => null. לא להחליף בניחוש. */
export const VERIFIED_RAVKAV_SPEC: RavKavSpec | null = null;

export const NO_SPEC_REASON =
  'אין מפרט מאומת של כרטיס הרב-קו, ולכן האפליקציה לא שולחת פקודות לכרטיס ולא מפענחת את תוכנו.';
