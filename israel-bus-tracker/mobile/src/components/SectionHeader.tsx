import { StyleSheet, View } from 'react-native';

import { space, TOUCH_TARGET } from '../theme/tokens';
import AppText from './AppText';
import PressableScale from './PressableScale';

interface Props {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export default function SectionHeader({ title, actionLabel, onActionPress }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="heading" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {actionLabel && onActionPress ? (
        <PressableScale accessibilityRole="button" accessibilityLabel={`${actionLabel}, ${title}`} onPress={onActionPress} hitSlop={12} style={styles.action}>
          <AppText variant="caption" tone="primaryText">
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(6),
    marginBottom: space(3)
  },
  title: { flex: 1 },
  action: { minHeight: TOUCH_TARGET, justifyContent: 'center' }
});
