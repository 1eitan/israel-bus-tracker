import { useCallback, useEffect, useState } from 'react';

import type { AppFailure, Outcome } from '../core/outcome';
import { useServices } from '../providers/context';
import type { AddMethodSession, PaymentMethodRef } from '../payment/types';

export type PaymentUiState =
  | { phase: 'loading' }
  /** אין ספק סליקה - NOT_IMPLEMENTED. ה-UI מוכן לחיבור */
  | { phase: 'not_configured'; reason: string }
  | { phase: 'ready'; methods: PaymentMethodRef[]; isMock: boolean }
  | { phase: 'error'; failure: AppFailure; isMock: boolean };

export function usePayment() {
  const { payment, paymentLauncher } = useServices();
  const [state, setState] = useState<PaymentUiState>({ phase: 'loading' });

  const load = useCallback(async () => {
    setState({ phase: 'loading' });
    const status = await payment.getStatus();
    if (status.kind === 'error') return setState({ phase: 'error', failure: status.error, isMock: payment.isMock });
    if (status.kind === 'not_implemented' || status.data.state === 'not_configured') {
      return setState({ phase: 'not_configured', reason: 'ספק הסליקה עדיין לא מחובר לאפליקציה.' });
    }
    const methods = await payment.listMethods();
    if (methods.kind === 'ok') return setState({ phase: 'ready', methods: methods.data, isMock: payment.isMock });
    if (methods.kind === 'error') return setState({ phase: 'error', failure: methods.error, isMock: payment.isMock });
    return setState({ phase: 'not_configured', reason: methods.reason });
  }, [payment]);

  useEffect(() => {
    void load();
  }, [load]);

  /** התחלת הוספת אמצעי תשלום. מחזיר את התוצאה כדי שה-UI יציג הודעה מתאימה. */
  const addMethod = useCallback(async (): Promise<Outcome<AddMethodSession>> => {
    const session = await payment.beginAddMethod();
    if (session.kind !== 'ok' || session.data.kind === 'demo') return session;
    const launched = await paymentLauncher.launch(session.data);
    if (launched.kind !== 'ok') return launched as Outcome<never>;
    await load();
    return session;
  }, [payment, paymentLauncher, load]);

  return { state, reload: load, addMethod, isMock: payment.isMock };
}
