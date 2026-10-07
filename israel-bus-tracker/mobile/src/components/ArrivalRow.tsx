import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import ArrivalBadge, { type ArrivalKind } from './ArrivalBadge';
import LineBadge from './LineBadge';
import PressableScale from './PressableScale';

export interface ArrivalRowProps {
  routeNumber: string;
  destination: string;
  /** "2 דק׳" / "עכשיו" */
  eta: string;
  /** סוג הגעה (צבע ברירת מחדל לפי סטטוס) */
  etaKind?: ArrivalKind;
  /** דריסת צבע זמן ההגעה */
  etaColor?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  /** שורת משנה, למשל "עיכוב של 6 דקות" */
  note?: string;
  noteColor?: string;
  onPress?: () => void;
}

/** שורת הגעה: מספר קו (badge) + יעד + זמן הגעה מודגש. */
export default function ArrivalRow({
  routeNumber,
  destination,
  eta,
  etaKind,
  etaColor,
  badgeColor,
  badgeTextColor,
  note,
  noteColor = colors.warning,
  onPress
}: ArrivalRowProps) {
  const label = `קו ${routeNumber} ל${destination}, מגיע ${eta}${note ? `, ${note}` : ''}`;
  const body = (
    <>
      <LineBadge routeNumber={routeNumber} color={badgeColor} textColor={badgeTextColor} />
      <View style={styles.center}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {destination}
        </AppText>
        {note ? (
          <AppText variant="caption" style={{ color: noteColor }} numberOfLines={1}>
            {note}
          </AppText>
        ) : null}
      </View>
      <ArrivalBadge label={eta} kind={etaKind} color={etaColor} />
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.99}
      style={styles.row}
      pressedStyle={styles.pressed}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: space(12),
    borderRadius: radius.card
  },
  pressed: { backgroundColor: colors.surfaceElevated },
  center: { flex: 1, gap: 1 }
});
