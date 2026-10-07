import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import ListItem from '../components/ListItem';
import PressableScale from '../components/PressableScale';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import UnavailableSheet, { useUnavailableSheet } from '../components/UnavailableSheet';
import { haptics } from '../lib/haptics';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Services'>;

interface Tile {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** האם יש מאחוריו פונקציונליות אמיתית */
  available: boolean;
  onPress: () => void;
}

/** מסך שירותי תחבורה. רק "אוטובוסים" ו"תחנות" מחוברים לנתונים אמיתיים (דרך המפה). */
export default function ServicesScreen({ navigation }: Props) {
  const sheet = useUnavailableSheet();

  const tiles: Tile[] = [
    { key: 'train', label: 'רכבת', icon: 'train-outline', available: false, onPress: () => sheet.show('רכבת', 'נתוני רכבת ישראל עדיין אינם מחוברים לאפליקציה.') },
    { key: 'bus', label: 'אוטובוסים', icon: 'bus-outline', available: true, onPress: () => navigation.navigate('Map') },
    { key: 'stops', label: 'תחנות', icon: 'location-outline', available: true, onPress: () => navigation.navigate('Map') },
    { key: 'metro', label: 'מטרונית', icon: 'subway-outline', available: false, onPress: () => sheet.show('מטרונית', 'נתוני המטרונית עדיין אינם מחוברים לאפליקציה.') }
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="שירותי תחבורה" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <PressableScale
              key={tile.key}
              accessibilityRole="button"
              accessibilityLabel={`${tile.label}${tile.available ? '' : ', עדיין לא זמין'}`}
              onPress={() => {
                haptics.select();
                tile.onPress();
              }}
              style={styles.tile}
              pressedStyle={styles.tilePressed}
            >
              <View style={[styles.tileIcon, !tile.available && styles.tileIconOff]}>
                <Ionicons name={tile.icon} size={26} color={tile.available ? colors.primaryText : colors.textSecondary} />
              </View>
              <AppText variant="heading">{tile.label}</AppText>
              {tile.available ? null : <StatusBadge label="בקרוב" kind="neutral" />}
            </PressableScale>
          ))}
        </View>

        <SectionHeader title="מידע" />
        <View style={styles.group}>
          <ListItem
            icon="information-circle-outline"
            title="מידע שירות"
            subtitle="שינויים בקווים והודעות מפעילים"
            trailingText="לא זמין"
            onPress={() => sheet.show('מידע שירות', 'הודעות שירות ושינויים בקווים יופיעו כאן לאחר חיבור מקור מידע.')}
          />
          <ListItem
            icon="notifications-outline"
            title="התראות"
            subtitle="עיכובים וביטולים בקווים שלי"
            trailingText="לא זמין"
            onPress={() => sheet.show('התראות', 'התראות דורשות שירות התראות בצד השרת, שעדיין אינו מחובר.')}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: space(3),
    minHeight: space(32),
    padding: space(4),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  tilePressed: { backgroundColor: colors.surfaceElevated },
  tileIcon: {
    width: space(12),
    height: space(12),
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tileIconOff: { backgroundColor: colors.surfaceElevated },
  group: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }
});
