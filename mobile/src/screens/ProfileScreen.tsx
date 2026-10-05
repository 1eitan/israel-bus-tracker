import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Alert, I18nManager, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import ScreenHeader from '../components/ScreenHeader';
import { KEYS, loadJson } from '../lib/storage';
import type { TabParamList } from '../navigation/types';
import { colors, fonts, radius, space } from '../theme/tokens';

interface Profile {
  name: string;
  type: string;
  chargeAgorot: number;
}

/** ללא backend לחשבון משתמשים - הערכים נשמרים מקומית; ברירת מחדל לפי העיצוב */
const DEFAULT_PROFILE: Profile = { name: 'אורח', type: 'בוגר', chargeAgorot: 0 };

export default function ProfileScreen({ navigation }: BottomTabScreenProps<TabParamList, 'Profile'>) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    void loadJson<Profile>(KEYS.profile, DEFAULT_PROFILE).then(setProfile);
  }, []);

  const unavailable = (title: string) => () =>
    Alert.alert(title, 'המסך הזה יחובר לשירותי החשבון של המפעיל. כרגע הוא לא זמין באפליקציה.');

  const items: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    { label: 'היסטוריית נסיעות וחיובים', icon: 'receipt-outline', onPress: unavailable('היסטוריית נסיעות וחיובים') },
    { label: 'אמצעי תשלום', icon: 'card-outline', onPress: () => navigation.navigate('Payment') },
    { label: 'שירותי אגד', icon: 'bus-outline', onPress: unavailable('שירותי אגד') },
    { label: 'עדכון הנחת פרופיל', icon: 'pricetag-outline', onPress: unavailable('עדכון הנחת פרופיל') },
    { label: 'נוסעים נוספים', icon: 'people-outline', onPress: unavailable('נוסעים נוספים') }
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="אזור אישי" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.text} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="title">{profile.name}</AppText>
            <AppText variant="caption">{profile.type}</AppText>
          </View>
          <View style={styles.charge}>
            <AppText variant="caption">טעינה נוכחית</AppText>
            <AppText variant="heading">{`${(profile.chargeAgorot / 100).toFixed(2)} ₪`}</AppText>
          </View>
        </View>

        <View style={styles.menu}>
          {items.map((item) => (
            <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={styles.row}>
              <Ionicons name={item.icon} size={22} color={colors.text} />
              <AppText style={styles.rowText}>{item.label}</AppText>
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space(4), gap: space(4) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: space(12),
    height: space(12),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: { flex: 1 },
  charge: { alignItems: 'flex-end' },
  menu: { borderRadius: radius.md, backgroundColor: colors.card, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    height: space(14),
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  rowText: { flex: 1, fontFamily: fonts.medium }
});
