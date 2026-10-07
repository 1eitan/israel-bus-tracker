import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backChevron } from '../lib/rtl';
import { colors, space } from '../theme/tokens';
import AppText from './AppText';
import IconButton from './IconButton';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** פעולה בצד הנגדי לחזרה (למשל חיפוש/הגדרות) */
  right?: ReactNode;
}

/**
 * Header נקי: כותרת גדולה ותת-כותרת. חץ חזרה בצד ההתחלה (ימין ב-RTL),
 * החץ מתהפך לפי כיוון. תומך ב-SafeArea.
 */
export default function ScreenHeader({ title, subtitle, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + space(3) }]}>
      {onBack ? (
        <IconButton
          icon={backChevron()}
          accessibilityLabel="חזרה"
          onPress={onBack}
        />
      ) : null}
      <View style={styles.titles}>
        <AppText
          variant="display"
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingBottom: space(3),
    backgroundColor: colors.background
  },
  titles: { flex: 1, gap: 2 }
});
