import { StyleSheet, View } from 'react-native';

import { colors, space } from '../theme/tokens';

interface Props {
  /** הזחה בצד ההתחלה (ימין ב-RTL), ביחידות של 4px */
  inset?: number;
}

/** קו מפריד דק. הזחה דרך marginStart כדי שתתהפך אוטומטית ב-RTL. מוסתר מקורא מסך. */
export default function Divider({ inset = 0 }: Props) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.line, inset ? { marginStart: space(inset) } : null]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, alignSelf: 'stretch' }
});
