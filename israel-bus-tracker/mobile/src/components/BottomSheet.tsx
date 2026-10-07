import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetProps
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { colors, radius } from '../theme/tokens';

interface Props extends Omit<BottomSheetProps, 'backgroundStyle' | 'handleIndicatorStyle'> {
  /** רקע כהה מעמעם מאחורי הגיליון (לגיליונות מודאליים) */
  withBackdrop?: boolean;
}

/** גיליון תחתון עם עיצוב אחיד (פינות 20, ידית, רקע surface). */
const BottomSheet = forwardRef<GorhomBottomSheet, Props>(function BottomSheet(
  { withBackdrop, children, ...rest },
  ref
) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} pressBehavior="close"
        accessibilityLabel="סגור"
        accessibilityRole="button"
      />
    ),
    []
  );
  return (
    <GorhomBottomSheet
      ref={ref}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      backdropComponent={withBackdrop ? renderBackdrop : undefined}
      {...rest}
    >
      {children}
    </GorhomBottomSheet>
  );
});

export default BottomSheet;
export { BottomSheetFlatList, BottomSheetScrollView };

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg
  },
  handle: { backgroundColor: colors.border, width: 40 }
});
