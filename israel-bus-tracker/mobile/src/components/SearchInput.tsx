import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { I18nManager, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space, typography } from '../theme/tokens';
import AppText from './AppText';
import PressableScale from './PressableScale';

interface Props extends Omit<TextInputProps, 'style'> {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** כשמוגדר - השדה מוצג כלחיץ בלבד (ללא הקלדה) */
  onPress?: () => void;
  displayValue?: string;
  /** שדה גדול (גובה 56) - לחיפוש ראשי */
  large?: boolean;
  /** כפתור ניקוי כשיש טקסט */
  onClear?: () => void;
}

/** שדה חיפוש גדול וברור. accessibilityLabel נגזר מה-placeholder אם לא הוגדר. */
const SearchInput = forwardRef<TextInput, Props>(function SearchInput(
  { icon = 'search', iconColor = colors.textSecondary, onPress, displayValue, large, onClear, ...input },
  ref
) {
  const label = input.accessibilityLabel ?? input.placeholder;
  const showClear = !onPress && !!onClear && !!input.value;

  const body = (
    <View style={[styles.container, large && styles.large]}>
      <Ionicons name={icon} size={20} color={iconColor} />
      {onPress ? (
        <AppText style={styles.pressableText} tone="textSecondary" numberOfLines={1}>
          {displayValue ?? input.placeholder}
        </AppText>
      ) : (
        <TextInput
          ref={ref}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={label}
          {...input}
          placeholderTextColor={colors.textSecondary}
          textAlign={I18nManager.isRTL ? 'right' : 'left'}
          style={styles.input}
          selectionColor={colors.primary}
        />
      )}
      {showClear ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="נקה חיפוש"
          hitSlop={12}
          onPress={() => {
            haptics.select();
            onClear?.();
          }}
        >
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );

  return onPress ? (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.99}>
      {body}
    </PressableScale>
  ) : (
    body
  );
});

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: space(12),
    paddingHorizontal: space(4),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  large: { minHeight: space(14) },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize + 1,
    color: colors.text,
    paddingVertical: space(2)
  },
  pressableText: { flex: 1 }
});
