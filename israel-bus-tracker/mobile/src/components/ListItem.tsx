import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { forwardChevron } from '../lib/rtl';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import PressableScale from './PressableScale';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** תג/ערך בצד (למשל "בקרוב") */
  trailingText?: string;
  /** הסתרת החץ (למשל פריט מידע בלבד) */
  hideChevron?: boolean;
  /** צבע האייקון (ברירת מחדל טקסט) */
  iconColor?: string;
  last?: boolean;
}

/** שורה אחידה: אייקון + כותרת + תת-כותרת + chevron. ה-chevron מתהפך לפי RTL. */
export default function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  trailingText,
  hideChevron,
  iconColor = colors.text,
  last
}: Props) {
  const content = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailingText ? (
        <AppText variant="caption" numberOfLines={1}>
          {trailingText}
        </AppText>
      ) : null}
      {onPress && !hideChevron ? (
        <Ionicons name={forwardChevron()} size={18} color={colors.textSecondary} />
      ) : null}
    </>
  );

  const rowStyle = [styles.row, !last && styles.divider];
  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      scaleTo={0.99}
      style={rowStyle}
      pressedStyle={styles.pressed}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: space(15),
    paddingHorizontal: space(4),
    paddingVertical: space(2)
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceElevated },
  iconWrap: {
    width: space(10),
    height: space(10),
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { flex: 1, gap: 2 }
});
