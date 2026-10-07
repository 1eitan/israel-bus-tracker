import type { AppFailure } from '../core/outcome';
import type { CardScan, Capability } from './scan';

export type NfcPhase =
  | 'checking'
  | 'unsupported'
  | 'disabled'
  | 'not_implemented'
  | 'ready'
  | 'waiting' // ממתין שהכרטיס יוצמד
  | 'reading' // הכרטיס זוהה, קורא
  | 'done'
  | 'error';

export interface NfcState {
  phase: NfcPhase;
  scan: CardScan | null;
  failure: AppFailure | null;
  /** הסבר כש-phase = not_implemented */
  reason: string | null;
}

export type NfcEvent =
  | { type: 'capability'; capability: Capability }
  | { type: 'scan_started' }
  | { type: 'reading' }
  | { type: 'scan_succeeded'; scan: CardScan }
  | { type: 'scan_failed'; failure: AppFailure }
  | { type: 'cancel' };

export const initialNfcState: NfcState = { phase: 'checking', scan: null, failure: null, reason: null };

const SCANNING: ReadonlySet<NfcPhase> = new Set(['waiting', 'reading']);

/**
 * מכונת מצבים של NFC. אירועים שלא מתאימים למצב הנוכחי מתעלמים (למשל תוצאת סריקה שהגיעה
 * אחרי שהמשתמש ביטל) - כך אין "קפיצות" מצב ואין הצגת תוצאה אחרי ביטול.
 */
export function nfcReducer(state: NfcState, event: NfcEvent): NfcState {
  switch (event.type) {
    case 'capability': {
      const c = event.capability;
      // לא מפריעים לסריקה פעילה ולא מוחקים תוצאה שמוצגת
      if (SCANNING.has(state.phase) || state.phase === 'done') return state;
      // אחרי שגיאת סריקה: מציגים שינוי רק אם ה-NFC עצמו הפסיק להיות זמין
      if (state.phase === 'error' && c.kind === 'ready') return state;
      switch (c.kind) {
        case 'ready':
          return { phase: 'ready', scan: null, failure: null, reason: null };
        case 'unsupported':
          return { phase: 'unsupported', scan: null, failure: null, reason: null };
        case 'disabled':
          return { phase: 'disabled', scan: null, failure: null, reason: null };
        case 'not_implemented':
          return { phase: 'not_implemented', scan: null, failure: null, reason: c.reason };
        case 'error':
          return { phase: 'error', scan: null, failure: c.failure, reason: null };
      }
      return state;
    }
    case 'scan_started':
      if (state.phase === 'ready' || state.phase === 'done' || state.phase === 'error') {
        return { phase: 'waiting', scan: null, failure: null, reason: null };
      }
      return state;
    case 'reading':
      return state.phase === 'waiting' ? { ...state, phase: 'reading' } : state;
    case 'scan_succeeded':
      return SCANNING.has(state.phase) ? { phase: 'done', scan: event.scan, failure: null, reason: null } : state;
    case 'scan_failed':
      if (!SCANNING.has(state.phase)) return state;
      if (event.failure.code === 'cancelled') return { phase: 'ready', scan: null, failure: null, reason: null };
      return { phase: 'error', scan: null, failure: event.failure, reason: null };
    case 'cancel':
      return SCANNING.has(state.phase) ? { phase: 'ready', scan: null, failure: null, reason: null } : state;
  }
  return state;
}
