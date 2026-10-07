import { Text, type TextProps } from 'react-native';

import { colors, MAX_FONT_SCALE, typography, type ColorToken } from '../theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  /** צבע מה-theme בלבד */
  tone?: ColorToken;
}

/**
 * טקסט עם פונט Heebo וטיפוגרפיה מה-theme.
 * allowFontScaling פעיל (נגישות), עם תקרה (MAX_FONT_SCALE) כדי לא לשבור פריסות.
 * textAlign נשאר 'auto' ולכן עוקב אחרי כיוון הטקסט (RTL בעברית).
 */
export default function AppText({ variant = 'body', tone, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[typography[variant], tone ? { color: colors[tone] } : null, style]}
    />
  );
}
