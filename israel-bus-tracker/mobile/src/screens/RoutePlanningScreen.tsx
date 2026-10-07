import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import Chip from '../components/Chip';
import ScreenHeader from '../components/ScreenHeader';
import { usePlaces } from '../hooks/usePlaces';
import { haptics } from '../lib/haptics';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { colors, space } from '../theme/tokens';
import LinesTab from './plan/LinesTab';
import PlanTab, { type GoToTarget } from './plan/PlanTab';
import StopsTab from './plan/StopsTab';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Plan'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TopTab = 'stops' | 'lines' | 'plan';

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'stops', label: 'תחנות' },
  { key: 'lines', label: 'קווים' },
  { key: 'plan', label: 'תכנון מסלול' }
];

/** מסך הבית: תכנון מסלול / תחנות / קווים. */
export default function RoutePlanningScreen({ navigation }: Props) {
  const [tab, setTab] = useState<TopTab>('plan');
  const [screenFocused, setScreenFocused] = useState(true);
  const places = usePlaces();

  // לא מבקשים מיקום / לא מושכים נתונים כשהמסך אינו בפוקוס
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  /** יעד -> קואורדינטות (geocoding של המכשיר) -> מפה */
  const goTo = useCallback(
    async (place: GoToTarget) => {
      try {
        let { lat, lon } = place;
        if (lat === undefined || lon === undefined) {
          const found = await Location.geocodeAsync(place.title);
          if (found.length === 0) {
            haptics.error();
            Alert.alert('לא נמצא מיקום', `לא הצלחנו למצוא את "${place.title}".`);
            return;
          }
          lat = found[0].latitude;
          lon = found[0].longitude;
        }
        places.addRecent({ title: place.title, subtitle: place.subtitle, lat, lon });
        haptics.success();
        navigation.navigate('Map', { focus: { lat, lon, label: place.title } });
      } catch {
        haptics.error();
        Alert.alert('שגיאה', 'חיפוש המיקום נכשל. בדוק חיבור לאינטרנט ונסה שוב.');
      }
    },
    [navigation, places]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="תכנון מסלול" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
        accessibilityRole="tablist"
      >
        {TOP_TABS.map((t) => (
          <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </ScrollView>

      {tab === 'plan' ? (
        <PlanTab
          favorites={places.favorites}
          recents={places.recents}
          isFavorite={places.isFavorite}
          onGoTo={goTo}
          onRecord={(title) => places.addRecent({ title })}
          onToggleFavorite={(place) => places.toggleFavorite(place)}
          onRemoveFavorite={places.removeFavorite}
          onRemoveRecent={places.removeRecent}
          onClearRecents={places.clearRecents}
        />
      ) : null}
      {tab === 'stops' ? (
        <StopsTab
          focused={screenFocused}
          onOpenMap={(focus) => navigation.navigate('Map', focus ? { focus } : undefined)}
        />
      ) : null}
      {tab === 'lines' ? (
        <LinesTab focused={screenFocused} onOpenRoute={(routeId) => navigation.navigate('Map', { routeId })} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabsScroll: { flexGrow: 0 },
  tabs: { paddingHorizontal: space(4), paddingBottom: space(4), gap: space(2) }
});
