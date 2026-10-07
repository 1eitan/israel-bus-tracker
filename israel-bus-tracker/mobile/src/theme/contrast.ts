/**
 * עזרי ניגודיות (WCAG 2.1). פונקציות טהורות בלי תלות ב-React Native, ולכן נבדקות ב-`npm test`.
 */
import { colors } from './tokens';

/** יחס ניגודיות מינימלי ל-AA: טקסט רגיל / טקסט גדול (18px+ או 14px+ מודגש) ורכיבי UI */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** luminance יחסי (0..1). צבע לא תקין => null */
export function luminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** יחס ניגודיות בין שני צבעי hex (1..21). צבע לא תקין => null */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * צבע טקסט קריא (לבן או כהה) על רקע נתון, לפי הניגודיות הגבוהה יותר.
 * משמש לתגי קו עם צבע שמגיע מהשרת. צבע לא תקין => ברירת המחדל onPrimary.
 */
export function readableTextOn(background: string): string {
  const white = contrastRatio(background, colors.onPrimary);
  const dark = contrastRatio(background, colors.background);
  if (white === null || dark === null) return colors.onPrimary;
  return white >= dark ? colors.onPrimary : colors.background;
}

/** צבע hex עם שקיפות (0..1) כ-rgba. צבע לא תקין => null */
export function withAlpha(hex: string, alpha: number): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}
