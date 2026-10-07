import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import AppText from '../../components/AppText';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import LocationGate, { isLocationBlocking } from '../../components/LocationGate';
import SecondaryButton from '../../components/SecondaryButton';
import StationCard from '../../components/StationCard';
import { useAppActive } from '../../hooks/useAppActive';
import { useFavoriteStops } from '../../hooks/useFavoriteStops';
import { useLocation } from '../../hooks/useLocation';
import { useNearbyStops } from '../../hooks/useNearbyStops';
import { useNow } from '../../hooks/useNow';
import { toArrivalRow } from '../../lib/arrivals';
import type { NearbyStop } from '../../lib/api';
import { formatDistance } from '../../lib/geo';
import { colors, space } from '../../theme/tokens';

interface Props {
  /** הלשונית פעילה - רק אז מבקשים מיקום ומושכים נתונים */
  focused: boolean;
  onOpenMap: (stop?: { lat: number; lon: number; label: string }) => void;
}

/** מפריד יציב: קומפוננטה אנונימית בתוך הרינדור נוצרת מחדש בכל רינדור ומרנדרת את כל המפרידים מחדש */
const Gap = () => <View style={styles.gap} />;

/** לשונית "תחנות": תחנות בסביבה כ-StationCard עם זמני הגעה חיים (אם ה-backend זמין). */
export default function StopsTab({ focused, onOpenMap }: Props) {
  const appActive = useAppActive();
  const now = useNow(15000);
  const gps = useLocation(focused);
  const { location } = gps;
  const nearby = useNearbyStops(location, appActive && focused);
  const { toggle, isFavorite } = useFavoriteStops();

  const stops = useMemo<NearbyStop[]>(() => nearby.data?.stops ?? [], [nearby.data]);

  const header = (
    <View style={styles.mapButton}>
      <SecondaryButton title="פתח מפה" icon="map-outline" onPress={() => onOpenMap()} />
      {gps.coarse && location ? (
        <AppText variant="caption" style={styles.accuracy}>
          {`המיקום אינו מדויק (±${Math.round(location.accuracy)} מ׳), המרחקים משוערים.`}
        </AppText>
      ) : null}
    </View>
  );

  const body = (() => {
    if (isLocationBlocking(gps.status)) return <LocationGate {...gps} />;
    if (!location || (nearby.loading && !nearby.data)) return <LoadingSkeleton count={3} />;
    if (nearby.error && !nearby.data) {
      return (
        <ErrorState
          message={nearby.offline ? 'אין חיבור לאינטרנט. התחנות יוצגו ברגע שהחיבור יחזור.' : undefined}
          onRetry={nearby.refresh}
        />
      );
    }
    if (stops.length === 0) {
      return <EmptyState icon="bus-outline" title="לא נמצאו תחנות בסביבה" message="נסה לפתוח את המפה ולחפש תחנה ידנית." />;
    }
    return null;
  })();

  return (
    <FlatList
      data={body ? [] : stops}
      keyExtractor={(item) => item.stop.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      ListEmptyComponent={body}
      ItemSeparatorComponent={Gap}
      initialNumToRender={6}
      windowSize={7}
      refreshControl={
        <RefreshControl
          refreshing={nearby.refreshing}
          onRefresh={nearby.refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
      renderItem={({ item }) => (
        <StationCard
          name={item.stop.name}
          code={item.stop.code}
          distance={formatDistance(item.distanceM)}
          lines={item.arrivals.map((a) => a.routeShortName)}
          arrivals={item.arrivals.map((a) => toArrivalRow(a, now))}
          favorite={isFavorite(item.stop.id)}
          onToggleFavorite={() => toggle(item.stop)}
          onPress={() => onOpenMap({ lat: item.stop.lat, lon: item.stop.lon, label: item.stop.name })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(4), paddingBottom: space(8), flexGrow: 1 },
  mapButton: { marginBottom: space(3), gap: space(2) },
  accuracy: { textAlign: 'center' },
  gap: { height: space(3) }
});
