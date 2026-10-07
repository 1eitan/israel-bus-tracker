import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import DemoBadge from '../components/DemoBadge';
import ListItem from '../components/ListItem';
import ScreenHeader from '../components/ScreenHeader';
import SecondaryButton from '../components/SecondaryButton';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import UnavailableSheet, { useUnavailableSheet } from '../components/UnavailableSheet';
import { useAuthSession } from '../hooks/useAuthSession';
import { useFavoriteStops } from '../hooks/useFavoriteStops';
import { usePlaces } from '../hooks/usePlaces';
import { useProfile } from '../hooks/useProfile';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const sheet = useUnavailableSheet();
  const places = usePlaces();
  const stops = useFavoriteStops();
  const { snapshot } = useProfile();
  const { session, auth } = useAuthSession();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const name = snapshot.profile.displayName ?? session?.displayName ?? 'אורח';

  /**
   * התחברות/התנתקות דרך AuthProvider. אין שרת חשבונות => NOT_IMPLEMENTED וה-UI אומר זאת.
   * (ב-Mock המצב "מחובר" הוא הדגמה בלבד ומסומן ככזה.)
   */
  const onAuthPress = async () => {
    if (session) {
      await auth.signOut();
      return;
    }
    const result = await auth.signIn({ method: 'email', identifier: 'demo@example.com' });
    if (result.kind === 'not_implemented') sheet.show('התחברות', result.reason);
    else if (result.kind === 'error') sheet.show('התחברות', result.error.message);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="אזור אישי" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.onPrimary} />
          </View>
          <View style={styles.profileText}>
            <AppText variant="title" numberOfLines={1}>
              {name}
            </AppText>
            <AppText variant="caption">
              {session ? 'מחובר' : 'מצב אורח · התחברות וחשבון אישי עדיין אינם זמינים'}
            </AppText>
          </View>
          {auth.isMock ? <DemoBadge /> : <StatusBadge label={session ? 'מחובר' : 'אורח'} kind="neutral" />}
        </View>
        <View style={styles.authButton}>
          <SecondaryButton title={session ? 'התנתקות' : 'התחברות'} icon={session ? 'log-out-outline' : 'log-in-outline'} onPress={() => void onAuthPress()} />
        </View>

        <SectionHeader title="הנסיעות שלי" />
        <View style={styles.group}>
          <ListItem
            icon="star-outline"
            title="מועדפים"
            subtitle={`${places.favorites.length} מקומות · ${stops.favorites.length} תחנות`}
            onPress={() => navigation.navigate('Favorites')}
          />
          <ListItem
            icon="time-outline"
            title="היסטוריה"
            subtitle={places.recents.length > 0 ? `${places.recents.length} חיפושים אחרונים` : 'אין חיפושים אחרונים'}
            onPress={() => navigation.navigate('History')}
          />
          <ListItem
            icon="receipt-outline"
            title="היסטוריית נסיעות"
            subtitle="נסיעות וחיובים"
            trailingText="לא זמין"
            onPress={() => sheet.show('היסטוריית נסיעות', 'היסטוריית הנסיעות תחובר לשירותי החשבון והתשלום.')}
          />
          <ListItem
            icon="grid-outline"
            title="שירותי תחבורה"
            subtitle="רכבת, אוטובוסים, תחנות ועוד"
            onPress={() => navigation.navigate('Services')}
            last
          />
        </View>

        <SectionHeader title="העדפות" />
        <View style={styles.group}>
          <ListItem icon="settings-outline" title="הגדרות" subtitle="שם תצוגה ורטט" onPress={() => navigation.navigate('Prefs', { kind: 'settings' })} />
          <ListItem
            icon="notifications-outline"
            title="התראות"
            subtitle={snapshot.notifications.arrivals || snapshot.notifications.disruptions || snapshot.notifications.serviceUpdates ? 'העדפות נשמרו' : 'כבויות'}
            onPress={() => navigation.navigate('Prefs', { kind: 'notifications' })}
          />
          <ListItem icon="lock-closed-outline" title="פרטיות" subtitle="היסטוריה ונתונים במכשיר" onPress={() => navigation.navigate('Prefs', { kind: 'privacy' })} last />
        </View>

        <SectionHeader title="תמיכה" />
        <View style={styles.group}>
          <ListItem icon="help-circle-outline" title="עזרה" subtitle="שאלות נפוצות ויצירת קשר" onPress={() => navigation.navigate('Help')} />
          <ListItem icon="information-circle-outline" title="אודות" subtitle={`גרסה ${version}`} last />
        </View>
      </ScrollView>
      <UnavailableSheet state={sheet.state} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: space(14),
    height: space(14),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileText: { flex: 1, gap: 2 },
  authButton: { marginTop: space(3) },
  group: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }
});
