import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import EmptyState from '../components/EmptyState';
import RecentSearchCard from '../components/RecentSearchCard';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import AppText from '../components/AppText';
import { usePlaces } from '../hooks/usePlaces';
import { useProfile } from '../hooks/useProfile';
import type { RootStackParamList } from '../navigation/types';
import { colors, space } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

/** היסטוריית חיפושים: שמירה, בלי כפילויות, עד 10, מחיקה בודדת ו"נקה הכול". עובד offline. */
export default function HistoryScreen({ navigation }: Props) {
  const places = usePlaces();
  const { snapshot } = useProfile();
  const saving = snapshot.privacy.saveSearchHistory;

  const confirmClear = () =>
    Alert.alert('למחוק את כל החיפושים האחרונים?', undefined, [
      { text: 'מחיקה', style: 'destructive', onPress: places.clearRecents },
      { text: 'ביטול', style: 'cancel' }
    ]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="היסטוריה" subtitle="חיפושים אחרונים" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {!saving ? (
          <AppText variant="caption" style={styles.note} accessibilityRole="alert">
            שמירת היסטוריה כבויה בהגדרות הפרטיות, ולכן חיפושים חדשים לא נשמרים.
          </AppText>
        ) : null}
        <SectionHeader
          title="חיפושים אחרונים"
          actionLabel={places.recents.length > 0 ? 'נקה הכול' : undefined}
          onActionPress={confirmClear}
        />
        {places.recents.length === 0 ? (
          <EmptyState icon="time-outline" title="אין חיפושים אחרונים" message="יעדים שחיפשת יופיעו כאן." />
        ) : (
          places.recents.map((place) => (
            <RecentSearchCard
              key={place.id}
              title={place.title}
              subtitle={place.subtitle}
              isFavorite={places.isFavorite(place.title)}
              onToggleFavorite={() =>
                places.toggleFavorite({ title: place.title, subtitle: place.subtitle, lat: place.lat, lon: place.lon })
              }
              onPress={
                place.lat !== undefined && place.lon !== undefined
                  ? () => navigation.navigate('Map', { focus: { lat: place.lat as number, lon: place.lon as number, label: place.title } })
                  : undefined
              }
              onRemove={() => places.removeRecent(place.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  note: { marginBottom: space(2) }
});
