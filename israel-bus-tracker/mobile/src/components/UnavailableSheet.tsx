import type GorhomBottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import PrimaryButton from './PrimaryButton';

interface SheetState {
  title: string;
  message: string;
}

const DEFAULT_MESSAGE = 'התכונה הזו עדיין אינה זמינה באפליקציה. היא תחובר בשלב מאוחר יותר.';

/** hook: show(title, message?) פותח את הגיליון; hide() סוגר. */
export function useUnavailableSheet() {
  const [state, setState] = useState<SheetState | null>(null);
  const show = useCallback((title: string, message: string = DEFAULT_MESSAGE) => setState({ title, message }), []);
  const hide = useCallback(() => setState(null), []);
  return { state, show, hide };
}

interface Props {
  state: SheetState | null;
  onClose: () => void;
}

/** גיליון תחתון אחיד להודעות "לא זמין עדיין" - במקום Alert. כנה: לא מציג הצלחה מדומה. */
export default function UnavailableSheet({ state, onClose }: Props) {
  const ref = useRef<GorhomBottomSheet>(null);
  // שומרים את התוכן האחרון כדי שהטקסט לא יעלם באמצע אנימציית הסגירה
  const [shown, setShown] = useState<SheetState | null>(state);

  useEffect(() => {
    if (state) {
      setShown(state);
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [state]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      withBackdrop
      onClose={onClose}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={28} color={colors.warning} />
        </View>
        <AppText variant="title" style={styles.center}>
          {shown?.title}
        </AppText>
        <AppText variant="body" tone="textSecondary" style={styles.center}>
          {shown?.message}
        </AppText>
        <PrimaryButton title="הבנתי" onPress={onClose} style={styles.button} />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: space(3), paddingHorizontal: space(5), paddingTop: space(2), paddingBottom: space(8) },
  iconWrap: {
    width: space(16),
    height: space(16),
    borderRadius: radius.full,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  center: { textAlign: 'center' },
  button: { marginTop: space(2) }
});
