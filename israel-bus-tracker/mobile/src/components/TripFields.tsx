import type { Ref } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { colors, radius, space } from '../theme/tokens';
import IconButton from './IconButton';
import SearchInput from './SearchInput';

interface Props {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSwap: () => void;
  onSubmit: () => void;
  toRef?: Ref<TextInput>;
}

/** שדות "מאיפה?" / "לאן?" עם כפתור החלפה. עמודת קו מחברת בין הנקודות. */
export default function TripFields({ from, to, onFromChange, onToChange, onSwap, onSubmit, toRef }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.fields}>
        <SearchInput
          large
          icon="radio-button-on"
          iconColor={colors.primaryText}
          placeholder="מאיפה?"
          value={from}
          onChangeText={onFromChange}
          returnKeyType="next"
          onClear={() => onFromChange('')}
        />
        <SearchInput
          ref={toRef}
          large
          icon="location"
          iconColor={colors.danger}
          placeholder="לאן?"
          value={to}
          onChangeText={onToChange}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          onClear={() => onToChange('')}
        />
      </View>
      <View style={styles.swap}>
        <IconButton
          icon="swap-vertical"
          accessibilityLabel="החלף בין מוצא ליעד"
          color={colors.text}
          onPress={() => {
            haptics.light();
            onSwap();
          }}
          style={styles.swapButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    padding: space(3),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  fields: { flex: 1, gap: space(2) },
  swap: { alignItems: 'center', justifyContent: 'center' },
  swapButton: { backgroundColor: colors.surfaceElevated }
});
