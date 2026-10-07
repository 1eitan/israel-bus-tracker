import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { forwardChevron } from '../lib/rtl';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import ArrivalRow, { type ArrivalRowProps } from './ArrivalRow';
import FavoriteButton from './FavoriteButton';
import LineBadge from './LineBadge';
import PressableScale from './PressableScale';

export interface StationCardProps {
  name: string;
  /** מספר/קוד תחנה */
  code?: string;
  /** מרחק מפורמט, למשל "120 מ׳" */
  distance?: string;
  /** מספרי הקווים שעוצרים בתחנה */
  lines?: string[];
  arrivals: ArrivalRowProps[];
  favorite: boolean;
  onToggleFavorite: () => void;
  onPress?: () => void;
  /** מס' הגעות מקסימלי להצגה בכרטיס */
  maxArrivals?: number;
}

/** כרטיס תחנה: שם, מספר, מרחק, קווים, הגעות קרובות, מועדף וחץ. */
export default function StationCard({
  name,
  code,
  distance,
  lines,
  arrivals,
  favorite,
  onToggleFavorite,
  onPress,
  maxArrivals = 3
}: StationCardProps) {
  const meta = [code ? `תחנה ${code}` : null, distance].filter(Boolean).join(' · ');
  const shown = arrivals.slice(0, maxArrivals);
  const uniqueLines = lines ? [...new Set(lines)].slice(0, 8) : [];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`תחנה ${name}${distance ? `, ${distance}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.99}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.pin}>
          <Ionicons name="location" size={18} color={colors.primaryText} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="heading" numberOfLines={2}>
            {name}
          </AppText>
          {meta ? <AppText variant="caption">{meta}</AppText> : null}
        </View>
        <FavoriteButton active={favorite} onToggle={onToggleFavorite} name={name} />
        {onPress ? (
          <Ionicons name={forwardChevron()} size={18} color={colors.textSecondary} />
        ) : null}
      </View>

      {uniqueLines.length > 0 ? (
        <View style={styles.lines}>
          {uniqueLines.map((line) => (
            <LineBadge key={line} routeNumber={line} size="sm" neutral />
          ))}
        </View>
      ) : null}

      {shown.length > 0 ? (
        <View style={styles.arrivals}>
          {shown.map((arrival, i) => (
            <ArrivalRow key={`${arrival.routeNumber}-${i}`} {...arrival} />
          ))}
        </View>
      ) : (
        <AppText variant="caption">אין הגעות צפויות כרגע.</AppText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space(3),
    padding: space(4),
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  pin: {
    width: space(9),
    height: space(9),
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: { flex: 1, gap: 2 },
  lines: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  arrivals: { gap: space(1) }
});
