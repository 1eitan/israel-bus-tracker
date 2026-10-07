import type { Outcome } from '../core/outcome';

/**
 * שכבת תשלום.
 *
 * עקרונות אבטחה (לא להתפשר):
 *  - האפליקציה אף פעם לא רואה, מעבירה או שומרת מספר כרטיס / CVV / תוקף מלא. הזנת כרטיס מתבצעת רק
 *    בתוך רכיב/SDK של ספק הסליקה (PCI), שמחזיר טוקן + מטא-דאטה בטוחה (מותג, 4 ספרות אחרונות).
 *  - מפתחות סודיים (secret keys) אינם באפליקציה. רק מפתח ציבורי (publishable) מותר בקונפיגורציה.
 *  - אין הצלחה מדומה: בלי ספק מחובר כל פעולה מחזירה NOT_IMPLEMENTED.
 *  - חיוב לא נשלח ללא רשת, ולא מנסים אותו שוב אוטומטית. כל חיוב נושא idempotencyKey.
 */

/** מה שהספק מחזיר על אמצעי תשלום שמור - בלי נתונים רגישים. */
export interface PaymentMethodRef {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
}

export interface PaymentProviderStatus {
  state: 'connected' | 'not_configured';
  vendor: string | null;
  isMock: boolean;
}

/**
 * הפעלת תהליך הוספת אמצעי תשלום. ה-launchToken קצר-חיים, מיועד להעברה ל-SDK של הספק בלבד,
 * נשמר בזיכרון בלבד ואסור לשמור אותו בדיסק או ללוג.
 */
export interface AddMethodSession {
  sessionId: string;
  kind: 'vendor_sdk' | 'hosted_page' | 'demo';
  launchToken?: string;
}

export interface ChargeRequest {
  /** מפתח ייחודי לחיוב; אותו מפתח לא יחויב פעמיים */
  idempotencyKey: string;
  /** באגורות, מספר שלם חיובי */
  amountAgorot: number;
  currency: 'ILS';
  methodId: string;
  description: string;
}

export type PaymentStatus = 'succeeded' | 'requires_action' | 'declined' | 'pending';

export interface PaymentResult {
  transactionId: string;
  status: PaymentStatus;
  amountAgorot: number;
  currency: 'ILS';
}

export interface PaymentTransaction extends PaymentResult {
  createdAt: number;
  description: string;
}

export interface PaymentProvider {
  readonly id: string;
  /** true = נתוני הדגמה; ה-UI חייב לסמן זאת בבירור */
  readonly isMock: boolean;
  getStatus(): Promise<Outcome<PaymentProviderStatus>>;
  listMethods(): Promise<Outcome<PaymentMethodRef[]>>;
  beginAddMethod(): Promise<Outcome<AddMethodSession>>;
  removeMethod(methodId: string): Promise<Outcome<void>>;
  charge(request: ChargeRequest): Promise<Outcome<PaymentResult>>;
  listTransactions(): Promise<Outcome<PaymentTransaction[]>>;
}

export interface PaymentProviderConfig {
  /** מפתח ציבורי בלבד (publishable). לעולם לא secret key. */
  publishableKey: string;
  merchantId?: string;
}

/** חוזה לחיבור ספק סליקה אמיתי (Stripe/Tranzila/CardCom וכו') - מי שמממש חייב לכבד את עקרונות האבטחה למעלה. */
export interface RealPaymentProvider extends PaymentProvider {
  readonly isMock: false;
  readonly vendor: string;
  configure(config: PaymentProviderConfig): Promise<Outcome<void>>;
}

/**
 * נקודת החיבור ל-SDK של הספק (גיליון הזנת כרטיס בבעלות הספק). ה-UI קורא ל-launch אחרי beginAddMethod,
 * והכרטיס מוזן רק בתוך ה-SDK. בלי SDK מחובר: NOT_IMPLEMENTED.
 */
export interface AddMethodLauncher {
  launch(session: AddMethodSession): Promise<Outcome<void>>;
}
