import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space, TOUCH_TARGET } from '../theme/tokens';
import AppText from './AppText';
import IconButton from './IconButton';
import PressableScale from './PressableScale';

interface Props {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onRemove?: () => void;
  /** כוכב "שמור במועדפים"; isFavorite קובע את מצבו */
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

/** שורת חיפוש אחרון: שעון + טקסט + הסרה. */
export default function RecentSearchCard({ title, subtitle, onPress, onRemove, onToggleFavorite, isFavorite }: Props) {
  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`חיפוש אחרון: ${title}`}
        onPress={() => {
          haptics.select();
          onPress?.();
        }}
        scaleTo={0.99}
        style={styles.main}
        pressedStyle={styles.pressed}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
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
      {onToggleFavorite ? (
        <IconButton
          icon={isFavorite ? 'star' : 'star-outline'}
          size={18}
          color={isFavorite ? colors.warning : colors.textSecondary}
          filled={false}
          accessibilityLabel={isFavorite ? `הסר את ${title} מהמועדפים` : `שמור את ${title} במועדפים`}
          onPress={onToggleFavorite}
        />
      ) : null}
      {onRemove ? (
        <IconButton
          icon="close"
          size={18}
          color={colors.textSecondary}
          filled={false}
          accessibilityLabel={`הסר את ${title} מהחיפושים האחרונים`}
          onPress={onRemove}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH_TARGET + space(4), borderRadius: radius.md },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2), borderRadius: radius.md },
  pressed: { backgroundColor: colors.surface },
  iconWrap: {
    width: space(9),
    height: space(9),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { flex: 1, gap: 2 }
});
