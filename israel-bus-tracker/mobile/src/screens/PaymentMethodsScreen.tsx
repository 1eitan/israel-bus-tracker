import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import DemoBadge from '../components/DemoBadge';
import ErrorState from '../components/ErrorState';
import ListItem from '../components/ListItem';
import NotImplementedCard from '../components/NotImplementedCard';
import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import UnavailableSheet, { useUnavailableSheet } from '../components/UnavailableSheet';
import { usePayment } from '../hooks/usePayment';
import { haptics } from '../lib/haptics';
import type { TabParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

/**
 * מסך תשלום. כל המצבים נגזרים מ-PaymentProvider (ראה src/payment):
 *  - אין ספק => NOT_IMPLEMENTED (כרטיס "לא מוטמע", ללא הצלחה מדומה)
 *  - ספק מחובר => רשימת אמצעי תשלום (מטא-דאטה בלבד: מותג + 4 ספרות) ופעולת הוספה דרך ה-SDK של הספק
 * האפליקציה לא מציגה שדות הזנת כרטיס ולא שומרת מספר כרטיס / CVV / סודות.
 */
export default function PaymentMethodsScreen(_props: BottomTabScreenProps<TabParamList, 'Payment'>) {
  const sheet = useUnavailableSheet();
  const { state, reload, addMethod, isMock } = usePayment();
  const [adding, setAdding] = useState(false);

  const onAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const result = await addMethod();
      if (result.kind === 'not_implemented') {
        haptics.error();
        sheet.show('הוספת אמצעי תשלום', `${result.reason}`);
      } else if (result.kind === 'error') {
        haptics.error();
        sheet.show('הוספת אמצעי תשלום', result.error.message);
      } else if (result.data.kind === 'demo') {
        sheet.show('מצב הדגמה', 'כאן היה נפתח טופס ההזנה של ספק הסליקה. זהו סשן הדגמה: לא נאסף כרטיס ולא נגבה כסף.');
      }
    } finally {
      setAdding(false);
    }
  };

  const methods = state.phase === 'ready' ? state.methods : [];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="תשלום" subtitle="אמצעי תשלום, היסטוריה וקבלות" />
      <ScrollView contentContainerStyle={styles.content}>
        {state.phase === 'not_configured' ? (
          <NotImplementedCard title="ספק הסליקה אינו מחובר" message={`${state.reason} לא נשמר ולא נגבה שום מידע.`} icon="shield-checkmark-outline" />
        ) : null}
        {state.phase === 'ready' ? (
          <View style={styles.status} accessible accessibilityRole="summary">
            <View style={styles.statusIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
            </View>
            <View style={styles.statusText}>
              <AppText variant="bodyStrong">ספק הסליקה מחובר</AppText>
              <AppText variant="caption">פרטי כרטיס מוזנים רק אצל הספק ולא נשמרים באפליקציה.</AppText>
            </View>
            {isMock ? <DemoBadge /> : <StatusBadge label="מחובר" kind="success" />}
          </View>
        ) : null}
        {state.phase === 'error' ? <ErrorState title="לא הצלחנו לטעון תשלומים" message={state.failure.message} onRetry={state.failure.retryable ? () => void reload() : undefined} /> : null}
        {state.phase === 'loading' ? <StatusBadge label="בודק ספק סליקה" kind="neutral" /> : null}

        <SectionHeader title="אמצעי תשלום" />
        <View style={styles.group}>
          {methods.length === 0 ? (
            <ListItem icon="card-outline" title="אין אמצעי תשלום שמור" subtitle="כרטיס שתוסיף יופיע כאן" last iconColor={colors.textSecondary} />
          ) : (
            methods.map((method, i) => (
              <ListItem
                key={method.id}
                icon="card"
                title={`${method.brand} •••• ${method.last4}`}
                subtitle={method.isDefault ? 'אמצעי תשלום ראשי' : undefined}
                last={i === methods.length - 1}
              />
            ))
          )}
        </View>
        <View style={styles.cta}>
          <PrimaryButton title="הוספת אמצעי תשלום" icon="add" onPress={() => void onAdd()} loading={adding} disabled={state.phase === 'loading'} />
        </View>

        <SectionHeader title="היסטוריה וקבלות" />
        <View style={styles.group}>
          <ListItem
            icon="receipt-outline"
            title="היסטוריית תשלומים"
            subtitle={state.phase === 'ready' ? 'התשלומים שלך יופיעו כאן' : 'אין תשלומים להצגה'}
            trailingText={state.phase === 'ready' ? undefined : 'לא זמין'}
            onPress={() => sheet.show('היסטוריית תשלומים', 'היסטוריית התשלומים תופיע כאן לאחר חיבור ספק הסליקה.')}
          />
          <ListItem
            icon="document-text-outline"
            title="קבלות"
            subtitle="קבלות וחשבוניות יופיעו כאן"
            trailingText="לא זמין"
            onPress={() => sheet.show('קבלות', 'קבלות וחשבוניות יהיו זמינות לאחר חיבור שירותי החשבון והתשלום.')}
            last
          />
        </View>
      </ScrollView>
      <UnavailableSheet state={sheet.state} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  statusIcon: {
    width: space(10),
    height: space(10),
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: { flex: 1, gap: 2 },
  group: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
  cta: { marginTop: space(3) }
});
