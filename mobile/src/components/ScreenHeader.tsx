import { Ionicons } from '@expo/vector-icons';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '../theme/tokens';
import AppText from './AppText';

interface Props {
  title: string;
  onBack?: () => void;
}

/**
 * כותרת ממורכזת מודגשת. חץ החזרה בצד ה"התחלה" - ימין ב-RTL - והוא מתהפך אוטומטית:
 * ב-RTL החץ מצביע ימינה (chevron-forward), ב-LTR שמאלה.
 */
export default function ScreenHeader({ title, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + space(2) }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            hitSlop={12}
            onPress={onBack}
          >
            <Ionicons
              name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
              size={26}
              color={colors.text}
            />
          </Pressable>
        ) : null}
      </View>
      <AppText variant="title" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingBottom: space(3),
    backgroundColor: colors.background
  },
  side: { width: space(10), alignItems: 'flex-start' },
  title: { flex: 1, textAlign: 'center' }
});
