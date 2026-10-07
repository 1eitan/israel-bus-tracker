import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import AppText from './AppText';
import SecondaryButton from './SecondaryButton';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** מצב שגיאה עם "נסה שוב". אדום נגיש + אייקון + טקסט (לא רק צבע). */
export default function ErrorState({
  title = 'משהו השתבש',
  message = 'לא הצלחנו לטעון את המידע. בדוק חיבור לאינטרנט ונסה שוב.',
  onRetry
}: Props) {
  return (
    <View style={styles.container} accessible accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="caption" style={styles.center}>
        {message}
      </AppText>
      {onRetry ? (
        <View style={styles.action}>
          <SecondaryButton title="נסה שוב" icon="refresh" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space(2), paddingVertical: space(8), paddingHorizontal: space(6) },
  iconWrap: {
    width: space(16),
    height: space(16),
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1)
  },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: space(3) }
});
