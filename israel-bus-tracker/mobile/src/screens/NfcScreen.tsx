import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import AppText from '../components/AppText';
import NotImplementedCard from '../components/NotImplementedCard';
import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import StatusBadge, { type StatusKind } from '../components/StatusBadge';
import { useNfc, type NfcPhase } from '../hooks/useNfc';
import type { Outcome } from '../core/outcome';
import type { CardScan } from '../nfc/scan';
import { haptics } from '../lib/haptics';
import type { TabParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

const NFC_BADGE: Record<NfcPhase, { label: string; kind: StatusKind }> = {
  checking: { label: 'בודק', kind: 'neutral' },
  unsupported: { label: 'לא נתמך', kind: 'danger' },
  disabled: { label: 'כבוי', kind: 'warning' },
  not_implemented: { label: 'לא מוטמע', kind: 'warning' },
  ready: { label: 'מוכן', kind: 'success' },
  waiting: { label: 'ממתין לכרטיס', kind: 'info' },
  reading: { label: 'קורא', kind: 'info' },
  done: { label: 'הושלם', kind: 'success' },
  error: { label: 'שגיאה', kind: 'danger' }
};

const STATUS_TEXT: Partial<Record<NfcPhase, string>> = {
  unsupported: 'המכשיר אינו תומך ב-NFC.',
  disabled: 'ה-NFC כבוי. הפעל אותו בהגדרות כדי לסרוק כרטיס.',
  waiting: 'הצמד את כרטיס הרב-קו לגב המכשיר...',
  reading: 'קורא את הכרטיס, אל תזיז אותו...',
  done: 'הקריאה הושלמה.'
};

const NO_BALANCE_REASON = 'פענוח יתרה דורש מפרט רשמי מאומת של הרב-קו, שעדיין לא הוטמע. לא מוצג ערך מנוחש.';

function ScanGraphic({ scanning, done }: { scanning: boolean; done: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (scanning) {
      pulse.value = withRepeat(withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [scanning, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: scanning ? 0.6 : 0.25 }));

  return (
    <View style={styles.graphic} accessible accessibilityLabel={scanning ? 'סורק כרטיס' : 'כרטיס רב-קו'}>
      <Animated.View style={[styles.ring, ring]} />
      <View style={styles.core}>
        <Ionicons name={done ? 'checkmark' : 'card'} size={44} color={done ? colors.success : colors.text} />
      </View>
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </AppText>
    </View>
  );
}

/**
 * מציג חלק מהכרטיס (יתרה/פרופיל/היסטוריה) לפי ה-Outcome:
 * ok => ערך אמיתי; not_implemented => כרטיס "לא מוטמע"; error => הודעת שגיאה. אין ערך מוצג בלי ok.
 */
function CardPart<T>({
  title,
  icon,
  scan,
  pick,
  render,
  notImplementedMessage
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  scan: CardScan | null;
  pick: (scan: CardScan) => Outcome<T>;
  render: (data: T) => string;
  notImplementedMessage: string;
}) {
  if (!scan) {
    return (
      <View style={styles.card}>
        <InfoRow label={title} value="סרוק כרטיס" valueColor={colors.textSecondary} />
      </View>
    );
  }
  const outcome = pick(scan);
  if (outcome.kind === 'ok') {
    return (
      <View style={styles.card}>
        <InfoRow label={title} value={render(outcome.data)} />
      </View>
    );
  }
  if (outcome.kind === 'not_implemented') {
    return <NotImplementedCard title={title} message={notImplementedMessage} icon={icon} />;
  }
  return (
    <View style={styles.card}>
      <InfoRow label={title} value={outcome.error.message} valueColor={colors.danger} />
    </View>
  );
}

const CARD_TYPE_TEXT: Record<CardScan['cardType'], { text: string; color: string }> = {
  unverified_iso_dep: { text: 'זוהה כרטיס NFC. לא אומת שהוא רב-קו', color: colors.warning },
  ravkav: { text: 'כרטיס רב-קו', color: colors.success },
  not_ravkav: { text: 'כרטיס אחר (לא רב-קו)', color: colors.warning }
};

export default function NfcScreen(_props: BottomTabScreenProps<TabParamList, 'RavKav'>) {
  const { state, start, cancel } = useNfc();
  const { phase, scan, failure, reason } = state;
  const scanning = phase === 'waiting' || phase === 'reading';
  const badge = NFC_BADGE[phase];

  useEffect(() => {
    if (phase === 'done') haptics.success();
    if (phase === 'error') haptics.error();
  }, [phase]);

  const blocked = phase === 'unsupported' || phase === 'checking' || phase === 'not_implemented';
  const buttonTitle = scanning ? 'ביטול' : phase === 'disabled' ? 'פתח הגדרות NFC' : 'סריקת רב-קו';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="רב-קו" subtitle="סריקה וקריאת כרטיס" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <ScanGraphic scanning={scanning} done={phase === 'done'} />
          <StatusBadge label={`NFC: ${badge.label}`} kind={badge.kind} />
          <AppText variant="body" tone="textSecondary" style={styles.center}>
            {phase === 'not_implemented'
              ? reason
              : STATUS_TEXT[phase] ?? 'לקריאת הרב-קו יש להצמיד את הכרטיס לגב המכשיר.'}
          </AppText>
          {failure ? (
            <AppText variant="caption" style={[styles.center, { color: colors.danger }]} accessibilityRole="alert">
              {failure.message}
            </AppText>
          ) : null}
          <PrimaryButton
            title={buttonTitle}
            icon={scanning ? 'close' : 'scan-outline'}
            onPress={scanning ? cancel : start}
            disabled={blocked}
          />
          <View style={styles.readOnly} accessible accessibilityLabel="קריאה בלבד, האפליקציה לא כותבת לכרטיס">
            <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
            <AppText variant="label">קריאה בלבד · האפליקציה לא כותבת לכרטיס</AppText>
          </View>
        </View>

        <SectionHeader title="הכרטיס" />
        <View style={styles.card}>
          {scan ? (
            <>
              <InfoRow label="כרטיס זוהה" value="כן" valueColor={colors.success} />
              <InfoRow label="מזהה (UID)" value={scan.uid ?? 'לא זמין'} />
              <InfoRow label="סוג" value={CARD_TYPE_TEXT[scan.cardType].text} valueColor={CARD_TYPE_TEXT[scan.cardType].color} />
            </>
          ) : (
            <AppText variant="caption">עדיין לא נסרק כרטיס. לחץ על "סריקת רב-קו" והצמד את הכרטיס.</AppText>
          )}
        </View>

        <SectionHeader title="יתרה ופרופיל" />
        <View style={styles.stack}>
          <CardPart
            title="יתרה"
            icon="wallet-outline"
            scan={scan}
            pick={(c) => c.balance}
            render={(b) => `${(b.agorot / 100).toFixed(2)} ₪`}
            notImplementedMessage={NO_BALANCE_REASON}
          />
          <CardPart
            title="פרופיל הנחה"
            icon="pricetag-outline"
            scan={scan}
            pick={(c) => c.profile}
            render={(p) => p.name}
            notImplementedMessage="פרופיל ההנחה אינו נקרא עד שיוטמע מפרט מאומת."
          />
        </View>

        <SectionHeader title="היסטוריה" />
        <CardPart
          title="היסטוריית כרטיס"
          icon="time-outline"
          scan={scan}
          pick={(c) => c.history}
          render={(h) => `${h.length} רשומות`}
          notImplementedMessage="קריאת היסטוריית הנסיעות מהכרטיס אינה זמינה עד שיוטמע מפרט מאומת."
        />

        <SectionHeader title="טעינה" />
        <NotImplementedCard
          title="טעינת רב-קו"
          message="טעינה וכתיבה לכרטיס מתבצעות רק במערכות הטעינה הרשמיות. האפליקציה קוראת בלבד."
          icon="flash-outline"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  hero: {
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  graphic: { width: space(32), height: space(32), alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: space(32),
    height: space(32),
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary
  },
  core: {
    width: space(22),
    height: space(22),
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center'
  },
  center: { textAlign: 'center' },
  card: { gap: space(3), padding: space(4), borderRadius: radius.md, backgroundColor: colors.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(3) },
  stack: { gap: space(2) },
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) }
});
