import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space } from '../theme/tokens';
import AppText from './AppText';

interface Props {
  routeNumber: string;
  destination: string;
  /** טקסט זמן הגעה, למשל "1 דק׳" - מוצג בירוק */
  eta: string;
  badgeColor?: string;
  badgeTextColor?: string;
  /** שורת משנה (למשל עיכוב) */
  note?: string;
  onPress?: () => void;
}

/** כרטיס קו: מספר קו מימין, יעד באמצע, זמן הגעה בירוק משמאל (ב-RTL) */
export default function RouteCard({
  routeNumber,
  destination,
  eta,
  badgeColor = colors.primary,
  badgeTextColor = colors.text,
  note,
  onPress
}: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <AppText style={[styles.badgeText, { color: badgeTextColor }]} numberOfLines={1}>
          {routeNumber}
        </AppText>
      </View>
      <View style={styles.center}>
        <AppText numberOfLines={1}>{destination}</AppText>
        {note ? (
          <AppText variant="caption" style={styles.note}>
            {note}
          </AppText>
        ) : null}
      </View>
      <AppText style={styles.eta}>{eta}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  badge: {
    minWidth: space(10),
    height: space(10),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 16 },
  center: { flex: 1 },
  note: { color: colors.warning, marginTop: 2 },
  eta: { fontFamily: fonts.bold, fontSize: 15, color: colors.success }
});
