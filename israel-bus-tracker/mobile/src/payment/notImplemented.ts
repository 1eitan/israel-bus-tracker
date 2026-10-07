import { notImplemented, ok, type Outcome } from '../core/outcome';
import type {
  AddMethodSession,
  ChargeRequest,
  PaymentMethodRef,
  PaymentProviderConfig,
  PaymentProviderStatus,
  PaymentResult,
  PaymentTransaction,
  RealPaymentProvider
} from './types';

export const PAYMENT_NOT_CONFIGURED_REASON = 'ספק הסליקה עדיין לא מחובר לאפליקציה. לא נשמר ולא נגבה שום מידע.';

/**
 * המימוש "האמיתי" כשאין ספק סליקה: כל פעולה מחזירה NOT_IMPLEMENTED.
 * כשיבחרו ספק - מחליפים מחלקה זו במימוש של RealPaymentProvider; ה-UI לא משתנה.
 */
export class NotImplementedPaymentProvider implements RealPaymentProvider {
  readonly id = 'payment.not_implemented';
  readonly isMock = false as const;
  readonly vendor = 'none';

  async getStatus(): Promise<Outcome<PaymentProviderStatus>> {
    return ok({ state: 'not_configured', vendor: null, isMock: false });
  }
  async configure(_config: PaymentProviderConfig): Promise<Outcome<void>> {
    return notImplemented('payment.configure', PAYMENT_NOT_CONFIGURED_REASON);
  }
  async listMethods(): Promise<Outcome<PaymentMethodRef[]>> {
    return notImplemented('payment.listMethods', PAYMENT_NOT_CONFIGURED_REASON);
  }
  async beginAddMethod(): Promise<Outcome<AddMethodSession>> {
    return notImplemented('payment.addMethod', PAYMENT_NOT_CONFIGURED_REASON);
  }
  async removeMethod(_methodId: string): Promise<Outcome<void>> {
    return notImplemented('payment.removeMethod', PAYMENT_NOT_CONFIGURED_REASON);
  }
  async charge(_request: ChargeRequest): Promise<Outcome<PaymentResult>> {
    return notImplemented('payment.charge', PAYMENT_NOT_CONFIGURED_REASON);
  }
  async listTransactions(): Promise<Outcome<PaymentTransaction[]>> {
    return notImplemented('payment.listTransactions', PAYMENT_NOT_CONFIGURED_REASON);
  }
}
