import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '../theme/tokens';
import AppText from './AppText';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onMenuPress?: () => void;
}

/** שורה: אייקון מימין, טקסט באמצע, תפריט שלוש נקודות משמאל (ב-RTL) */
export default function PlaceListItem({ icon, title, subtitle, onPress, onMenuPress }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.text}>
        <AppText numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {onMenuPress ? (
        <Pressable accessibilityLabel="אפשרויות נוספות" hitSlop={12} onPress={onMenuPress}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  iconWrap: {
    width: space(10),
    height: space(10),
    borderRadius: 9999,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { flex: 1 }
});
