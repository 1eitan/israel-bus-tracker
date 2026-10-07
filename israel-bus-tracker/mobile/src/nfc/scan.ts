import { fail, ok, notImplemented, type AppFailure, type Outcome } from '../core/outcome';
import {
  ForbiddenApduError,
  SW_MESSAGES_HE,
  assertReadOnlyApdu,
  bytesToHex,
  classifySw,
  parseApduResponse,
  type ParsedResponse
} from './apdu';
import { NfcCancelledError, NfcTimeoutError, classifyNfcError } from './errors';
import {
  NO_SPEC_REASON,
  type BalanceInfo,
  type CardHistoryEntry,
  type DiscountProfileInfo,
  type RavKavSpec
} from './spec';

export interface NfcTag {
  id?: string | null;
  techTypes?: string[];
}

/** הפשטה של react-native-nfc-manager. המימוש האמיתי ב-driver.ts; בבדיקות משתמשים ב-fake. */
export interface NfcDriver {
  readonly platform: 'android' | 'ios' | 'other';
  isSupported(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  start(): Promise<void>;
  /** ממתין לכרטיס ומתחבר אליו כ-ISO-DEP. אינו שולח שום פקודה. */
  requestIsoDep(alertMessage: string): Promise<void>;
  getTag(): Promise<NfcTag | null>;
  transceive(apdu: number[]): Promise<number[]>;
  /** משחרר את החיבור / מבטל המתנה. חייב להיות בטוח לקריאה חוזרת. */
  cancel(): Promise<void>;
  openSettings(): Promise<void>;
}

export type Capability =
  | { kind: 'ready' }
  | { kind: 'unsupported' }
  | { kind: 'disabled' }
  | { kind: 'not_implemented'; reason: string }
  | { kind: 'error'; failure: AppFailure };

export const IOS_NOT_IMPLEMENTED_REASON =
  'קריאת כרטיס ב-iPhone דורשת הצהרת AID מאומת במפרט, ולכן אינה מוטמעת.';

export async function checkCapability(driver: NfcDriver): Promise<Capability> {
  if (driver.platform === 'ios') return { kind: 'not_implemented', reason: IOS_NOT_IMPLEMENTED_REASON };
  try {
    if (!(await driver.isSupported())) return { kind: 'unsupported' };
    await driver.start();
    return (await driver.isEnabled()) ? { kind: 'ready' } : { kind: 'disabled' };
  } catch (error) {
    return { kind: 'error', failure: classifyNfcError(error) };
  }
}

export type CardType = 'ravkav' | 'unverified_iso_dep' | 'not_ravkav';

export interface CardScan {
  uid: string | null;
  techTypes: string[];
  /** unverified_iso_dep = זוהה כרטיס NFC, אך לא אומת שהוא רב-קו (אין מפרט) */
  cardType: CardType;
  specSource: string | null;
  balance: Outcome<BalanceInfo>;
  profile: Outcome<DiscountProfileInfo>;
  history: Outcome<CardHistoryEntry[]>;
  /** SW שהתקבל לכל צעד, לדיבוג בלבד */
  stepLog: { id: string; sw: string }[];
  readonly readOnly: true;
}

export interface ScanOptions {
  /** כמה זמן ממתינים שהכרטיס יוצמד */
  waitTimeoutMs?: number;
  /** timeout לכל פקודה */
  apduTimeoutMs?: number;
  signal?: AbortSignal;
  /** נקרא כשהכרטיס זוהה והקריאה מתחילה */
  onReading?: () => void;
}

export const DEFAULT_WAIT_TIMEOUT_MS = 30_000;
export const DEFAULT_APDU_TIMEOUT_MS = 5_000;
const MAX_STEPS = 32;

/** מחכה ל-promise עם timeout וביטול. אחרי timeout/ביטול ה-promise המקורי נשאר "נבלע" (ה-driver.cancel ישחרר אותו). */
export function guarded<T>(promise: Promise<T>, ms: number, what: string, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      settle();
    };
    const onAbort = () => finish(() => reject(new NfcCancelledError()));
    const timer = setTimeout(() => finish(() => reject(new NfcTimeoutError(what))), ms);
    if (signal?.aborted) return finish(() => reject(new NfcCancelledError()));
    signal?.addEventListener('abort', onAbort);
    promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error))
    );
  });
}

