import { StyleSheet, View } from 'react-native';

import { readableTextOn } from '../theme/contrast';
import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';

export type LineBadgeSize = 'sm' | 'md' | 'lg';

interface Props {
  routeNumber: string;
  /** צבע הקו (בדרך כלל מהשרת). ברירת מחדל: routeFallback */
  color?: string;
  /** צבע טקסט. אם לא הוגדר, נבחר אוטומטית לפי ניגודיות מול הרקע */
  textColor?: string;
  size?: LineBadgeSize;
  /** תג ניטרלי (surfaceElevated) לרשימות קווים בלי צבע ספציפי */
  neutral?: boolean;
}

const SIZES: Record<LineBadgeSize, { minWidth: number; height: number; variant: 'label' | 'heading' | 'routeNumber' }> = {
  sm: { minWidth: space(9), height: space(6), variant: 'label' },
  md: { minWidth: space(14), height: space(9), variant: 'heading' },
  lg: { minWidth: space(16), height: space(14), variant: 'routeNumber' }
};

/** תג מספר קו אחיד: שלושה גדלים, טקסט קריא אוטומטית מעל כל צבע רקע. */
export default function LineBadge({ routeNumber, color = colors.routeFallback, textColor, size = 'md', neutral }: Props) {
  const spec = SIZES[size];
  const bg = neutral ? colors.surfaceElevated : color;
  const fg = neutral ? colors.text : (textColor ?? readableTextOn(bg));
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`קו ${routeNumber}`}
      style={[styles.badge, { minWidth: spec.minWidth, height: spec.height, backgroundColor: bg }]}
    >
      <AppText
        variant={spec.variant}
        style={{ color: fg }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {routeNumber}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space(2),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
