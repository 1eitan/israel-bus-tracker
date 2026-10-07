import { Ionicons } from '@expo/vector-icons';
import type GorhomBottomSheet from '@gorhom/bottom-sheet';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import BottomSheet, { BottomSheetFlatList } from '../components/BottomSheet';
import BusMap, { type BusMapHandle } from '../components/BusMap';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import IconButton from '../components/IconButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LocationGate, { isLocationBlocking } from '../components/LocationGate';
import PressableScale from '../components/PressableScale';
import SearchInput from '../components/SearchInput';
import StationCard from '../components/StationCard';
import { useAppActive } from '../hooks/useAppActive';
import { useFavoriteStops } from '../hooks/useFavoriteStops';
import { useLocation } from '../hooks/useLocation';
import { useNearbyStops } from '../hooks/useNearbyStops';
import { useNow } from '../hooks/useNow';
import { useDebounced } from '../hooks/useDebounced';
import { useRouteDetails, useSearch, useStopArrivals } from '../hooks/queries';
import { useVehicleSocket } from '../hooks/useVehicleSocket';
import { toArrivalRow } from '../lib/arrivals';
import type { NearbyStop } from '../lib/api';
import { formatDistance } from '../lib/geo';
import { haptics } from '../lib/haptics';
import { backChevron } from '../lib/rtl';
import type { RootStackParamList } from '../navigation/types';
import { colors, elevation, radius, space } from '../theme/tokens';
import type { Stop } from '../types/bus';
import { BusDetail, StopDetail } from './map/MapSheets';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;
type SheetTab = 'nearby' | 'favorites';

/** ה-backend מפרש רשימה ריקה כ"כל הקווים"; מזהה זה מבטיח מנוי לאף קו */
const NO_ROUTES = '__none__';
const SNAP_POINTS = ['16%', '45%', '85%'];
const POLL_MS = 15000;

/** מפריד יציב (ראה StopsTab) */
const Gap = () => <View style={styles.gap} />;