const notImplementedFor = (feature: string): Outcome<never> => notImplemented(feature, NO_SPEC_REASON);

function unidentified<T>(): Outcome<T> {
  return fail('unavailable', 'card not identified as Rav-Kav', 'הכרטיס לא זוהה כרב-קו.');
}

/**
 * קריאת כרטיס (READ ONLY).
 *  - בלי מפרט מאומת: מתחברים לכרטיס, קוראים UID, ולא שולחים אף APDU. יתרה/פרופיל/היסטוריה = NOT_IMPLEMENTED.
 *  - עם מפרט: כל צעד עובר assertReadOnlyApdu לפני כל שליחה (נבדקים *כולם* לפני שמחכים לכרטיס).
 *  - תמיד משחררים את החיבור בסוף (גם בביטול / timeout / שגיאה).
 */
export async function scanCard(
  driver: NfcDriver,
  spec: RavKavSpec | null,
  options: ScanOptions = {}
): Promise<Outcome<CardScan>> {
  const { waitTimeoutMs = DEFAULT_WAIT_TIMEOUT_MS, apduTimeoutMs = DEFAULT_APDU_TIMEOUT_MS, signal } = options;

  if (driver.platform === 'ios') return notImplemented('nfc.scan', IOS_NOT_IMPLEMENTED_REASON);

  if (spec) {
    try {
      if (spec.readPlan.length === 0 || spec.readPlan.length > MAX_STEPS) throw new ForbiddenApduError('invalid read plan size');
      spec.readPlan.forEach((step) => assertReadOnlyApdu(step.apdu));
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      return fail('unavailable', cause, 'מפרט הקריאה אינו תקין. לא נשלחה אף פקודה לכרטיס.');
    }
  }

  try {
    await guarded(driver.requestIsoDep('הצמד את כרטיס הרב-קו לגב המכשיר'), waitTimeoutMs, 'waiting for card', signal);
    options.onReading?.();

    const tag = await guarded(driver.getTag(), apduTimeoutMs, 'reading tag', signal);
    const uid = tag?.id ? String(tag.id).toUpperCase() : null;
    const techTypes = tag?.techTypes ?? [];

    if (!spec) {
      return ok({
        uid,
        techTypes,
        cardType: 'unverified_iso_dep',
        specSource: null,
        balance: notImplementedFor('nfc.balance'),
        profile: notImplementedFor('nfc.profile'),
        history: notImplementedFor('nfc.history'),
        stepLog: [],
        readOnly: true
      });
    }

    const responses = new Map<string, ParsedResponse>();
    const stepLog: { id: string; sw: string }[] = [];
    for (const step of spec.readPlan) {
      const raw = await guarded(driver.transceive([...step.apdu]), apduTimeoutMs, `step ${step.id}`, signal);
      const parsed = parseApduResponse(raw);
      if (!parsed) return fail('apdu_failed', `step ${step.id}: malformed response ${bytesToHex(raw)}`);
      stepLog.push({ id: step.id, sw: parsed.sw });
      responses.set(step.id, parsed);
      const swClass = classifySw(parsed.sw1, parsed.sw2);
      if (swClass !== 'success' && step.required !== false) {
        return fail('apdu_failed', `step ${step.id}: SW=${parsed.sw}`, SW_MESSAGES_HE[swClass]);
      }
    }

    if (!spec.identify(responses)) {
      return ok({
        uid,
        techTypes,
        cardType: 'not_ravkav',
        specSource: spec.source,
        balance: unidentified(),
        profile: unidentified(),
        history: unidentified(),
        stepLog,
        readOnly: true
      });
    }

    return ok({
      uid,
      techTypes,
      cardType: 'ravkav',
      specSource: spec.source,
      balance: spec.parseBalance(responses),
      profile: spec.parseProfile ? spec.parseProfile(responses) : notImplementedFor('nfc.profile'),
      history: spec.parseHistory ? spec.parseHistory(responses) : notImplementedFor('nfc.history'),
      stepLog,
      readOnly: true
    });
  } catch (error) {
    return { kind: 'error', error: classifyNfcError(error) };
  } finally {
    await driver.cancel().catch(() => undefined);
  }
}
