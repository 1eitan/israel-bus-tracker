import { Text, type TextProps } from 'react-native';

import { typography } from '../theme/tokens';

interface Props extends TextProps {
  variant?: keyof typeof typography;
}

/** טקסט עם פונט Heebo וצבעי ה-tokens; כיוון הכתיבה נקבע ע"י ה-RTL הגלובלי */
export default function AppText({ variant = 'body', style, ...rest }: Props) {
  return <Text {...rest} style={[typography[variant], style]} />;
}
