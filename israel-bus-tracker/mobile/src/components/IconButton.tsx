import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, TOUCH_TARGET } from '../theme/tokens';
import PressableScale from './PressableScale';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  /** חובה - קורא מסך */
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** עיגול ברקע surface (ברירת מחדל) או שקוף */
  filled?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** כפתור אייקון עגול, אזור מגע 44px לפחות */
export default function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 22,
  color = colors.text,
  filled = true,
  disabled,
  style
}: Props) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress?.();
      }}
      hitSlop={4}
      style={[styles.base, filled && styles.filled, disabled && styles.disabled, style]}
      pressedStyle={filled ? styles.filledPressed : undefined}
    >
      <Ionicons name={icon} size={size} color={disabled ? colors.textDisabled : color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filled: { backgroundColor: colors.surface },
  filledPressed: { backgroundColor: colors.surfaceElevated },
  disabled: { opacity: 0.5 }
});
