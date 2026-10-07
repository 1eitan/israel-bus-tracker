import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import { nfcManagerDriver } from '../nfc/driver';
import { checkCapability, scanCard } from '../nfc/scan';
import { VERIFIED_RAVKAV_SPEC } from '../nfc/spec';
import { initialNfcState, nfcReducer } from '../nfc/state';

export type { NfcPhase } from '../nfc/state';

/**
 * NFC לקריאה בלבד. הלוגיקה כולה ב-src/nfc (נבדקת ב-tests/nfc.test.ts); ההוק רק מחבר React.
 * אין מפרט מאומת => לא נשלח שום APDU (ראה nfc/spec.ts).
 */
export function useNfc() {
  const [state, dispatch] = useReducer(nfcReducer, initialNfcState);
  const controller = useRef<AbortController | null>(null);

  const refreshSupport = useCallback(async () => {
    dispatch({ type: 'capability', capability: await checkCapability(nfcManagerDriver) });
  }, []);

  useEffect(() => {
    void refreshSupport();
    // חזרה מהגדרות המכשיר (אחרי הפעלת NFC) - בודקים מחדש
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshSupport();
    });
    return () => {
      sub.remove();
      controller.current?.abort();
      void nfcManagerDriver.cancel();
    };
  }, [refreshSupport]);

  const start = useCallback(async () => {
    if (state.phase === 'disabled') {
      await nfcManagerDriver.openSettings().catch(() => undefined);
      return;
    }
    if (state.phase !== 'ready' && state.phase !== 'done' && state.phase !== 'error') return;

    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    dispatch({ type: 'scan_started' });
    const result = await scanCard(nfcManagerDriver, VERIFIED_RAVKAV_SPEC, {
      signal: ctl.signal,
      onReading: () => dispatch({ type: 'reading' })
    });
    if (controller.current !== ctl) return; // סריקה חדשה/ביטול החליפו אותה
    if (result.kind === 'ok') dispatch({ type: 'scan_succeeded', scan: result.data });
    else if (result.kind === 'error') dispatch({ type: 'scan_failed', failure: result.error });
    else dispatch({ type: 'cancel' });
  }, [state.phase]);

  const cancel = useCallback(() => {
    controller.current?.abort();
    dispatch({ type: 'cancel' });
  }, []);

  return { state, start, cancel, refreshSupport };
}
