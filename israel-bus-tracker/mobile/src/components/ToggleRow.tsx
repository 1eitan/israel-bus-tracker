import { StyleSheet, View } from 'react-native';

import { colors, space } from '../theme/tokens';
import AppText from './AppText';
import Toggle from './Toggle';

interface Props {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}

/** שורת הגדרה עם מתג, באותו מבנה של ListItem (כותרת + תת-כותרת). */
export default function ToggleRow({ title, subtitle, value, onValueChange, disabled, last }: Props) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      <Toggle value={value} onValueChange={onValueChange} disabled={disabled} accessibilityLabel={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: space(15), paddingHorizontal: space(4), paddingVertical: space(2) },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  text: { flex: 1, gap: 2 }
});
