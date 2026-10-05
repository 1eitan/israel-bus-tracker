export type DelayTone = 'ontime' | 'late' | 'verylate' | 'early';

export interface DelayInfo {
  tone: DelayTone;
  label: string;
}

/** מתרגם עיכוב בשניות לטקסט וסוג סטטוס */
export function describeDelay(delaySeconds: number): DelayInfo {
  const minutes = Math.round(Math.abs(delaySeconds) / 60);
  if (Math.abs(delaySeconds) < 60) {
    return { tone: 'ontime', label: 'בזמן' };
  }
  if (delaySeconds > 0) {
    const label = minutes === 1 ? 'עיכוב של דקה' : `עיכוב של ${minutes} דקות`;
    return { tone: delaySeconds >= 300 ? 'verylate' : 'late', label };
  }
  return {
    tone: 'early',
    label: minutes === 1 ? 'מקדים בדקה' : `מקדים ב-${minutes} דקות`
  };
}

export const DELAY_TONE_CLASSES: Record<DelayTone, string> = {
  ontime:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/20',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/20',
  verylate: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/20',
  early: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 ring-sky-500/20'
};

/** דקות עד הגעה מחושבות מול השעון הנוכחי (שניות Unix) */
export function minutesUntil(arrivalSeconds: number, nowMs: number): number {
  return Math.max(0, Math.ceil((arrivalSeconds - nowMs / 1000) / 60));
}

export function formatEta(arrivalSeconds: number, nowMs: number): { value: string; unit: string } {
  const secondsLeft = arrivalSeconds - nowMs / 1000;
  if (secondsLeft <= 45) {
    return { value: 'עכשיו', unit: '' };
  }
  const minutes = Math.ceil(secondsLeft / 60);
  return { value: String(minutes), unit: 'דק׳' };
}

export function formatClock(arrivalSeconds: number): string {
  return new Date(arrivalSeconds * 1000).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatSpeed(speedKmh: number): string {
  return `${Math.round(speedKmh)} קמ״ש`;
}

export function secondsAgo(timestampSeconds: number, nowMs: number): number {
  return Math.max(0, Math.round(nowMs / 1000 - timestampSeconds));
}

/** מקצר מחרוזת ארוכה בלי לחתוך באמצע מילה */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
