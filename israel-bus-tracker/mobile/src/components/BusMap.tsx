import { Ionicons } from '@expo/vector-icons';
import { Component, forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { isValidCoord } from '../lib/geo';
import { darkMapStyle } from '../lib/mapStyle';
import { MAP_PROVIDER, MAPS_AVAILABLE } from '../lib/maps';
import { colors, radius, space } from '../theme/tokens';
import type { LatLng, Stop, Vehicle } from '../types/bus';
import AppText from './AppText';
import BusMarker from './BusMarker';
import MapMarker from './MapMarker';

export interface BusMapHandle {
  animateToRegion: (center: LatLng, delta: number, durationMs?: number) => void;
  fitToCoordinates: (points: LatLng[], padding: { top: number; right: number; bottom: number; left: number }) => void;
  zoomBy: (steps: number) => void;
}

interface Props {
  /** יש הרשאה ומיקום - רק אז מציירים את הנקודה הכחולה (בלי הרשאה אנדרואיד עלול לקרוס) */
  showUserLocation: boolean;
  stops: Stop[];
  vehicles: Vehicle[];
  selectedStopId?: string | null;
  selectedVehicleId?: string | null;
  routeShape?: LatLng[];
  routeColor?: string;
  focus?: { lat: number; lon: number; label?: string };
  onStopPress: (stop: Stop) => void;
  onVehiclePress: (vehicleId: string) => void;
  onMapPress: () => void;
}

const ISRAEL_CENTER: Region = { latitude: 31.5, longitude: 34.9, latitudeDelta: 4, longitudeDelta: 4 };
const MIN_DELTA = 0.0005;
const MAX_DELTA = 40;

/* ------------------------- fallback כשאין מפה ------------------------- */

function MapUnavailable({ reason }: { reason: 'no-key' | 'error' }) {
  return (
    <View style={styles.fallback} accessible accessibilityRole="summary">
      <View style={styles.fallbackIcon}>
        <Ionicons name="map-outline" size={28} color={colors.textSecondary} />
      </View>
      <AppText variant="heading" style={styles.center}>
        המפה אינה זמינה
      </AppText>
      <AppText variant="caption" style={styles.center}>
        {reason === 'no-key'
          ? 'לא הוגדר מפתח Google Maps. אפשר להמשיך להשתמש בתחנות, בזמני ההגעה ובחיפוש.'
          : 'אירעה שגיאה בטעינת המפה. אפשר להמשיך להשתמש בתחנות, בזמני ההגעה ובחיפוש.'}
      </AppText>
    </View>
  );
}

/** שגיאת רינדור של המפה לא מפילה את המסך כולו */
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[BusMap] רינדור המפה נכשל:', error);
  }
  render() {
    return this.state.failed ? <MapUnavailable reason="error" /> : this.props.children;
  }
}

/* --------------------------------- מפה --------------------------------- */

const toCoordinate = (p: LatLng) => ({ latitude: p.lat, longitude: p.lon });

function BusMapInner(
  {
    showUserLocation,
    stops,
    vehicles,
    selectedStopId,
    selectedVehicleId,
    routeShape,
    routeColor,
    focus,
    onStopPress,
    onVehiclePress,
    onMapPress
  }: Props,
  ref: Ref<BusMapHandle>
) {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(ISRAEL_CENTER);
  const readyRef = useRef(false);
  const pending = useRef<Array<() => void>>([]);

  /** פקודות מצלמה לפני onMapReady נבלעות (במיוחד באנדרואיד) - מתורגות ורצות כשהמפה מוכנה */
  const whenReady = useCallback((action: () => void) => {
    if (readyRef.current) action();
    else pending.current.push(action);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (center, delta, durationMs = 500) =>
        whenReady(() =>
          mapRef.current?.animateToRegion(
            { latitude: center.lat, longitude: center.lon, latitudeDelta: delta, longitudeDelta: delta },
            durationMs
          )
        ),
      fitToCoordinates: (points, padding) => {
        const valid = points.filter((p) => isValidCoord(p.lat, p.lon));
        if (valid.length === 0) return;
        whenReady(() => mapRef.current?.fitToCoordinates(valid.map(toCoordinate), { edgePadding: padding, animated: true }));
      },
      // זום לפי ה-region (ולא getCamera().zoom) כדי שיעבוד גם ב-Apple Maps
      zoomBy: (steps) =>
        whenReady(() => {
          const region = regionRef.current;
          const factor = 2 ** -steps;
          const clamp = (d: number) => Math.min(MAX_DELTA, Math.max(MIN_DELTA, d * factor));
          mapRef.current?.animateToRegion(
            { ...region, latitudeDelta: clamp(region.latitudeDelta), longitudeDelta: clamp(region.longitudeDelta) },
            250
          );
        })
    }),
    [whenReady]
  );

  const shapeCoordinates = useMemo(
    () => (routeShape ?? []).filter((p) => isValidCoord(p.lat, p.lon)).map(toCoordinate),
    [routeShape]
  );
  const validStops = useMemo(() => stops.filter((s) => isValidCoord(s.lat, s.lon)), [stops]);

  if (!MAPS_AVAILABLE) return <MapUnavailable reason="no-key" />;

  return (
    <MapBoundary>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER === 'google' ? PROVIDER_GOOGLE : undefined}
        // customMapStyle פועל רק עם Google Maps; ב-Apple Maps המצב הכהה מגיע מ-userInterfaceStyle
        customMapStyle={MAP_PROVIDER === 'google' ? darkMapStyle : undefined}
        userInterfaceStyle="dark"
        initialRegion={ISRAEL_CENTER}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
        onMapReady={() => {
          readyRef.current = true;
          const queued = pending.current;
          pending.current = [];
          queued.forEach((action) => action());
        }}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
        }}
        onPress={onMapPress}
      >
        {shapeCoordinates.length > 1 ? (
          <Polyline coordinates={shapeCoordinates} strokeColor={routeColor || colors.primary} strokeWidth={5} />
        ) : null}

        {validStops.map((stop) => (
          <MapMarker
            key={`stop-${stop.id}`}
            latitude={stop.lat}
            longitude={stop.lon}
            title={stop.name}
            selected={selectedStopId === stop.id}
            onPress={() => onStopPress(stop)}
          />
        ))}

        {focus && isValidCoord(focus.lat, focus.lon) ? (
          <Marker coordinate={{ latitude: focus.lat, longitude: focus.lon }} title={focus.label} pinColor={colors.primary} />
        ) : null}

        {vehicles.map((vehicle) => (
          <BusMarker
            key={`bus-${vehicle.id}`}
            latitude={vehicle.lat}
            longitude={vehicle.lon}
            routeNumber={vehicle.routeShortName}
            color={vehicle.routeColor}
            textColor={vehicle.routeTextColor}
            selected={selectedVehicleId === vehicle.id}
            onPress={() => onVehiclePress(vehicle.id)}
          />
        ))}
      </MapView>
    </MapBoundary>
  );
}

const BusMap = memo(forwardRef(BusMapInner));
export default BusMap;

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingHorizontal: space(8),
    paddingBottom: space(40)
  },
  fallbackIcon: {
    width: space(16),
    height: space(16),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1)
  },
  center: { textAlign: 'center' }
});
