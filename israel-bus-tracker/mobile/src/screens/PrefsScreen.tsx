import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import ListItem from '../components/ListItem';
import NotImplementedCard from '../components/NotImplementedCard';
import ScreenHeader from '../components/ScreenHeader';
import SearchInput from '../components/SearchInput';
import SectionHeader from '../components/SectionHeader';
import ToggleRow from '../components/ToggleRow';
import UnavailableSheet, { useUnavailableSheet } from '../components/UnavailableSheet';
import { usePlaces } from '../hooks/usePlaces';
import { useProfile } from '../hooks/useProfile';
import { haptics } from '../lib/haptics';
import { persistOptions, queryClient } from '../lib/queryClient';
import type { PrefsKind, RootStackParamList } from '../navigation/types';
import { MAX_NAME_LENGTH } from '../profile/provider';
import { clearAllLocalData } from '../providers/clearData';
import { useServices } from '../providers/context';
import { colors, radius, space } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Prefs'>;

const TITLES: Record<PrefsKind, { title: string; subtitle: string }> = {
  settings: { title: 'הגדרות', subtitle: 'שם תצוגה ורטט' },
  notifications: { title: 'התראות', subtitle: 'העדפות התראה' },
  privacy: { title: 'פרטיות', subtitle: 'היסטוריה ונתונים במכשיר' }
};

