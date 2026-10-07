import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import StatusBadge from './StatusBadge';

interface Props {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * מצב NOT_IMPLEMENTED אחיד: אומר בגלוי שהיכולת עדיין לא מחוברת. לא מציג ערך, לא מציג הצלחה.
 * כשהספק/המפרט יחוברו, הרכיב הזה פשוט מפסיק להיות מוצג והנתונים האמיתיים מחליפים אותו.
 */
export default function NotImplementedCard({ title, message, icon = 'construct-outline' }: Props) {
  return (
    <View style={styles.card} accessible accessibilityRole="summary" accessibilityLabel={`${title}. לא מוטמע. ${message}`}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.warning} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption">{message}</AppText>
      </View>
      <StatusBadge label="לא מוטמע" kind="warning" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  iconWrap: {
    width: space(10),
    height: space(10),
    borderRadius: radius.full,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { flex: 1, gap: 2 }
});
