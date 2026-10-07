import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '../theme/tokens';

interface Props {
  children: ReactNode;
  /** כותרת (למשל ScreenHeader). ScreenHeader מטפל ב-SafeArea העליון בעצמו */
  header?: ReactNode;
  /** תוכן נגלל */
  scroll?: boolean;
  /** ריווח פנימי סטנדרטי (16px) */
  padded?: boolean;
  /** הוספת SafeArea תחתון (מסכים בלי סרגל ניווט תחתון) */
  bottomInset?: boolean;
  /** התאמה למקלדת (מסכים עם שדות קלט) */
  keyboardAvoiding?: boolean;
  /** pull-to-refresh (רק עם scroll) */
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * בסיס אחיד לכל מסך: רקע כהה, SafeArea (למעלה רק אם אין header; לצדדים סימטרי כדי לא להיות תלוי כיוון),
 * גלילה אופציונלית עם סגירת מקלדת, והתאמה למקלדת.
 */
export default function Screen({
  children,
  header,
  scroll,
  padded = true,
  bottomInset,
  keyboardAvoiding,
  refreshControl,
  contentContainerStyle,
  style
}: Props) {
  const insets = useSafeAreaInsets();
  const sides = Math.max(insets.left, insets.right);
  const frame: ViewStyle = {
    paddingTop: header ? 0 : insets.top,
    paddingBottom: bottomInset ? insets.bottom : 0,
    paddingHorizontal: sides
  };
  const inner: ViewStyle | undefined = padded ? { padding: space(4) } : undefined;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[inner, styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, contentContainerStyle]}>{children}</View>
  );

  const content = (
    <>
      {header ?? null}
      {body}
    </>
  );

  return (
    <View style={[styles.root, frame, style]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: space(8) }
});
