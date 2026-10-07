import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space, TOUCH_TARGET } from '../theme/tokens';
import AppText from './AppText';
import PressableScale from './PressableScale';

interface Props {
  label: string;
  selected?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** tab (ברירת מחדל, טאבים עליונים) / radio (בחירה בודדת) / button (פילטר) */
  role?: 'tab' | 'radio' | 'button';
}

/** Pill לבחירה (טאבים עליונים, פילטרים). אזור מגע 44px. */
export default function Chip({ label, selected, icon, onPress, accessibilityLabel, role = 'tab' }: Props) {
  return (
    <PressableScale
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      style={[styles.chip, selected && styles.selected]}
      pressedStyle={selected ? styles.selectedPressed : styles.pressed}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.onPrimary : colors.textSecondary} /> : null}
      <AppText variant="tab" numberOfLines={1} style={selected ? styles.textSelected : undefined}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    minHeight: TOUCH_TARGET,
    paddingHorizontal: space(4),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceElevated },
  selectedPressed: { backgroundColor: colors.primaryPressed },
  textSelected: { color: colors.onPrimary }
});
