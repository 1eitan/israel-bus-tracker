import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '../theme/tokens';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  /** סגנון נוסף במצב לחוץ (למשל רקע) */
  pressedStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * בסיס לכל רכיב לחיץ: scale עדין (0.98) + pressed style.
 * style נשלח כמערך (לא כפונקציה) כדי ש-reanimated יעבד את ה-animated style.
 */
export default function PressableScale({
  style,
  pressedStyle,
  scaleTo = 0.98,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        scale.value = withTiming(scaleTo, { duration: motion.fast });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.value = withTiming(1, { duration: motion.fast });
        onPressOut?.(e);
      }}
      style={[animated, style, pressed ? pressedStyle : null]}
    >
      {children}
    </AnimatedPressable>
  );
}
