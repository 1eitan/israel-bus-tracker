import { fail, ok, type Outcome } from '../core/outcome';
import { findSensitiveData } from '../core/sensitive';
import type {
  AddMethodSession,
  ChargeRequest,
  PaymentMethodRef,
  PaymentProvider,
  PaymentProviderStatus,
  PaymentResult,
  PaymentStatus,
  PaymentTransaction
} from './types';

export interface MockPaymentOptions {
  now?: () => number;
  /** תוצאות חיוב לפי סדר (ברירת מחדל: succeeded). לבדיקות וצילומי מסך. */
  chargeScript?: PaymentStatus[];
}

/**
 * ספק הדגמה: בזיכרון בלבד, לא נוגע בשום רשת ובשום כרטיס אמיתי, ו-isMock תמיד true.
 * הוא נוצר רק בבנייה לפיתוח (ראה providers/factory) ולעולם לא ב-release.
 * ה-UI חייב להציג "הדגמה" כשהוא פעיל.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = 'payment.mock';
  readonly isMock = true as const;

  private readonly now: () => number;
  private readonly script: PaymentStatus[];
  private methods: PaymentMethodRef[] = [];
  private readonly transactions: PaymentTransaction[] = [];
  private readonly byKey = new Map<string, PaymentResult>();
  private seq = 0;

  constructor(options: MockPaymentOptions = {}) {
    this.now = options.now ?? Date.now;
    this.script = [...(options.chargeScript ?? [])];
  }

  async getStatus(): Promise<Outcome<PaymentProviderStatus>> {
    return ok({ state: 'connected', vendor: 'mock', isMock: true });
  }

  async listMethods(): Promise<Outcome<PaymentMethodRef[]>> {
    return ok(this.methods.map((m) => ({ ...m })));
  }

  async beginAddMethod(): Promise<Outcome<AddMethodSession>> {
    this.seq += 1;
    return ok({ sessionId: `mock-session-${this.seq}`, kind: 'demo' });
  }

  /**
   * רק במוק: משלים "הוספה" מההדגמה. מקבל מטא-דאטה בלבד; כל ערך שנראה כמספר כרטיס/CVV נדחה,
   * כך שגם הדגמה לא מתרגלת שמירת נתונים רגישים.
   */
  simulateMethodAdded(ref: Omit<PaymentMethodRef, 'id'>): Outcome<PaymentMethodRef> {
    if (findSensitiveData(ref)) return fail('invalid_input', 'sensitive data rejected');
    if (!/^\d{4}$/.test(ref.last4)) return fail('invalid_input', 'last4 must be exactly 4 digits');
    this.seq += 1;
    const method: PaymentMethodRef = { ...ref, id: `mock-method-${this.seq}`, isDefault: this.methods.length === 0 };
    this.methods = [...this.methods, method];
    return ok(method);
  }

  async removeMethod(methodId: string): Promise<Outcome<void>> {
    if (!this.methods.some((m) => m.id === methodId)) return fail('invalid_input', 'unknown method');
    this.methods = this.methods.filter((m) => m.id !== methodId);
    if (this.methods.length > 0 && !this.methods.some((m) => m.isDefault)) {
      this.methods = this.methods.map((m, i) => (i === 0 ? { ...m, isDefault: true } : m));
    }
    return ok(undefined);
  }

  async charge(request: ChargeRequest): Promise<Outcome<PaymentResult>> {
    const repeated = this.byKey.get(request.idempotencyKey);
    if (repeated) return ok({ ...repeated });
    if (!request.idempotencyKey) return fail('invalid_input', 'idempotencyKey is required');
    if (!Number.isInteger(request.amountAgorot) || request.amountAgorot <= 0) {
      return fail('invalid_input', 'amount must be a positive integer (agorot)');
    }
    if (!this.methods.some((m) => m.id === request.methodId)) return fail('invalid_input', 'unknown method');

    this.seq += 1;
    const status = this.script.shift() ?? 'succeeded';
    const result: PaymentResult = {
      transactionId: `mock-tx-${this.seq}`,
      status,
      amountAgorot: request.amountAgorot,
      currency: request.currency
    };
    this.byKey.set(request.idempotencyKey, result);
    this.transactions.unshift({ ...result, createdAt: this.now(), description: request.description });
    return ok({ ...result });
  }

  async listTransactions(): Promise<Outcome<PaymentTransaction[]>> {
    return ok(this.transactions.map((t) => ({ ...t })));
  }
}
