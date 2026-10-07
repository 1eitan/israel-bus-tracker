import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import SecondaryButton from './SecondaryButton';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** מצב ריק: אייקון, כותרת, הסבר ופעולה אופציונלית. */
export default function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container} accessible accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.textSecondary} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" style={styles.center}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <SecondaryButton title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space(2), paddingVertical: space(8), paddingHorizontal: space(6) },
  iconWrap: {
    width: space(16),
    height: space(16),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1)
  },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: space(3) }
});
