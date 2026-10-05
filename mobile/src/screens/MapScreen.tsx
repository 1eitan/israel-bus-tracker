import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import RouteCard from '../components/RouteCard';
import SearchInput from '../components/SearchInput';
import { useAppActive } from '../hooks/useAppActive';
import { useFavoriteStops } from '../hooks/useFavoriteStops';
import { useLocation } from '../hooks/useLocation';
import { useNearbyStops } from '../hooks/useNearbyStops';
import { useNow } from '../hooks/useNow';
import { usePolling } from '../hooks/usePolling';
import { useVehicleSocket } from '../hooks/useVehicleSocket';
import { fetchRouteDetails, fetchStopArrivals, searchAll, type NearbyStop } from '../lib/api';
import { describeDelay, formatEtaText } from '../lib/format';
import { formatDistance } from '../lib/geo';
import { darkMapStyle } from '../lib/mapStyle';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius, space } from '../theme/tokens';
import type { Arrival, RouteDetails, SearchResults, Stop } from '../types/bus';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;
type SheetTab = 'nearby' | 'favorites';

/** ה-backend מפרש רשימה ריקה כ"כל הקווים"; מזהה זה מבטיח מנוי לאף קו */
const NO_ROUTES = '__none__';
const ISRAEL_CENTER = { latitude: 31.5, longitude: 34.9, latitudeDelta: 4, longitudeDelta: 4 };

type Row =
  | { kind: 'stop'; key: string; item: NearbyStop }
  | { kind: 'arrival'; key: string; stop: Stop; arrival: Arrival }
  | { kind: 'empty'; key: string; text: string };

