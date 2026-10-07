import type { ArrivalRowProps } from '../components/ArrivalRow';
import { colors } from '../theme/tokens';
import type { Arrival } from '../types/bus';
import { describeDelay, ETA_TONE_COLORS, etaTone, formatEtaText } from './format';

/** ממיר הגעה מה-API לנתוני שורת הצגה (זמן, צבע סטטוס, הערת עיכוב). */
export function toArrivalRow(arrival: Arrival, nowMs: number, onPress?: () => void): ArrivalRowProps {
  const delay = describeDelay(arrival.delaySeconds);
  const late = delay.tone === 'late' || delay.tone === 'verylate';
  return {
    routeNumber: arrival.routeShortName,
    destination: arrival.headsign || `קו ${arrival.routeShortName}`,
    eta: formatEtaText(arrival.arrivalTime, nowMs),
    etaColor: ETA_TONE_COLORS[etaTone(arrival.arrivalTime, arrival.delaySeconds, nowMs)],
    badgeColor: arrival.routeColor || colors.routeFallback,
    badgeTextColor: arrival.routeTextColor || colors.onPrimary,
    note: late ? delay.label : undefined,
    noteColor: delay.tone === 'verylate' ? colors.danger : colors.warning,
    onPress
  };
}
