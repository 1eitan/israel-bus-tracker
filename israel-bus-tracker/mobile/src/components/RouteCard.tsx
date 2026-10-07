import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { forwardChevron } from '../lib/rtl';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import ArrivalBadge from './ArrivalBadge';
import FavoriteButton from './FavoriteButton';
import LineBadge from './LineBadge';
import PressableScale from './PressableScale';
import StatusBadge, { type StatusKind } from './StatusBadge';

export interface RouteCardProps {
  routeNumber: string;
  destination: string;
  /** שם המפעיל (אגד, דן...) */
  operator?: string;
  /** כיוון / מוצא-יעד */
  direction?: string;
  /** מספר תחנות במסלול */
  stopsCount?: number;
  /** "3 דק׳" - אם אין, לא מוצג */
  eta?: string;
  etaColor?: string;
  status?: { label: string; kind: StatusKind };
  badgeColor?: string;
  badgeTextColor?: string;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
}

/** כרטיס קו: מספר קו גדול, יעד, מפעיל, כיוון, תחנות, זמן הגעה וסטטוס. */
export default function RouteCard({
  routeNumber,
  destination,
  operator,
  direction,
  stopsCount,
  eta,
  etaColor,
  status,
  badgeColor,
  badgeTextColor,
  favorite,
  onToggleFavorite,
  onPress
}: RouteCardProps) {
  const meta = [operator, direction, stopsCount !== undefined ? `${stopsCount} תחנות` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`קו ${routeNumber} ל${destination}${eta ? `, מגיע ${eta}` : ''}${status ? `, ${status.label}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.99}
      style={styles.card}
    >
      <LineBadge routeNumber={routeNumber} color={badgeColor} textColor={badgeTextColor} size="lg" />

      <View style={styles.center}>
        <AppText variant="heading" numberOfLines={1}>
          {destination}
        </AppText>
        {meta ? (
          <AppText variant="caption" numberOfLines={2}>
            {meta}
          </AppText>
        ) : null}
        {status ? <StatusBadge label={status.label} kind={status.kind} /> : null}
      </View>

      <View style={styles.end}>
        {eta ? <ArrivalBadge label={eta} kind="now" color={etaColor} /> : null}
        {onToggleFavorite ? (
          <FavoriteButton active={!!favorite} onToggle={onToggleFavorite} name={`קו ${routeNumber}`} />
        ) : onPress ? (
          <Ionicons name={forwardChevron()} size={18} color={colors.textSecondary} />
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  center: { flex: 1, gap: space(1) },
  end: { alignItems: 'flex-end', gap: space(1) }
});
