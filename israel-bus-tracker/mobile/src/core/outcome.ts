/**
 * תוצאה אחידה לכל ה-providers.
 *
 * שלושה מצבים בלבד, ואין מצב רביעי של "הצלחה מדומה":
 *  - ok              - הפעולה בוצעה באמת
 *  - not_implemented - אין מימוש אמיתי (ספק/מפרט/שרת חסר). ה-UI מציג זאת כ"עדיין לא נתמך"
 *  - error           - הפעולה נכשלה (offline / timeout / ...)
 */
export type ErrorCode =
  | 'offline'
  | 'timeout'
  | 'network'
  | 'cancelled'
  | 'unauthorized'
  | 'invalid_input'
  | 'invalid_response'
  | 'tag_lost'
  | 'apdu_failed'
  | 'unavailable'
  | 'unknown';

export interface AppFailure {
  code: ErrorCode;
  /** הודעה למשתמש (עברית) */
  message: string;
  /** האם ניסיון חוזר ידני עשוי לעזור */
  retryable: boolean;
  /** פרט טכני גולמי - לא להציג למשתמש בסביבת release */
  cause?: string;
}

export type Outcome<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'not_implemented'; code: 'NOT_IMPLEMENTED'; feature: string; reason: string }
  | { kind: 'error'; error: AppFailure };

export const ok = <T>(data: T): Outcome<T> => ({ kind: 'ok', data });

export const notImplemented = <T = never>(feature: string, reason: string): Outcome<T> => ({
  kind: 'not_implemented',
  code: 'NOT_IMPLEMENTED',
  feature,
  reason
});

export const ERROR_MESSAGES_HE: Record<ErrorCode, string> = {
  offline: 'אין חיבור לאינטרנט.',
  timeout: 'הפעולה לקחה יותר מדי זמן.',
  network: 'אין תקשורת עם השרת.',
  cancelled: 'הפעולה בוטלה.',
  unauthorized: 'נדרשת התחברות.',
  invalid_input: 'הנתונים שהוזנו אינם תקינים.',
  invalid_response: 'התקבלה תשובה לא תקינה.',
  tag_lost: 'הכרטיס התרחק מהמכשיר באמצע הקריאה. נסה שוב והחזק אותו צמוד.',
  apdu_failed: 'הכרטיס החזיר שגיאה.',
  unavailable: 'השירות אינו זמין כרגע.',
  unknown: 'אירעה שגיאה לא צפויה.'
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set(['offline', 'timeout', 'network', 'tag_lost', 'unavailable', 'unknown']);

export function failure(code: ErrorCode, cause?: string, message?: string): AppFailure {
  return { code, message: message ?? ERROR_MESSAGES_HE[code], retryable: RETRYABLE.has(code), cause };
}

export const fail = <T = never>(code: ErrorCode, cause?: string, message?: string): Outcome<T> => ({
  kind: 'error',
  error: failure(code, cause, message)
});

/** הופך חריגה לא צפויה ל-AppFailure (מבלי לאבד את ההודעה המקורית ב-cause) */
export function toFailure(error: unknown): AppFailure {
  const cause = error instanceof Error ? error.message : String(error);
  return failure('unknown', cause);
}

/** מריץ פעולה; חריגה הופכת ל-error ולא נזרקת הלאה */
export async function attempt<T>(run: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await run();
  } catch (error) {
    return { kind: 'error', error: toFailure(error) };
  }
}

/**
 * פעולת רשת: בלי חיבור לא יוצאת בקשה בכלל, ומוחזרת שגיאת offline.
 * (חשוב במיוחד לחיוב - לא שולחים חיוב כשאין ודאות שהבקשה תגיע.)
 */
export async function guardOnline<T>(isOnline: () => boolean, run: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  if (!isOnline()) return fail('offline');
  return attempt(run);
}

export const isOk = <T>(outcome: Outcome<T>): outcome is { kind: 'ok'; data: T } => outcome.kind === 'ok';
