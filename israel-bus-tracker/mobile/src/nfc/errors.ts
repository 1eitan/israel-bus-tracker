import { failure, type AppFailure } from '../core/outcome';

/**
 * סיווג שגיאות מ-react-native-nfc-manager.
 * שים לב: הספרייה מעבירה הודעות טקסט מהמערכת (Android/iOS) ללא קודי שגיאה קבועים, ולכן הסיווג הוא
 * heuristic לפי תוכן ההודעה. מה שלא מזוהה הופך ל-'unknown' עם ההודעה המקורית ב-cause. לא אומת על מכשיר.
 */
export class NfcTimeoutError extends Error {
  constructor(what: string) {
    super(`NFC timeout: ${what}`);
    this.name = 'NfcTimeoutError';
  }
}

export class NfcCancelledError extends Error {
  constructor() {
    super('NFC cancelled');
    this.name = 'NfcCancelledError';
  }
}

export function classifyNfcError(error: unknown): AppFailure {
  if (error instanceof NfcCancelledError) return failure('cancelled');
  if (error instanceof NfcTimeoutError) return failure('timeout', error.message);
  const message = error instanceof Error ? error.message : String(error);
  if (/cancel|user.?cancel|session.?invalidated/i.test(message)) return failure('cancelled', message);
  if (/time.?out|timed.?out/i.test(message)) return failure('timeout', message);
  if (/\btag\b[^.]*\b(lost|removed|gone)\b|\b(lost|removed)\b[^.]*\btag\b|taglost|out.?of.?date|connection.?lost|transceive.?failed|no.?tag/i.test(message)) {
    return failure('tag_lost', message);
  }
  if (/not.?supported|unsupported|not.?available|disabled|nfc.*off/i.test(message)) return failure('unavailable', message);
  return failure('unknown', message);
}
