import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatClock } from '../lib/format';
import { formatDistance } from '../lib/geo';
import type { Itinerary, Leg } from '../routing/types';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import DemoBadge from './DemoBadge';
import StatusBadge from './StatusBadge';

const minutes = (sec: number): string => `${Math.max(1, Math.round(sec / 60))} דק׳`;

function legLabel(leg: Leg): string {
  return leg.type === 'walk'
    ? `הליכה ${minutes(leg.durationSec)} · ${formatDistance(leg.distanceM)}`
    : `קו ${leg.routeShortName}${leg.headsign ? ` לכיוון ${leg.headsign}` : ''}`;
}

interface Props {
  itinerary: Itinerary;
}

/** כרטיס מסלול. מסלול מ-Mock מסומן "הדגמה" ואינו מוצג כאמיתי; זמן אמת מוצג רק כשהנתון קיים. */
export default function ItineraryCard({ itinerary }: Props) {
  const demo = itinerary.source === 'mock';
  return (
    <View style={styles.card} accessible accessibilityLabel={`מסלול, ${minutes(itinerary.durationSec)}, ${itinerary.transfers} החלפות${demo ? ', הדגמה' : ''}`}>
      <View style={styles.header}>
        <AppText variant="eta">{minutes(itinerary.durationSec)}</AppText>
        <AppText variant="caption" style={styles.times}>
          {formatClock(itinerary.startTime / 1000)} - {formatClock(itinerary.endTime / 1000)}
        </AppText>
        {demo ? <DemoBadge label="הדגמה - לא מסלול אמיתי" /> : null}
      </View>
      <AppText variant="caption">
        {itinerary.transfers === 0 ? 'ללא החלפות' : `${itinerary.transfers} החלפות`} · הליכה {formatDistance(itinerary.walkingDistanceM)} ·{' '}
        {formatDistance(itinerary.distanceM)}
      </AppText>
      <View style={styles.legs}>
        {itinerary.legs.map((leg, index) => (
          <View key={`${itinerary.id}-${index}`} style={styles.leg}>
            <Ionicons name={leg.type === 'walk' ? 'walk-outline' : 'bus-outline'} size={18} color={colors.primaryText} />
            <AppText variant="body" style={styles.legText}>
              {legLabel(leg)}
            </AppText>
          </View>
        ))}
      </View>
      {itinerary.realTime ? <StatusBadge label="זמן אמת" kind="success" /> : null}
      {itinerary.disruptions.map((d) => (
        <View key={d.id} style={styles.disruption}>
          <Ionicons name="warning-outline" size={16} color={d.severity === 'severe' ? colors.danger : colors.warning} />
          <AppText variant="caption" style={styles.legText}>
            {d.message}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space(2), padding: space(4), borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: space(3), flexWrap: 'wrap' },
  times: { flex: 1 },
  legs: { gap: space(2), marginTop: space(1) },
  leg: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  legText: { flex: 1 },
  disruption: { flexDirection: 'row', alignItems: 'center', gap: space(2), padding: space(2), borderRadius: radius.md, backgroundColor: colors.surfaceElevated }
});
