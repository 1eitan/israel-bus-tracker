import { Ionicons } from '@expo/vector-icons';
import { I18nManager, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, space } from '../theme/tokens';
import AppText from './AppText';

interface Props extends Omit<TextInputProps, 'style'> {
  icon?: keyof typeof Ionicons.glyphMap;
  /** כשמוגדר - השדה מוצג כלחיץ בלבד (ללא הקלדה) */
  onPress?: () => void;
  displayValue?: string;
}

export default function SearchInput({ icon = 'search', onPress, displayValue, ...input }: Props) {
  const content = onPress ? (
    <AppText style={styles.pressableText} numberOfLines={1}>
      {displayValue ?? input.placeholder}
    </AppText>
  ) : (
    <TextInput
      {...input}
      placeholderTextColor={colors.textSecondary}
      textAlign={I18nManager.isRTL ? 'right' : 'left'}
      style={styles.input}
      selectionColor={colors.primary}
    />
  );

  const body = (
    <View style={styles.container}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      {content}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    height: space(12),
    paddingHorizontal: space(4),
    borderRadius: radius.md,
    backgroundColor: colors.card
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  pressableText: { flex: 1, color: colors.textSecondary }
});
