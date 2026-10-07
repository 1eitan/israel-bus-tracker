import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnline } from '../hooks/useOnline';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';

/** פס עליון כשאין רשת: ממשיכים להציג נתונים אחרונים שנשמרו, והם מתרעננים לבד כשהרשת חוזרת. */
export default function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      style={[styles.wrap, { top: insets.top + space(1) }]}
    >
      <View style={styles.pill}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
        <AppText variant="label" style={styles.text}>
          אין חיבור לאינטרנט · מוצגים נתונים אחרונים
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(3),
    minHeight: space(8),
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.warning
  },
  text: { color: colors.text }
});
