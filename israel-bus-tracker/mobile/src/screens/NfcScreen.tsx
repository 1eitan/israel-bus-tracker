import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import { useNfc, type NfcStatus } from '../hooks/useNfc';
import type { TabParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

const STATUS_TEXT: Partial<Record<NfcStatus, string>> = {
  unsupported: 'המכשיר אינו תומך ב-NFC.',
  disabled: 'ה-NFC כבוי. לחץ כדי לפתוח את ההגדרות ולהפעיל אותו.',
  waiting: 'הצמד את כרטיס הרב-קו לגב המכשיר...',
  reading: 'קורא את הכרטיס, אל תזיז אותו...',
  done: 'הקריאה הושלמה.'
};

export default function NfcScreen(_props: BottomTabScreenProps<TabParamList, 'RavKav'>) {
  const { status, result, error, start, cancel } = useNfc();
  const scanning = status === 'waiting' || status === 'reading';
  const buttonTitle = status === 'disabled' ? 'פתח הגדרות NFC' : 'הפעל NFC';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="טעינת רב-קו" />
      <View style={styles.content}>
        <View style={styles.graphic}>
          <Ionicons name="card" size={72} color={colors.text} />
          <View style={styles.waves}>
            <Ionicons name="wifi" size={28} color={scanning ? colors.success : colors.textSecondary} style={styles.wave} />
          </View>
        </View>

        <AppText style={styles.message}>לקריאה וטעינה של הרב-קו, יש להפעיל את ה-NFC במכשיר</AppText>

        {scanning ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
        {STATUS_TEXT[status] ? (
          <AppText variant="caption" style={styles.status}>
            {STATUS_TEXT[status]}
          </AppText>
        ) : null}
        {error ? <AppText style={[styles.status, { color: colors.warning }]}>{`שגיאה: ${error}`}</AppText> : null}

        {result ? (
          <View style={styles.result}>
            <Row label="מזהה כרטיס (UID)" value={result.uid ?? 'לא זמין'} />
            <Row label="יישום רב-קו" value={result.selectOk ? 'זוהה' : `לא זוהה (SW ${result.statusWord})`} />
            <Row
              label="יתרה"
              value={
                result.balanceAgorot === null
                  ? 'לא נקראה - ראה README'
                  : `${(result.balanceAgorot / 100).toFixed(2)} ₪`
              }
            />
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={scanning ? 'ביטול' : buttonTitle}
          onPress={scanning ? cancel : start}
          disabled={status === 'unsupported' || status === 'checking'}
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(6), gap: space(4) },
  graphic: {
    width: space(40),
    height: space(40),
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  waves: { position: 'absolute', bottom: space(3) },
  wave: { transform: [{ rotate: '90deg' }] },
  message: { textAlign: 'center', lineHeight: 24 },
  spinner: { marginTop: space(2) },
  status: { textAlign: 'center' },
  result: {
    alignSelf: 'stretch',
    padding: space(4),
    gap: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.card
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { padding: space(4) }
});
