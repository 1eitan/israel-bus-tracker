/**
 * עזרי APDU (ISO/IEC 7816-4). אין כאן שום ידע ספציפי לרב-קו.
 *
 * READ-ONLY: אסור לכתוב לכרטיס. כל פקודה שעומדת להישלח חייבת לעבור assertReadOnlyApdu.
 * ה-allowlist הוא על קודי INS סטנדרטיים של קריאה בלבד ב-ISO 7816-4; הוא *אינו* מפרט של הרב-קו.
 * כל פקודה קונקרטית (AID, P1/P2, מספרי רשומות) חייבת לבוא ממפרט מאומת (ראה spec.ts), לא מניחוש.
 */
export const READ_ONLY_INS: ReadonlyMap<number, string> = new Map([
  [0xa4, 'SELECT'],
  [0xb0, 'READ BINARY'],
  [0xb2, 'READ RECORD'],
  [0xc0, 'GET RESPONSE'],
  [0xca, 'GET DATA']
]);

export class ForbiddenApduError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenApduError';
  }
}

/** זורק אם הפקודה אינה תקינה מבנית או שאינה פקודת קריאה מוכרת. */
export function assertReadOnlyApdu(apdu: readonly number[]): void {
  if (apdu.length < 4 || apdu.length > 261) throw new ForbiddenApduError('APDU length is invalid');
  if (!apdu.every((b) => Number.isInteger(b) && b >= 0 && b <= 0xff)) {
    throw new ForbiddenApduError('APDU contains non-byte values');
  }
  const ins = apdu[1];
  if (!READ_ONLY_INS.has(ins)) {
    throw new ForbiddenApduError(`INS 0x${ins.toString(16).padStart(2, '0')} is not an allowed read-only command`);
  }
}

export interface ParsedResponse {
  data: number[];
  sw1: number;
  sw2: number;
  /** SW כ-hex באותיות גדולות, למשל "9000" */
  sw: string;
}

const hex2 = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase();

export function bytesToHex(bytes: readonly number[]): string {
  return bytes.map(hex2).join('');
}

/** hex -> bytes; זורק על קלט לא תקין (אורך אי-זוגי / תווים לא hex) */
export function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) throw new Error('invalid hex string');
  return (clean.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16));
}

/** מפרק תשובת APDU. null אם התשובה קצרה מ-2 בתים (SW1 SW2 חובה) או מכילה ערכים לא-בייט. */
export function parseApduResponse(response: readonly number[]): ParsedResponse | null {
  if (response.length < 2) return null;
  if (!response.every((b) => Number.isInteger(b) && b >= 0 && b <= 0xff)) return null;
  const sw1 = response[response.length - 2];
  const sw2 = response[response.length - 1];
  return { data: response.slice(0, -2), sw1, sw2, sw: hex2(sw1) + hex2(sw2) };
}

export type SwClass = 'success' | 'more_data' | 'wrong_length' | 'not_found' | 'security' | 'not_supported' | 'other';

/** סיווג SW1/SW2 לפי ISO 7816-4 הכללי (לא ספציפי לכרטיס) */
export function classifySw(sw1: number, sw2: number): SwClass {
  if (sw1 === 0x90 && sw2 === 0x00) return 'success';
  if (sw1 === 0x61) return 'more_data';
  if (sw1 === 0x6c || (sw1 === 0x67 && sw2 === 0x00)) return 'wrong_length';
  if (sw1 === 0x6a && (sw2 === 0x82 || sw2 === 0x83)) return 'not_found';
  if (sw1 === 0x69 || (sw1 === 0x63 && sw2 !== 0x00) || (sw1 === 0x6a && sw2 === 0x86)) return 'security';
  if (sw1 === 0x6d || sw1 === 0x6e || (sw1 === 0x6a && sw2 === 0x81)) return 'not_supported';
  return 'other';
}

export const SW_MESSAGES_HE: Record<SwClass, string> = {
  success: 'הצלחה',
  more_data: 'יש עוד נתונים',
  wrong_length: 'אורך פקודה שגוי',
  not_found: 'הקובץ/היישום לא נמצא בכרטיס',
  security: 'הגישה נדחתה (תנאי אבטחה)',
  not_supported: 'הפקודה אינה נתמכת בכרטיס',
  other: 'הכרטיס החזיר סטטוס לא צפוי'
};
