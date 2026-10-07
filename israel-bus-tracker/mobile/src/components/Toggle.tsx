import { StyleSheet, Switch, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, TOUCH_TARGET } from '../theme/tokens';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** חובה - קורא מסך */
  accessibilityLabel: string;
  disabled?: boolean;
}

/**
 * מתג אחיד. אזור מגע 44px לפחות. מצב כבוי מובחן גם בצבע המסלול וגם בצבע הידית
 * (לא רק צבע אחד), כדי שיהיה קריא על רקע surface.
 */
export default function Toggle({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  return (
    <View style={styles.target}>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          haptics.select();
          onValueChange(next);
        }}
        trackColor={{ false: colors.controlOff, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.textSecondary}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled: !!disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  target: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }
});
