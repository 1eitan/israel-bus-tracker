import type { KeyValueStore } from './store';

/**
 * הגנה מפני שמירת נתוני כרטיס אשראי / סודות.
 * האפליקציה אף פעם לא אוספת מספר כרטיס, CVV או מפתחות סודיים; זו רשת ביטחון שמוודאת
 * שגם בטעות (באג, אובייקט שהגיע מספק) דבר כזה לא נכתב לאחסון.
 */
const SENSITIVE_KEY = /(card.?number|^pan$|cvv|cvc|cvn|security.?code|secret|private.?key|password|passcode|pin$|^track[12]$)/i;

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** מחרוזת שנראית כמספר כרטיס: 13-19 ספרות (אולי עם רווחים/מקפים) שעוברות Luhn */
export function looksLikeCardNumber(text: string): boolean {
  const compact = text.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(compact)) return false;
  return luhn(compact);
}

/** מחפש רקורסיבית מפתח רגיש או ערך שנראה כמספר כרטיס. מחזיר נתיב לממצא הראשון, או null. */
export function findSensitiveData(value: unknown, path = '$', depth = 0): string | null {
  if (depth > 8 || value === null || value === undefined) return null;
  if (typeof value === 'string') return looksLikeCardNumber(value) ? path : null;
  // מספרים (למשל חותמות זמן במילישניות, 13 ספרות) לא נבדקים: ~10% מהם עוברים Luhn במקרה.
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findSensitiveData(value[i], `${path}[${i}]`, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) return `${path}.${key}`;
      const hit = findSensitiveData(inner, `${path}.${key}`, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

export class SensitiveDataError extends Error {
  constructor(readonly where: string) {
    super(`refusing to persist sensitive data at ${where}`);
    this.name = 'SensitiveDataError';
  }
}

/** עוטף אחסון: כל כתיבה שמכילה נתון רגיש נדחית (זורקת) ולא נשמרת. */
export function createGuardedStore(inner: KeyValueStore): KeyValueStore {
  return {
    getItem: (key) => inner.getItem(key),
    removeItem: (key) => inner.removeItem(key),
    async setItem(key, value) {
      let parsed: unknown = value;
      try {
        parsed = JSON.parse(value);
      } catch {
        /* לא JSON - בודקים כמחרוזת */
      }
      // הערך הגולמי כולו (למשל "4111111111111111" שהוא גם JSON תקין של מספר) נבדק בנפרד,
      // כי מספרים מקוננים לא נבדקים (ראה findSensitiveData). מגבלה ידועה: מספר כרטיס שנכתב
      // כמספר מקונן תחת מפתח תמים לא ייתפס; מפתחות רגישים (pan/cvv/cardNumber...) כן.
      if (looksLikeCardNumber(value)) throw new SensitiveDataError('$');
      const hit = findSensitiveData(parsed);
      if (hit) throw new SensitiveDataError(hit);
      await inner.setItem(key, value);
    }
  };
}