/** מסך העדפות אחד לשלוש הקטגוריות (הגדרות / התראות / פרטיות). הכול נשמר במכשיר דרך ProfileProvider. */
export default function PrefsScreen({ navigation, route }: Props) {
  const { kind } = route.params;
  const services = useServices();
  const { snapshot, profile } = useProfile();
  const places = usePlaces();
  const sheet = useUnavailableSheet();
  const [name, setName] = useState(snapshot.profile.displayName ?? '');

  // סנכרון שדה השם כשהערך נטען מהאחסון
  useEffect(() => setName(snapshot.profile.displayName ?? ''), [snapshot.profile.displayName]);

  const saveName = () => {
    if ((snapshot.profile.displayName ?? '') !== name.trim()) void profile.updateProfile({ displayName: name });
  };

  /**
   * מחיקת כל הנתונים כוללת את מטמון ה-offline של React Query: הוא נשמר בדיסק עד 24 שעות
   * ומכיל תחנות/הגעות לפי מיקום מעוגל (~110 מ׳) של המשתמש, ולכן חייב להימחק גם הוא.
   */
  const wipeEverything = async () => {
    await clearAllLocalData(services);
    queryClient.clear();
    await persistOptions.persister.removeClient();
  };

  const confirm = (title: string, message: string, action: () => void) =>
    Alert.alert(title, message, [
      { text: 'מחיקה', style: 'destructive', onPress: action },
      { text: 'ביטול', style: 'cancel' }
    ]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={TITLES[kind].title} subtitle={TITLES[kind].subtitle} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {kind === 'settings' ? (
          <>
            <SectionHeader title="שם תצוגה" />
            <SearchInput
              icon="person-outline"
              placeholder="איך לקרוא לך?"
              value={name}
              onChangeText={setName}
              onEndEditing={saveName}
              onSubmitEditing={saveName}
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="done"
              onClear={() => setName('')}
            />
            <AppText variant="caption" style={styles.hint}>
              השם נשמר במכשיר בלבד ואינו נשלח לשום שרת.
            </AppText>

            <SectionHeader title="תצוגה ומשוב" />
            <View style={styles.group}>
              <ToggleRow
                title="רטט עדין"
                subtitle="משוב haptic בלחיצות"
                value={snapshot.settings.haptics}
                onValueChange={(haptics) => void profile.updateSettings({ haptics })}
                last
              />
            </View>

            <SectionHeader title="חשבון" />
            <View style={styles.group}>
              <ListItem
                icon="sync-outline"
                title="סנכרון עם חשבון"
                subtitle="גיבוי מועדפים והגדרות"
                trailingText="לא זמין"
                onPress={async () => {
                  const r = await profile.syncWithAccount();
                  if (r.kind === 'not_implemented') sheet.show('סנכרון עם חשבון', r.reason);
                  else if (r.kind === 'error') sheet.show('סנכרון עם חשבון', r.error.message);
                }}
                last
              />
            </View>
          </>
        ) : null}

        {kind === 'notifications' ? (
          <>
            <NotImplementedCard
              title="שירות ההתראות אינו מחובר"
              message="אפשר לבחור מה מעניין אותך והבחירה תישמר, אך לא יישלחו התראות עד שיחובר שירות התראות בצד השרת."
              icon="notifications-outline"
            />
            <SectionHeader title="סוגי התראות" />
            <View style={styles.group}>
              <ToggleRow
                title="זמני הגעה"
                subtitle="תחנות וקווים מועדפים"
                value={snapshot.notifications.arrivals}
                onValueChange={(arrivals) => void profile.updateNotifications({ arrivals })}
              />
              <ToggleRow
                title="עיכובים והפרעות"
                subtitle="הפרעות בקווים שאתה משתמש בהם"
                value={snapshot.notifications.disruptions}
                onValueChange={(disruptions) => void profile.updateNotifications({ disruptions })}
              />
              <ToggleRow
                title="עדכוני שירות"
                subtitle="שינויי מסלולים ולוחות זמנים"
                value={snapshot.notifications.serviceUpdates}
                onValueChange={(serviceUpdates) => void profile.updateNotifications({ serviceUpdates })}
                last
              />
            </View>
          </>
        ) : null}

        {kind === 'privacy' ? (
          <>
            <SectionHeader title="היסטוריה" />
            <View style={styles.group}>
              <ToggleRow
                title="שמירת חיפושים אחרונים"
                subtitle="כבוי = חיפושים חדשים לא נשמרים בכלל"
                value={snapshot.privacy.saveSearchHistory}
                onValueChange={(saveSearchHistory) => void profile.updatePrivacy({ saveSearchHistory })}
              />
              <ListItem
                icon="trash-outline"
                title="מחיקת חיפושים אחרונים"
                subtitle={`${places.recents.length} חיפושים שמורים`}
                onPress={() => confirm('למחוק את כל החיפושים האחרונים?', 'לא ניתן לשחזר.', places.clearRecents)}
                last
              />
            </View>

            <SectionHeader title="נתונים במכשיר" />
            <View style={styles.group}>
              <ListItem
                icon="warning-outline"
                title="מחיקת כל הנתונים"
                subtitle="מועדפים, היסטוריה, שם והעדפות"
                iconColor={colors.danger}
                onPress={() =>
                  confirm('למחוק את כל הנתונים במכשיר?', 'מועדפים, היסטוריה, שם והעדפות יימחקו. לא ניתן לשחזר.', () => {
                    haptics.success();
                    wipeEverything().catch(() => Alert.alert('המחיקה נכשלה', 'לא הצלחנו למחוק את כל הנתונים. נסה שוב.'));
                  })
                }
                last
              />
            </View>

            <SectionHeader title="מה האפליקציה לא עושה" />
            <View style={styles.info}>
              <AppText variant="caption">• לא שומרת מספר כרטיס אשראי, CVV או סודות. פרטי תשלום מוזנים רק אצל ספק הסליקה.</AppText>
              <AppText variant="caption">• לא כותבת לכרטיס הרב-קו, ולא שומרת מידע שנקרא ממנו.</AppText>
              <AppText variant="caption">• הרשאת המיקום מנוהלת בהגדרות המכשיר ומשמשת להצגת תחנות בקרבתך.</AppText>
            </View>
          </>
        ) : null}
      </ScrollView>
      <UnavailableSheet state={sheet.state} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  group: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
  hint: { marginTop: space(2) },
  info: { gap: space(2), padding: space(4), borderRadius: radius.md, backgroundColor: colors.surface }
});
