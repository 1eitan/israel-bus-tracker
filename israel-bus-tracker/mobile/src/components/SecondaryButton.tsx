import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import type { ButtonProps } from './PrimaryButton';
import PressableScale from './PressableScale';

/** כפתור משני: מסגרת בלבד על surface. */
export default function SecondaryButton({
  title,
  onPress,
  disabled,
  icon,
  accessibilityLabel,
  style
}: Omit<ButtonProps, 'loading'>) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.button, disabled && styles.disabled, style]}
      pressedStyle={styles.pressed}
    >
      <View style={styles.content}>
        {icon ? <Ionicons name={icon} size={20} color={disabled ? colors.textDisabled : colors.text} /> : null}
        <AppText variant="button" tone={disabled ? 'textDisabled' : 'text'} numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    minHeight: space(13),
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(4)
  },
  pressed: { backgroundColor: colors.surfaceElevated },
  disabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: space(2) }
});
