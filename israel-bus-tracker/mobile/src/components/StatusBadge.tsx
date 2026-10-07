import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';

export type StatusKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE: Record<StatusKind, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  neutral: { fg: colors.textSecondary, bg: colors.surfaceElevated }
};

interface Props {
  label: string;
  kind?: StatusKind;
}

/** תווית סטטוס קטנה (בזמן / עיכוב / לא זמין). הצבע לא הנושא היחיד - יש גם טקסט. */
export default function StatusBadge({ label, kind = 'neutral' }: Props) {
  const tone = TONE[kind];
  return (
    <View accessible accessibilityRole="text" style={[styles.badge, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <AppText variant="label" style={{ color: tone.fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space(1.5),
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    borderRadius: radius.pill
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill }
});
