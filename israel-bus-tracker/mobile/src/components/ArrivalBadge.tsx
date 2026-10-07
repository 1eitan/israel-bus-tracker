import { StyleSheet, View } from 'react-native';

import { withAlpha } from '../theme/contrast';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';

export type ArrivalKind = 'now' | 'soon' | 'normal' | 'delayed' | 'unknown';

const TONE: Record<ArrivalKind, { fg: string; bg: string }> = {
  now: { fg: colors.success, bg: colors.successSoft },
  soon: { fg: colors.primaryText, bg: colors.primarySoft },
  normal: { fg: colors.text, bg: colors.surfaceElevated },
  delayed: { fg: colors.warning, bg: colors.warningSoft },
  unknown: { fg: colors.textSecondary, bg: colors.surfaceElevated }
};

interface Props {
  /** "3 דק׳" / "עכשיו" */
  label: string;
  kind?: ArrivalKind;
  /** דריסת צבע טקסט (תאימות לאחור עם etaColor). הרקע נגזר ממנו בשקיפות */
  color?: string;
}

/** תג זמן הגעה (ETA): pill עם טקסט מודגש. הצבע לא הנושא היחיד: הטקסט נקרא בקורא מסך. */
export default function ArrivalBadge({ label, kind = 'normal', color }: Props) {
  const base = TONE[kind];
  const fg = color ?? base.fg;
  const bg = color ? (withAlpha(color, 0.16) ?? base.bg) : base.bg;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`מגיע ${label}`}
      style={[styles.badge, { backgroundColor: bg }]}
    >
      <AppText variant="eta" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: space(14),
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
