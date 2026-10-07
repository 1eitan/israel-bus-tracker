import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { colors, radius, space } from '../theme/tokens';

interface BlockProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

/** בלוק שלד עם pulse עדין (opacity בלבד). */
export function SkeletonBlock({ width = '100%', height = 14, rounded = radius.card / 2, style }: BlockProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0.5);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [opacity, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceElevated }, animated, style]}
    />
  );
}

/** שלד של כרטיס תחנה (תואם ל-StationCard). */
export function StationCardSkeleton() {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel="טוען תחנות"
      accessibilityState={{ busy: true }}
    >
      <View style={styles.row}>
        <SkeletonBlock width="55%" height={18} />
        <SkeletonBlock width={56} height={14} />
      </View>
      <SkeletonBlock width="30%" height={12} />
      <View style={styles.row}>
        <SkeletonBlock width={48} height={32} rounded={radius.md} />
        <SkeletonBlock width="40%" height={14} />
        <SkeletonBlock width={40} height={20} />
      </View>
      <View style={styles.row}>
        <SkeletonBlock width={48} height={32} rounded={radius.md} />
        <SkeletonBlock width="35%" height={14} />
        <SkeletonBlock width={40} height={20} />
      </View>
    </View>
  );
}

/** שלד של כרטיס קו. */
export function RouteCardSkeleton() {
  return (
    <View style={[styles.card, styles.row]} accessible accessibilityLabel="טוען קווים" accessibilityState={{ busy: true }}>
      <SkeletonBlock width={56} height={44} rounded={radius.md} />
      <View style={styles.grow}>
        <SkeletonBlock width="70%" height={16} />
        <SkeletonBlock width="40%" height={12} />
      </View>
      <SkeletonBlock width={40} height={20} />
    </View>
  );
}

interface ListProps {
  count?: number;
  variant?: 'station' | 'route';
}

/** רשימת שלדים. */
export default function LoadingSkeleton({ count = 3, variant = 'station' }: ListProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) =>
        variant === 'station' ? <StationCardSkeleton key={i} /> : <RouteCardSkeleton key={i} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space(3) },
  card: {
    gap: space(3),
    padding: space(4),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3) },
  grow: { flex: 1, gap: space(2) }
});
