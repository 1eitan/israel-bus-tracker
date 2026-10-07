// נלקח מ-frontend/src/lib/format.ts (בלי מחלקות Tailwind ו-escapeHtml שרלוונטיים רק ל-web)
import { colors } from '../theme/tokens';

export type DelayTone = 'ontime' | 'late' | 'verylate' | 'early';

export interface DelayInfo {
  tone: DelayTone;
  label: string;
}

export function describeDelay(delaySeconds: number): DelayInfo {
  const minutes = Math.round(Math.abs(delaySeconds) / 60);
  if (Math.abs(delaySeconds) < 60) return { tone: 'ontime', label: 'בזמן' };
  if (delaySeconds > 0) {
    const label = minutes === 1 ? 'עיכוב של דקה' : `עיכוב של ${minutes} דקות`;
    return { tone: delaySeconds >= 300 ? 'verylate' : 'late', label };
  }
  return { tone: 'early', label: minutes === 1 ? 'מקדים בדקה' : `מקדים ב-${minutes} דקות` };
}

export const DELAY_TONE_COLORS: Record<DelayTone, string> = {
  ontime: colors.success,
  late: colors.warning,
  verylate: colors.danger,
  early: colors.info
};

export function minutesUntil(arrivalSeconds: number, nowMs: number): number {
  return Math.max(0, Math.ceil((arrivalSeconds - nowMs / 1000) / 60));
}

/** "1 דק׳" / "עכשיו" - מחושב מול השעון הנוכחי */
export function formatEtaText(arrivalSeconds: number, nowMs: number): string {
  const secondsLeft = arrivalSeconds - nowMs / 1000;
  if (secondsLeft <= 45) return 'עכשיו';
  return `${Math.ceil(secondsLeft / 60)} דק׳`;
}

export function formatClock(arrivalSeconds: number): string {
  return new Date(arrivalSeconds * 1000).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export type EtaTone = 'now' | 'soon' | 'normal' | 'late';

/** צבע סטטוס לזמן הגעה: עכשיו/קרוב בירוק, עיכוב בצהוב/אדום */
export function etaTone(arrivalSeconds: number, delaySeconds: number, nowMs: number): EtaTone {
  if (delaySeconds >= 300) return 'late';
  const minutes = (arrivalSeconds - nowMs / 1000) / 60;
  if (minutes <= 1) return 'now';
  if (minutes <= 5) return 'soon';
  return 'normal';
}

export const ETA_TONE_COLORS: Record<EtaTone, string> = {
  now: colors.success,
  soon: colors.success,
  normal: colors.text,
  late: colors.danger
};