export default function MapScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const active = useAppActive();
  const now = useNow(15000);
  const mapRef = useRef<MapView>(null);
  const centeredOnUser = useRef(false);

  const { permission, location, requestPermission } = useLocation(active);
  const nearby = useNearbyStops(location, active);
  const { favorites, toggle, isFavorite } = useFavoriteStops();

  const focus = route.params?.focus;
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(route.params?.routeId);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [sheetTab, setSheetTab] = useState<SheetTab>('nearby');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);

  /* ----------------------------- רכבים בזמן אמת ----------------------------- */

  const nearbyRouteIds = useMemo(() => {
    const ids = new Set<string>();
    nearby.data?.stops.forEach((s) => s.arrivals.forEach((a) => ids.add(a.routeId)));
    return [...ids];
  }, [nearby.data]);

  const socketRouteIds = selectedRouteId
    ? [selectedRouteId]
    : nearbyRouteIds.length > 0
      ? nearbyRouteIds
      : [NO_ROUTES];
  const { vehicles } = useVehicleSocket(socketRouteIds, active);
  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);

  /* --------------------------------- מצלמה --------------------------------- */

  useEffect(() => {
    if (focus) {
      mapRef.current?.animateToRegion(
        { latitude: focus.lat, longitude: focus.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      );
    }
  }, [focus]);

  useEffect(() => {
    if (!location || centeredOnUser.current || focus || selectedRouteId) return;
    centeredOnUser.current = true;
    mapRef.current?.animateToRegion(
      { latitude: location.lat, longitude: location.lon, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      500
    );
  }, [location, focus, selectedRouteId]);

  /* ---------------------------- קו נבחר (מסלול) ---------------------------- */

  useEffect(() => {
    if (!selectedRouteId) {
      setRouteDetails(null);
      return undefined;
    }
    const controller = new AbortController();
    fetchRouteDetails(selectedRouteId, controller.signal)
      .then((details) => {
        setRouteDetails(details);
        if (details.shape.length > 0) {
          mapRef.current?.fitToCoordinates(
            details.shape.map((p) => ({ latitude: p.lat, longitude: p.lon })),
            { edgePadding: { top: 160, right: 40, bottom: 320, left: 40 }, animated: true }
          );
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedRouteId]);

  /* ---------------------------------- חיפוש ---------------------------------- */

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchAll(q, controller.signal).then(setResults).catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pickStop = useCallback((stop: Stop) => {
    setQuery('');
    setResults(null);
    mapRef.current?.animateToRegion(
      { latitude: stop.lat, longitude: stop.lon, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      400
    );
  }, []);

  /* ------------------------------ שורות הגיליון ------------------------------ */

  const nearbyRows = useMemo<Row[]>(() => {
    if (permission === 'denied') return [{ kind: 'empty', key: 'denied', text: 'כדי לראות תחנות בסביבה יש לאפשר גישה למיקום.' }];
    if (!location) return [{ kind: 'empty', key: 'locating', text: 'מאתר את מיקומך...' }];
    if (nearby.error && !nearby.data) return [{ kind: 'empty', key: 'err', text: 'לא הצלחנו לטעון תחנות. מנסה שוב...' }];
    if (!nearby.data) return [{ kind: 'empty', key: 'loading', text: 'טוען תחנות...' }];
    if (nearby.data.stops.length === 0) return [{ kind: 'empty', key: 'none', text: 'לא נמצאו תחנות בסביבה.' }];
    const rows: Row[] = [];
    for (const item of nearby.data.stops) {
      rows.push({ kind: 'stop', key: `s-${item.stop.id}`, item });
      item.arrivals.slice(0, 4).forEach((arrival, i) =>
        rows.push({ kind: 'arrival', key: `a-${item.stop.id}-${arrival.tripId}-${i}`, stop: item.stop, arrival })
      );
    }
    return rows;
  }, [permission, location, nearby.data, nearby.error]);

  const renderArrival = (arrival: Arrival) => {
    const delay = describeDelay(arrival.delaySeconds);
    return (
      <RouteCard
        routeNumber={arrival.routeShortName}
        destination={arrival.headsign || `קו ${arrival.routeShortName}`}
        eta={formatEtaText(arrival.arrivalTime, now)}
        badgeColor={arrival.routeColor}
        badgeTextColor={arrival.routeTextColor}
        note={delay.tone === 'late' || delay.tone === 'verylate' ? delay.label : undefined}
        onPress={() => setSelectedRouteId(arrival.routeId)}
      />
    );
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'empty') {
      return (
        <View style={styles.empty}>
          <AppText variant="caption" style={styles.center}>
            {item.text}
          </AppText>
          {item.key === 'denied' ? (
            <Pressable onPress={() => void requestPermission()}>
              <AppText style={styles.link}>אפשר גישה למיקום</AppText>
            </Pressable>
          ) : null}
        </View>
      );
    }
    if (item.kind === 'stop') {
      const { stop, distanceM } = item.item;
      return (
        <StopHeader
          stop={stop}
          subtitle={formatDistance(distanceM)}
          favorite={isFavorite(stop.id)}
          onToggle={() => toggle(stop)}
          onPress={() => pickStop(stop)}
        />
      );
    }
    return renderArrival(item.arrival);
  };

  /* --------------------------------- תצוגה --------------------------------- */

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        userInterfaceStyle="dark"
        initialRegion={ISRAEL_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
      >
        {routeDetails && routeDetails.shape.length > 1 ? (
          <Polyline
            coordinates={routeDetails.shape.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
            strokeColor={routeDetails.color}
            strokeWidth={5}
          />
        ) : null}

        {(routeDetails?.stops ?? nearby.data?.stops.map((s) => s.stop) ?? []).map((stop) => (
          <Marker
            key={`stop-${stop.id}`}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            title={stop.name}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.stopDot} />
          </Marker>
        ))}

        {focus ? <Marker coordinate={{ latitude: focus.lat, longitude: focus.lon }} title={focus.label} pinColor={colors.primary} /> : null}

        {vehicleList.map((vehicle) => (
          <Marker
            key={`bus-${vehicle.id}`}
            coordinate={{ latitude: vehicle.lat, longitude: vehicle.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => setSelectedRouteId(vehicle.routeId)}
          >
            <View style={[styles.bus, { backgroundColor: vehicle.routeColor }]}>
              <AppText style={[styles.busText, { color: vehicle.routeTextColor }]}>{vehicle.routeShortName}</AppText>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.top, { paddingTop: insets.top + space(2) }]}>
        <View style={styles.searchRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Ionicons name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
          </Pressable>
          <View style={styles.flex}>
            <SearchInput placeholder="חיפוש יעד לתכנון נסיעה" value={query} onChangeText={setQuery} returnKeyType="search" />
          </View>
        </View>

        {results && (results.routes.length > 0 || results.stops.length > 0) ? (
          <View style={styles.results}>
            {results.routes.slice(0, 4).map((r) => (
              <Pressable
                key={`r-${r.id}`}
                style={styles.resultRow}
                onPress={() => {
                  setQuery('');
                  setResults(null);
                  setSelectedRouteId(r.id);
                }}
              >
                <Ionicons name="bus-outline" size={18} color={colors.text} />
                <AppText numberOfLines={1} style={styles.flex}>{`${r.shortName} ${r.longName}`}</AppText>
              </Pressable>
            ))}
            {results.stops.slice(0, 4).map((s) => (
              <Pressable key={`s-${s.id}`} style={styles.resultRow} onPress={() => pickStop(s)}>
                <Ionicons name="location-outline" size={18} color={colors.text} />
                <AppText numberOfLines={1} style={styles.flex}>{s.name}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedRouteId && routeDetails ? (
          <Pressable style={styles.chip} onPress={() => setSelectedRouteId(undefined)}>
            <AppText style={{ color: routeDetails.textColor, fontFamily: fonts.bold }}>{`קו ${routeDetails.shortName}`}</AppText>
            <Ionicons name="close" size={16} color={routeDetails.textColor} />
          </Pressable>
        ) : null}
      </View>

      <BottomSheet
        index={1}
        snapPoints={['16%', '45%', '85%']}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <View style={styles.sheetTabs}>
          {(
            [
              { key: 'nearby', label: 'תחנות בסביבה' },
              { key: 'favorites', label: 'מועדפים' }
            ] as { key: SheetTab; label: string }[]
          ).map((t) => (
            <Pressable key={t.key} onPress={() => setSheetTab(t.key)} style={[styles.sheetTab, sheetTab === t.key && styles.sheetTabActive]}>
              <AppText style={[styles.sheetTabText, sheetTab === t.key && { color: colors.text }]}>{t.label}</AppText>
            </Pressable>
          ))}
        </View>

        {sheetTab === 'nearby' ? (
          <BottomSheetFlatList
            data={nearbyRows}
            keyExtractor={(row: Row) => row.key}
            renderItem={renderRow}
            contentContainerStyle={styles.sheetList}
            ItemSeparatorComponent={() => <View style={{ height: space(2) }} />}
          />
        ) : (
          <BottomSheetFlatList
            data={favorites}
            keyExtractor={(stop: Stop) => stop.id}
            contentContainerStyle={styles.sheetList}
            ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
            ListEmptyComponent={
              <AppText variant="caption" style={styles.center}>
                עוד לא הוספת תחנות מועדפות. לחץ על הכוכב ליד תחנה כדי להוסיף.
              </AppText>
            }
            renderItem={({ item }: { item: Stop }) => (
              <FavoriteStop
                stop={item}
                now={now}
                active={active}
                onToggle={() => toggle(item)}
                onPress={() => pickStop(item)}
                renderArrival={renderArrival}
              />
            )}
          />
        )}
      </BottomSheet>
    </View>
  );
}

function StopHeader({
  stop,
  subtitle,
  favorite,
  onToggle,
  onPress
}: {
  stop: Stop;
  subtitle?: string;
  favorite: boolean;
  onToggle: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.stopHeader}>
      <Ionicons name="location" size={18} color={colors.primary} />
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={1}>{stop.name}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      <Pressable hitSlop={12} accessibilityLabel={favorite ? 'הסר ממועדפים' : 'הוסף למועדפים'} onPress={onToggle}>
        <Ionicons name={favorite ? 'star' : 'star-outline'} size={22} color={favorite ? colors.warning : colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

function FavoriteStop({
  stop,
  active,
  onToggle,
  onPress,
  renderArrival
}: {
  stop: Stop;
  now: number;
  active: boolean;
  onToggle: () => void;
  onPress: () => void;
  renderArrival: (arrival: Arrival) => JSX.Element;
}) {
  const { data } = usePolling((signal) => fetchStopArrivals(stop.id, signal), active, 15000, stop.id);
  return (
    <View style={{ gap: space(2) }}>
      <StopHeader stop={stop} favorite onToggle={onToggle} onPress={onPress} />
      {(data?.arrivals ?? []).slice(0, 4).map((arrival, i) => (
        <View key={`${arrival.tripId}-${i}`}>{renderArrival(arrival)}</View>
      ))}
      {data && data.arrivals.length === 0 ? <AppText variant="caption">אין הגעות צפויות כרגע.</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space(3), gap: space(2) },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  back: {
    width: space(12),
    height: space(12),
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center'
  },
  results: { borderRadius: radius.md, backgroundColor: colors.card, overflow: 'hidden' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    height: space(11),
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(3),
    height: space(8),
    borderRadius: radius.full,
    backgroundColor: colors.primary
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.primary
  },
  bus: {
    minWidth: 32,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background
  },
  busText: { fontFamily: fonts.bold, fontSize: 12 },
  sheetBg: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { backgroundColor: colors.border },
  sheetTabs: { flexDirection: 'row', gap: space(2), paddingHorizontal: space(4), paddingBottom: space(3) },
  sheetTab: {
    paddingHorizontal: space(4),
    height: space(9),
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetTabActive: { backgroundColor: colors.primary },
  sheetTabText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  sheetList: { paddingHorizontal: space(4), paddingBottom: space(10) },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: space(2), paddingVertical: space(2) },
  empty: { paddingVertical: space(6), alignItems: 'center', gap: space(3) },
  link: { color: colors.primary }
});
