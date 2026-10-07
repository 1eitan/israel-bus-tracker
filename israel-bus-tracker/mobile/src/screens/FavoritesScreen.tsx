import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import EmptyState from '../components/EmptyState';
import FavoriteCard from '../components/FavoriteCard';
import ListItem from '../components/ListItem';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import { useFavoriteRoutes } from '../hooks/useFavoriteRoutes';
import { useFavoriteStops } from '../hooks/useFavoriteStops';
import { usePlaces } from '../hooks/usePlaces';
import { useRoutes } from '../hooks/queries';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

/** מועדפים: מקומות, תחנות וקווים. הכול מקומי ועובד offline (שמות קווים מהמטמון אם קיים). */
export default function FavoritesScreen({ navigation }: Props) {
  const places = usePlaces();
  const stops = useFavoriteStops();
  const routes = useFavoriteRoutes();
  const routeList = useRoutes(routes.ids.length > 0);
  const nameOf = (id: string) => routeList.data?.find((r) => r.id === id)?.shortName ?? id;

  const confirmRemove = (title: string, onRemove: () => void) =>
    Alert.alert(title, undefined, [
      { text: 'הסרה מהמועדפים', style: 'destructive', onPress: onRemove },
      { text: 'ביטול', style: 'cancel' }
    ]);

  const empty = places.favorites.length === 0 && stops.favorites.length === 0 && routes.ids.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="מועדפים" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {empty ? <EmptyState icon="star-outline" title="אין מועדפים עדיין" message="מקומות, תחנות וקווים שתשמור יופיעו כאן." /> : null}

        {places.favorites.length > 0 ? (
          <>
            <SectionHeader title="מקומות" />
            <View style={styles.stack}>
              {places.favorites.map((place) => (
                <FavoriteCard
                  key={place.id}
                  icon={place.icon}
                  title={place.title}
                  subtitle={place.subtitle}
                  onPress={
                    place.lat !== undefined && place.lon !== undefined
                      ? () => navigation.navigate('Map', { focus: { lat: place.lat as number, lon: place.lon as number, label: place.title } })
                      : undefined
                  }
                  onMenuPress={() => confirmRemove(place.title, () => places.removeFavorite(place.id))}
                />
              ))}
            </View>
          </>
        ) : null}

        {stops.favorites.length > 0 ? (
          <>
            <SectionHeader title="תחנות" />
            <View style={styles.group}>
              {stops.favorites.map((stop, i) => (
                <ListItem
                  key={stop.id}
                  icon="location-outline"
                  title={stop.name}
                  subtitle={stop.code ? `תחנה ${stop.code}` : undefined}
                  onPress={() => navigation.navigate('Map', { focus: { lat: stop.lat, lon: stop.lon, label: stop.name } })}
                  last={i === stops.favorites.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        {routes.ids.length > 0 ? (
          <>
            <SectionHeader title="קווים" />
            <View style={styles.group}>
              {routes.ids.map((id, i) => (
                <ListItem
                  key={id}
                  icon="bus-outline"
                  title={`קו ${nameOf(id)}`}
                  onPress={() => navigation.navigate('Map', { routeId: id })}
                  last={i === routes.ids.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  stack: { gap: space(2) },
  group: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }
});
