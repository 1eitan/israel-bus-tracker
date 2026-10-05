import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import PlaceListItem from '../components/PlaceListItem';
import RouteCard from '../components/RouteCard';
import ScreenHeader from '../components/ScreenHeader';
import SearchInput from '../components/SearchInput';
import { useLocation } from '../hooks/useLocation';
import { fetchRoutes } from '../lib/api';
import { KEYS, loadJson, saveJson } from '../lib/storage';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { colors, fonts, radius, space } from '../theme/tokens';
import type { RouteSummary } from '../types/bus';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Plan'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface Place {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  lat?: number;
  lon?: number;
}

type TopTab = 'stops' | 'lines' | 'plan';

/** ערכי ברירת מחדל בלבד - עד שהמשתמש עורך/מוסיף. נשמרים מקומית ב-AsyncStorage. */
const DEFAULT_FAVORITES: Place[] = [
  { id: 'fav-home', title: 'בית', icon: 'home-outline' },
  { id: 'fav-oren', title: 'אורן משי - שכונת הפארק', icon: 'star-outline' },
  { id: 'fav-ikea', title: 'איקאה/יגאל אלון', icon: 'star-outline' }
];
const DEFAULT_RECENTS: Place[] = [
  { id: 'rec-1', title: 'מסעד שסגב שלום/כביש 25', icon: 'time-outline' },
  { id: 'rec-2', title: 'תחנה מרכזית באר שבע/רציפים', icon: 'time-outline' }
];

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'stops', label: 'תחנות' },
  { key: 'lines', label: 'קווים' },
  { key: 'plan', label: 'תכנון מסלול' }
];

export default function RoutePlanningScreen({ navigation }: Props) {
  const [tab, setTab] = useState<TopTab>('plan');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Place[]>(DEFAULT_FAVORITES);
  const [recents, setRecents] = useState<Place[]>(DEFAULT_RECENTS);
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [lineQuery, setLineQuery] = useState('');
  const { permission, requestPermission } = useLocation(false);

  useEffect(() => {
    void loadJson(KEYS.favorites, DEFAULT_FAVORITES).then(setFavorites);
    void loadJson(KEYS.recents, DEFAULT_RECENTS).then(setRecents);
  }, []);

  // "תחנות" פותח את המפה; בחזרה חוזרים ללשונית התכנון
  useFocusEffect(
    useCallback(() => {
      setTab((current) => (current === 'stops' ? 'plan' : current));
    }, [])
  );

  useEffect(() => {
    if (tab !== 'lines' || routes.length > 0) return;
    void fetchRoutes().then(setRoutes).catch(() => Alert.alert('שגיאה', 'לא הצלחנו לטעון את רשימת הקווים.'));
  }, [tab, routes.length]);

  const filteredRoutes = useMemo(() => {
    const q = lineQuery.trim();
    if (!q) return routes;
    return routes.filter((r) => r.shortName.includes(q) || r.longName.includes(q));
  }, [routes, lineQuery]);

  const onTab = (next: TopTab) => {
    if (next === 'stops') navigation.navigate('Map');
    else setTab(next);
  };

  const rememberRecent = (place: Place) => {
    const next = [place, ...recents.filter((r) => r.title !== place.title)].slice(0, 8);
    setRecents(next);
    void saveJson(KEYS.recents, next);
  };

  /** יעד -> קואורדינטות (geocoding של המכשיר) -> מפה */
  const goTo = async (place: Place) => {
    try {
      let { lat, lon } = place;
      if (lat === undefined || lon === undefined) {
        const found = await Location.geocodeAsync(place.title);
        if (found.length === 0) {
          Alert.alert('לא נמצא מיקום', `לא הצלחנו למצוא את "${place.title}".`);
          return;
        }
        lat = found[0].latitude;
        lon = found[0].longitude;
      }
      rememberRecent({ ...place, id: `rec-${place.title}`, icon: 'time-outline', lat, lon });
      navigation.navigate('Map', { focus: { lat, lon, label: place.title } });
    } catch {
      Alert.alert('שגיאה', 'חיפוש המיקום נכשל. בדוק חיבור לאינטרנט ונסה שוב.');
    }
  };

  const removeFrom = (list: 'fav' | 'rec', id: string) => {
    if (list === 'fav') {
      const next = favorites.filter((p) => p.id !== id);
      setFavorites(next);
      void saveJson(KEYS.favorites, next);
    } else {
      const next = recents.filter((p) => p.id !== id);
      setRecents(next);
      void saveJson(KEYS.recents, next);
    }
  };

  const openMenu = (list: 'fav' | 'rec', place: Place) =>
    Alert.alert(place.title, undefined, [
      { text: 'מחיקה', style: 'destructive', onPress: () => removeFrom(list, place.id) },
      { text: 'ביטול', style: 'cancel' }
    ]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="תכנון מסלול" />

      <View style={styles.tabs}>
        {TOP_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</AppText>
            </Pressable>
          );
        })}
      </View>

      {tab === 'lines' ? (
        <View style={styles.flex}>
          <View style={styles.pad}>
            <SearchInput placeholder="חיפוש קו" value={lineQuery} onChangeText={setLineQuery} />
          </View>
          <FlatList
            data={filteredRoutes}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: space(2) }} />}
            ListEmptyComponent={<AppText variant="caption">לא נמצאו קווים.</AppText>}
            renderItem={({ item }) => (
              <RouteCard
                routeNumber={item.shortName}
                destination={item.longName || `קו ${item.shortName}`}
                eta=""
                badgeColor={item.color}
                badgeTextColor={item.textColor}
                onPress={() => navigation.navigate('Map', { routeId: item.id })}
              />
            )}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          <View style={styles.inputs}>
            <SearchInput
              icon="locate"
              placeholder="יציאה ממיקומך הנוכחי"
              displayValue="יציאה ממיקומך הנוכחי"
              onPress={() => {
                if (permission !== 'granted') void requestPermission();
              }}
            />
            <SearchInput
              icon="search"
              placeholder="לאן נוסעים?"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
                const title = query.trim();
                if (title) void goTo({ id: 'q', title, icon: 'time-outline' });
              }}
            />
          </View>

          <AppText variant="heading" style={styles.sectionTitle}>
            מועדפים
          </AppText>
          {favorites.map((p) => (
            <PlaceListItem
              key={p.id}
              icon={p.icon}
              title={p.title}
              onPress={() => void goTo(p)}
              onMenuPress={() => openMenu('fav', p)}
            />
          ))}

          <AppText variant="heading" style={styles.sectionTitle}>
            חיפושים אחרונים
          </AppText>
          {recents.map((p) => (
            <PlaceListItem
              key={p.id}
              icon={p.icon}
              title={p.title}
              onPress={() => void goTo(p)}
              onMenuPress={() => openMenu('rec', p)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  pad: { paddingHorizontal: space(4), paddingBottom: space(3) },
  tabs: { flexDirection: 'row', gap: space(2), paddingHorizontal: space(4), paddingBottom: space(4) },
  tab: {
    paddingHorizontal: space(4),
    height: space(9),
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  tabTextActive: { color: colors.text },
  list: { paddingHorizontal: space(4), paddingBottom: space(8) },
  inputs: { gap: space(3) },
  sectionTitle: { marginTop: space(6), marginBottom: space(1) }
});
