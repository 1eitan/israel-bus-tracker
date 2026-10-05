import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors, fonts, radius, space } from '../theme/tokens';
import AppText from './AppText';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function PrimaryButton({ title, onPress, loading, disabled }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.button, (pressed || inactive) && styles.dim]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <AppText style={styles.text}>{title}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: space(13),
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(4)
  },
  dim: { opacity: 0.7 },
  text: { fontFamily: fonts.bold, fontSize: 16, color: colors.text }
});
