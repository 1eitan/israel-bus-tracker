import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

export interface ModalAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  /** תווית כפתור הסגירה כשאין פעולות, וגם תווית הרקע הלחיץ */
  closeLabel?: string;
}

/**
 * דיאלוג מרכזי. סגירה: רקע לחיץ, כפתור אחורה של אנדרואיד (onRequestClose) או פעולה.
 * accessibilityViewIsModal מונע מקורא מסך iOS להגיע לתוכן שמאחור.
 */
export default function Modal({
  visible,
  onClose,
  title,
  message,
  children,
  primaryAction,
  secondaryAction,
  closeLabel = 'סגור'
}: Props) {
  const hasActions = !!primaryAction || !!secondaryAction;
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View style={styles.card} accessibilityViewIsModal>
          <AppText variant="title" accessibilityRole="header" style={styles.center}>
            {title}
          </AppText>
          {message ? (
            <AppText variant="body" tone="textSecondary" style={styles.center}>
              {message}
            </AppText>
          ) : null}
          {children}
          <View style={styles.actions}>
            {primaryAction ? (
              <PrimaryButton
                title={primaryAction.label}
                onPress={primaryAction.onPress}
                loading={primaryAction.loading}
              />
            ) : null}
            {secondaryAction ? (
              <SecondaryButton title={secondaryAction.label} onPress={secondaryAction.onPress} />
            ) : null}
            {!hasActions ? <SecondaryButton title={closeLabel} onPress={onClose} /> : null}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(6) },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  card: {
    alignSelf: 'stretch',
    maxWidth: 420,
    gap: space(3),
    padding: space(5),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  center: { textAlign: 'center' },
  actions: { gap: space(2), marginTop: space(2) }
});
