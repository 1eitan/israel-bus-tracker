import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space, TOUCH_TARGET } from '../theme/tokens';
import AppText from './AppText';
import IconButton from './IconButton';
import PressableScale from './PressableScale';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** כשמוגדר מוצג כפתור תפריט (עריכה/מחיקה) */
  onMenuPress?: () => void;
}

/** כרטיס מקום מועדף (בית, עבודה...). */
export default function FavoriteCard({ icon, title, subtitle, onPress, onMenuPress }: Props) {
  return (
    <View style={styles.card}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`מועדף: ${title}`}
        onPress={() => {
          haptics.select();
          onPress?.();
        }}
        scaleTo={0.99}
        style={styles.main}
        pressedStyle={styles.pressed}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={colors.primaryText} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </PressableScale>
      {onMenuPress ? (
        <IconButton
          icon="ellipsis-vertical"
          size={18}
          color={colors.textSecondary}
          filled={false}
          accessibilityLabel={`אפשרויות נוספות ל${title}`}
          onPress={onMenuPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET + space(6),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingEnd: space(1)
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(3), borderRadius: radius.md },
  pressed: { backgroundColor: colors.surfaceElevated },
  iconWrap: {
    width: space(10),
    height: space(10),
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { flex: 1, gap: 2 }
});