export default function MapScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const active = useAppActive();
  const now = useNow(POLL_MS);
  const mapRef = useRef<BusMapHandle>(null);
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const centeredOnUser = useRef(false);

  const gps = useLocation(active);
  const { location } = gps;
  const nearby = useNearbyStops(location, active);
  const { favorites, toggle, isFavorite } = useFavoriteStops();

  const focus = route.params?.focus;
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(route.params?.routeId);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<SheetTab>('nearby');
  const [query, setQuery] = useState('');

  /* ------------------------ קו נבחר + חיפוש (React Query) ------------------------ */

  const routeDetails = useRouteDetails(selectedRouteId).data;
  const debouncedQuery = useDebounced(query.trim(), 300);
  const searchQuery = useSearch(debouncedQuery);
  const results = debouncedQuery.length >= 2 ? searchQuery.data : null;

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
  const selectedVehicle = selectedVehicleId ? (vehicles[selectedVehicleId] ?? null) : null;
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  // הרכב הנבחר נעלם (הוסר/התיישן/הסינון שונה) - סוגרים את הגיליון שלו
  useEffect(() => {
    if (selectedVehicleId && !vehicles[selectedVehicleId]) setSelectedVehicleId(null);
  }, [selectedVehicleId, vehicles]);

  /* --------------------------------- מצלמה --------------------------------- */

  useEffect(() => {
    if (focus) mapRef.current?.animateToRegion({ lat: focus.lat, lon: focus.lon }, 0.01);
  }, [focus]);

  useEffect(() => {
    if (!location || centeredOnUser.current || focus || selectedRouteId) return;
    centeredOnUser.current = true;
    mapRef.current?.animateToRegion({ lat: location.lat, lon: location.lon }, 0.012);
  }, [location, focus, selectedRouteId]);

  const locateMe = useCallback(async () => {
    haptics.select();
    if (gps.status === 'blocked' || gps.status === 'disabled') {
      gps.openSettings();
      return;
    }
    if (gps.status === 'denied') {
      await gps.requestPermission();
      return;
    }
    if (gps.status === 'timeout' || gps.status === 'error') {
      gps.retry();
      return;
    }
    if (location) mapRef.current?.animateToRegion({ lat: location.lat, lon: location.lon }, 0.008, 400);
  }, [gps, location]);

  const zoom = useCallback((delta: number) => mapRef.current?.zoomBy(delta), []);

  /* ---------------------------- התאמת המצלמה לקו ---------------------------- */

  const routeShape = routeDetails?.shape;
  useEffect(() => {
    if (!routeDetails || routeDetails.shape.length === 0) return;
    mapRef.current?.fitToCoordinates(routeDetails.shape, { top: 160, right: 40, bottom: 320, left: 40 });
    // רק כשהקו עצמו מתחלף, לא על כל רענון של אותם נתונים
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeDetails?.id]);

  /* ------------------------------ בחירת תחנה/רכב ------------------------------ */

  const pickStop = useCallback((stop: Stop) => {
    haptics.light();
    setQuery('');
    setSelectedVehicleId(null);
    setSelectedStop(stop);
    sheetRef.current?.snapToIndex(1);
    mapRef.current?.animateToRegion({ lat: stop.lat, lon: stop.lon }, 0.006, 400);
  }, []);

  const pickVehicle = useCallback((id: string) => {
    haptics.light();
    setSelectedStop(null);
    setSelectedVehicleId(id);
    sheetRef.current?.snapToIndex(1);
    const vehicle = vehiclesRef.current[id];
    if (vehicle) mapRef.current?.animateToRegion({ lat: vehicle.lat, lon: vehicle.lon }, 0.008, 400);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedStop(null);
    setSelectedVehicleId(null);
  }, []);

  const showRoute = useCallback((routeId: string) => {
    clearSelection();
    setSelectedRouteId(routeId);
  }, [clearSelection]);

  /* ------------------------------ תוכן הגיליון ------------------------------ */

  const stopCard = (item: NearbyStop) => (
    <StationCard
      name={item.stop.name}
      code={item.stop.code}
      distance={formatDistance(item.distanceM)}
      lines={item.arrivals.map((a) => a.routeShortName)}
      arrivals={item.arrivals.map((a) => toArrivalRow(a, now, () => showRoute(a.routeId)))}
      favorite={isFavorite(item.stop.id)}
      onToggleFavorite={() => toggle(item.stop)}
      onPress={() => pickStop(item.stop)}
    />
  );

  const nearbyEmpty = (() => {
    if (isLocationBlocking(gps.status)) return <LocationGate {...gps} />;
    if (!location || (nearby.loading && !nearby.data)) return <LoadingSkeleton count={2} />;
    if (nearby.error && !nearby.data) {
      return (
        <ErrorState
          title="לא הצלחנו לטעון תחנות"
          message={nearby.offline ? 'אין חיבור לאינטרנט. התחנות יוצגו ברגע שהחיבור יחזור.' : undefined}
          onRetry={nearby.refresh}
        />
      );
    }
    return <EmptyState icon="bus-outline" title="לא נמצאו תחנות בסביבה" message="נסה לחפש תחנה או קו בשורת החיפוש." />;
  })();

  const detail = selectedStop ? (
    <StopDetail
      stop={selectedStop}
      now={now}
      active={active}
      favorite={isFavorite(selectedStop.id)}
      onToggleFavorite={() => toggle(selectedStop)}
      onClose={clearSelection}
      onOpenRoute={showRoute}
    />
  ) : selectedVehicle ? (
    <BusDetail
      vehicle={selectedVehicle}
      now={now}
      active={active}
      onClose={clearSelection}
      onShowRoute={() => showRoute(selectedVehicle.routeId)}
    />
  ) : null;

  const mapStops = useMemo<Stop[]>(() => {
    const base = routeDetails?.stops ?? nearby.data?.stops.map((item) => item.stop) ?? [];
    // תחנה שנבחרה מחיפוש/מועדפים תמיד מצוירת, גם אם היא לא ברשימה הנוכחית
    return selectedStop && !base.some((stop) => stop.id === selectedStop.id) ? [...base, selectedStop] : base;
  }, [routeDetails, nearby.data, selectedStop]);
  const hasResults = !!results && (results.routes.length > 0 || results.stops.length > 0);

  /* --------------------------------- תצוגה --------------------------------- */

  return (
    <View style={styles.screen}>
      <BusMap
        ref={mapRef}
        showUserLocation={location !== null}
        stops={mapStops}
        vehicles={vehicleList}
        selectedStopId={selectedStop?.id}
        selectedVehicleId={selectedVehicleId}
        routeShape={routeShape}
        routeColor={routeDetails?.color}
        focus={focus}
        onStopPress={pickStop}
        onVehiclePress={pickVehicle}
        onMapPress={clearSelection}
      />

      {/* חיפוש + חזרה */}
      <View style={[styles.top, { paddingTop: insets.top + space(2) }]} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <IconButton icon={backChevron()} accessibilityLabel="חזרה" onPress={() => navigation.goBack()} style={styles.floating} />
          <View style={styles.flex}>
            <SearchInput
              placeholder="חיפוש תחנה או קו"
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              returnKeyType="search"
            />
          </View>
        </View>

        {query.trim().length >= 2 && results && !hasResults ? (
          <View style={styles.results}>
            <AppText variant="caption" style={styles.noResults}>
              לא נמצאו תוצאות.
            </AppText>
          </View>
        ) : null}

        {hasResults && results ? (
          <View style={styles.results}>
            {results.routes.slice(0, 4).map((r) => (
              <PressableScale
                key={`r-${r.id}`}
                accessibilityRole="button"
                accessibilityLabel={`קו ${r.shortName} ${r.longName}`}
                style={styles.resultRow}
                pressedStyle={styles.resultPressed}
                onPress={() => {
                  haptics.select();
                  setQuery('');
                  showRoute(r.id);
                }}
              >
                <Ionicons name="bus-outline" size={18} color={colors.text} />
                <AppText numberOfLines={1} style={styles.flex}>{`${r.shortName} ${r.longName}`}</AppText>
              </PressableScale>
            ))}
            {results.stops.slice(0, 4).map((s) => (
              <PressableScale
                key={`s-${s.id}`}
                accessibilityRole="button"
                accessibilityLabel={`תחנה ${s.name}`}
                style={styles.resultRow}
                pressedStyle={styles.resultPressed}
                onPress={() => pickStop(s)}
              >
                <Ionicons name="location-outline" size={18} color={colors.text} />
                <AppText numberOfLines={1} style={styles.flex}>{s.name}</AppText>
              </PressableScale>
            ))}
          </View>
        ) : null}

        {selectedRouteId && routeDetails ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`הסר את סינון קו ${routeDetails.shortName}`}
            style={styles.routeChip}
            onPress={() => {
              haptics.select();
              setSelectedRouteId(undefined);
            }}
          >
            <AppText variant="heading" style={{ color: routeDetails.textColor }}>{`קו ${routeDetails.shortName}`}</AppText>
            <Ionicons name="close" size={16} color={routeDetails.textColor} />
          </PressableScale>
        ) : null}
      </View>

      {/* בקרי מפה */}
      <View style={[styles.controls, { top: insets.top + space(20) }]} pointerEvents="box-none">
        <IconButton icon="locate" accessibilityLabel="המיקום שלי" onPress={() => void locateMe()} style={styles.floating} />
        <IconButton icon="add" accessibilityLabel="הגדל מפה" onPress={() => zoom(1)} style={styles.floating} />
        <IconButton icon="remove" accessibilityLabel="הקטן מפה" onPress={() => zoom(-1)} style={styles.floating} />
      </View>

      <BottomSheet ref={sheetRef} index={1} snapPoints={SNAP_POINTS}>
        {detail ?? (
          <>
            <View style={styles.sheetTabs}>
              <Chip label="תחנות בסביבה" selected={sheetTab === 'nearby'} onPress={() => setSheetTab('nearby')} />
              <Chip label="מועדפים" selected={sheetTab === 'favorites'} onPress={() => setSheetTab('favorites')} />
            </View>

            {sheetTab === 'nearby' ? (
              <BottomSheetFlatList
                data={nearby.error && !nearby.data ? [] : (nearby.data?.stops ?? [])}
                keyExtractor={(item: NearbyStop) => item.stop.id}
                contentContainerStyle={styles.sheetList}
                ListEmptyComponent={nearbyEmpty}
                ItemSeparatorComponent={Gap}
                refreshing={nearby.refreshing}
                onRefresh={nearby.refresh}
                renderItem={({ item }: { item: NearbyStop }) => stopCard(item)}
              />
            ) : (
              <BottomSheetFlatList
                data={favorites}
                keyExtractor={(stop: Stop) => stop.id}
                contentContainerStyle={styles.sheetList}
                ItemSeparatorComponent={Gap}
                ListEmptyComponent={
                  <EmptyState
                    icon="star-outline"
                    title="אין תחנות מועדפות"
                    message="לחץ על הכוכב בכרטיס תחנה כדי להוסיף אותה לכאן."
                  />
                }
                renderItem={({ item }: { item: Stop }) => (
                  <FavoriteStop
                    stop={item}
                    now={now}
                    active={active}
                    onToggle={() => toggle(item)}
                    onPress={() => pickStop(item)}
                    onOpenRoute={showRoute}
                  />
                )}
              />
            )}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function FavoriteStop({
  stop,
  now,
  active,
  onToggle,
  onPress,
  onOpenRoute
}: {
  stop: Stop;
  now: number;
  active: boolean;
  onToggle: () => void;
  onPress: () => void;
  onOpenRoute: (routeId: string) => void;
}) {
  const { data, loading, error, refresh } = useStopArrivals(stop.id, active);
  if (loading && !data) return <LoadingSkeleton count={1} />;
  if (error && !data) return <ErrorState title="לא הצלחנו לטעון הגעות" onRetry={refresh} />;
  const arrivals = data?.arrivals ?? [];
  return (
    <StationCard
      name={stop.name}
      code={stop.code}
      lines={arrivals.map((a) => a.routeShortName)}
      arrivals={arrivals.map((a) => toArrivalRow(a, now, () => onOpenRoute(a.routeId)))}
      favorite
      onToggleFavorite={onToggle}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space(3), gap: space(2) },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  floating: { backgroundColor: colors.surface, ...elevation.card },
  controls: { position: 'absolute', end: space(3), gap: space(2) },
  results: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden', ...elevation.card },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    minHeight: space(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  resultPressed: { backgroundColor: colors.surfaceElevated },
  noResults: { padding: space(4) },
  routeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(4),
    minHeight: space(11),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...elevation.card
  },
  sheetTabs: { flexDirection: 'row', gap: space(2), paddingHorizontal: space(4), paddingBottom: space(3) },
  sheetList: { paddingHorizontal: space(4), paddingBottom: space(10), flexGrow: 1 },
  gap: { height: space(3) }
});
