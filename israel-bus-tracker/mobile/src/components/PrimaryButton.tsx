import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import PressableScale from './PressableScale';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** כפתור ראשי: רקע primary, מצב לחוץ כהה יותר, loading ו-disabled. גובה 52px. */
export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  accessibilityLabel,
  style
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={[styles.button, disabled && styles.disabled, style]}
      pressedStyle={styles.pressed}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={20} color={colors.onPrimary} /> : null}
          <AppText variant="button" tone="onPrimary" numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    minHeight: space(13),
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(4)
  },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { backgroundColor: colors.surfaceElevated },
  content: { flexDirection: 'row', alignItems: 'center', gap: space(2) }
});
