import L from 'leaflet';
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents
} from 'react-leaflet';

import { escapeHtml } from '../lib/format';
import type { MapFocus, RouteDetails, Stop, Theme, UserLocation, Vehicle } from '../types/bus';

/* ------------------------------------------------------------------------- */
/*                                   קבועים                                  */
/* ------------------------------------------------------------------------- */

const DEFAULT_CENTER: [number, number] = [32.0755, 34.7845];
const DEFAULT_ZOOM = 13;

const TILE_LAYERS: Record<Theme, { url: string; className: string }> = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    className: 'tiles-light'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    className: 'tiles-dark'
  }
};

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const MIN_STOP_ZOOM = 15;
const MAX_VISIBLE_STOPS = 400;
const TELEPORT_THRESHOLD_METERS = 800;

/* ------------------------------------------------------------------------- */
/*                                   Props                                   */
/* ------------------------------------------------------------------------- */

export interface BusMapProps {
  theme: Theme;
  vehicles: Vehicle[];
  routes: RouteDetails[];
  stops: Stop[];
  selectedVehicleId: string | null;
  selectedStopId: string | null;
  focus: MapFocus | null;
  userLocation: UserLocation | null;
  onSelectVehicle: (id: string) => void;
  onSelectStop: (id: string) => void;
  onClearSelection: () => void;
}

/* ------------------------------------------------------------------------- */
/*                             בקרת תנועת מפה                                */
/* ------------------------------------------------------------------------- */

function MapController({ focus }: { focus: MapFocus | null }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    if (focus.kind === 'point') {
      map.flyTo([focus.lat, focus.lon], focus.zoom ?? 16, { duration: 1.1 });
    } else if (focus.points.length > 0) {
      map.flyToBounds(L.latLngBounds(focus.points), {
        padding: [90, 90],
        duration: 1.1,
        maxZoom: 16
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, map]);

  return null;
}

function MapClickHandler({ onClear }: { onClear: () => void }) {
  useMapEvents({
    click: () => onClear()
  });
  return null;
}

/* ------------------------------------------------------------------------- */
/*                           שכבת האוטובוסים (אנימציה)                       */
/* ------------------------------------------------------------------------- */

interface BusAnimation {
  marker: L.Marker;
  curLat: number;
  curLon: number;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  start: number;
  duration: number;
  lastUpdate: number;
  done: boolean;
  rotation: number;
  signature: string;
}

function readableLabelClass(label: string): string {
  if (label.length >= 5) return 'bus-badge xlong';
  if (label.length === 4) return 'bus-badge long';
  return 'bus-badge';
}

function signatureOf(vehicle: Vehicle): string {
  return `${vehicle.routeShortName}|${vehicle.routeColor}|${vehicle.routeTextColor}`;
}

function createBusIcon(vehicle: Vehicle): L.DivIcon {
  const label = escapeHtml(vehicle.routeShortName);
  const color = escapeHtml(vehicle.routeColor);
  const textColor = escapeHtml(vehicle.routeTextColor);
  return L.divIcon({
    className: 'bus-marker-wrapper',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div class="bus-marker" style="--bus-color:${color};--bus-text:${textColor}">
        <div class="bus-arrow"></div>
        <div class="${readableLabelClass(vehicle.routeShortName)}">${label}</div>
      </div>`
  });
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  return L.latLng(aLat, aLon).distanceTo(L.latLng(bLat, bLon));
}

function applyBearing(animation: BusAnimation, bearing: number): void {
  const delta = ((bearing - animation.rotation + 540) % 360) - 180;
  animation.rotation += delta;
  const element = animation.marker.getElement();
  const arrow = element?.querySelector<HTMLElement>('.bus-arrow');
  if (arrow) arrow.style.transform = `rotate(${animation.rotation}deg)`;
}

function applySelectedState(animation: BusAnimation, selected: boolean): void {
  const element = animation.marker.getElement();
  const bus = element?.querySelector<HTMLElement>('.bus-marker');
  if (bus) bus.classList.toggle('is-selected', selected);
  animation.marker.setZIndexOffset(selected ? 2000 : 500);
}

interface BusLayerProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

function BusLayer({ vehicles, selectedVehicleId, onSelectVehicle }: BusLayerProps) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);
  const animationsRef = useRef<Map<string, BusAnimation>>(new Map());
  const onSelectRef = useRef(onSelectVehicle);
  const selectedRef = useRef(selectedVehicleId);

  onSelectRef.current = onSelectVehicle;
  selectedRef.current = selectedVehicleId;

  /* יצירת קבוצת השכבות ולולאת האנימציה */
  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    groupRef.current = group;
    const animations = animationsRef.current;

    let frame = 0;
    const tick = (time: number): void => {
      animations.forEach((animation) => {
        if (animation.done) return;
        const progress = Math.min(1, (time - animation.start) / animation.duration);
        animation.curLat = animation.fromLat + (animation.toLat - animation.fromLat) * progress;
        animation.curLon = animation.fromLon + (animation.toLon - animation.fromLon) * progress;
        animation.marker.setLatLng([animation.curLat, animation.curLon]);
        if (progress >= 1) animation.done = true;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      group.clearLayers();
      group.remove();
      animations.clear();
      groupRef.current = null;
    };
  }, [map]);

  /* סנכרון הרכבים מול הסמנים */
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const animations = animationsRef.current;
    const now = performance.now();
    const seen = new Set<string>();

    for (const vehicle of vehicles) {
      seen.add(vehicle.id);
      const existing = animations.get(vehicle.id);

      if (!existing) {
        const marker = L.marker([vehicle.lat, vehicle.lon], {
          icon: createBusIcon(vehicle),
          keyboard: true,
          title: `קו ${vehicle.routeShortName} - רכב ${vehicle.label}`,
          zIndexOffset: 500
        });
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          onSelectRef.current(vehicle.id);
        });
        marker.addTo(group);

        const animation: BusAnimation = {
          marker,
          curLat: vehicle.lat,
          curLon: vehicle.lon,
          fromLat: vehicle.lat,
          fromLon: vehicle.lon,
          toLat: vehicle.lat,
          toLon: vehicle.lon,
          start: now,
          duration: 1,
          lastUpdate: now,
          done: true,
          rotation: vehicle.bearing,
          signature: signatureOf(vehicle)
        };
        animations.set(vehicle.id, animation);
        applyBearing(animation, vehicle.bearing);
        applySelectedState(animation, vehicle.id === selectedRef.current);
        continue;
      }

      if (existing.signature !== signatureOf(vehicle)) {
        existing.marker.setIcon(createBusIcon(vehicle));
        existing.signature = signatureOf(vehicle);
      }

      const jump = distanceMeters(existing.curLat, existing.curLon, vehicle.lat, vehicle.lon);
      if (jump > TELEPORT_THRESHOLD_METERS) {
        existing.curLat = vehicle.lat;
        existing.curLon = vehicle.lon;
        existing.marker.setLatLng([vehicle.lat, vehicle.lon]);
      }

      existing.fromLat = existing.curLat;
      existing.fromLon = existing.curLon;
      existing.toLat = vehicle.lat;
      existing.toLon = vehicle.lon;
      existing.start = now;
      existing.duration = Math.min(6000, Math.max(1200, now - existing.lastUpdate));
      existing.lastUpdate = now;
      existing.done = false;

      if (vehicle.speedKmh > 0 || jump > 3) applyBearing(existing, vehicle.bearing);
      applySelectedState(existing, vehicle.id === selectedRef.current);

      if (vehicle.id === selectedRef.current) {
        const inner = map.getBounds().pad(-0.25);
        if (!inner.contains([vehicle.lat, vehicle.lon])) {
          map.panTo([vehicle.lat, vehicle.lon], { animate: true, duration: 1 });
        }
      }
    }

    animations.forEach((animation, id) => {
      if (!seen.has(id)) {
        group.removeLayer(animation.marker);
        animations.delete(id);
      }
    });
  }, [vehicles, map]);

  /* סימון הרכב הנבחר */
  useEffect(() => {
    animationsRef.current.forEach((animation, id) => {
      applySelectedState(animation, id === selectedVehicleId);
    });
  }, [selectedVehicleId]);

  return null;
}

/* ------------------------------------------------------------------------- */
/*                               שכבת התחנות                                 */
/* ------------------------------------------------------------------------- */

const stopIconCache = new Map<string, L.DivIcon>();

function getStopIcon(highlight: boolean, selected: boolean, color: string): L.DivIcon {
  const key = `${highlight ? 1 : 0}${selected ? 1 : 0}${color}`;
  const cached = stopIconCache.get(key);
  if (cached) return cached;
  const size = highlight || selected ? 20 : 16;
  const classes = ['stop-dot', highlight ? 'is-highlight' : '', selected ? 'is-selected' : '']
    .filter(Boolean)
    .join(' ');
  const icon = L.divIcon({
    className: 'stop-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div class="${classes}" style="--stop-color:${escapeHtml(color)}"></div>`
  });
  stopIconCache.set(key, icon);
  return icon;
}

interface StopsLayerProps {
  stops: Stop[];
  highlightedColors: Map<string, string>;
  selectedStopId: string | null;
  onSelectStop: (id: string) => void;
}

function StopsLayer({ stops, highlightedColors, selectedStopId, onSelectStop }: StopsLayerProps) {
  const map = useMap();
  const [view, setView] = useState(() => ({ zoom: map.getZoom(), bounds: map.getBounds() }));

  useMapEvents({
    moveend: () => setView({ zoom: map.getZoom(), bounds: map.getBounds() }),
    zoomend: () => setView({ zoom: map.getZoom(), bounds: map.getBounds() })
  });

  const visibleStops = useMemo(() => {
    const padded = view.bounds.pad(0.2);
    const result: Stop[] = [];
    for (const stop of stops) {
      const isHighlighted = highlightedColors.has(stop.id);
      const isSelected = stop.id === selectedStopId;
      const inView = view.zoom >= MIN_STOP_ZOOM && padded.contains([stop.lat, stop.lon]);
      if (isHighlighted || isSelected || inView) {
        result.push(stop);
        if (result.length >= MAX_VISIBLE_STOPS) break;
      }
    }
    return result;
  }, [stops, highlightedColors, selectedStopId, view]);

  return (
    <>
      {visibleStops.map((stop) => {
        const color = highlightedColors.get(stop.id) ?? '#475569';
        const icon = getStopIcon(
          highlightedColors.has(stop.id),
          stop.id === selectedStopId,
          color
        );
        return (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lon]}
            icon={icon}
            title={stop.name}
            eventHandlers={{
              click: () => onSelectStop(stop.id)
            }}
          >
            <Popup closeButton autoPan={false}>
              <div dir="rtl" className="px-4 py-3 text-right">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  תחנה {stop.code}
                </div>
                <div className="mt-0.5 text-[15px] font-bold leading-snug">{stop.name}</div>
                <button
                  type="button"
                  onClick={() => onSelectStop(stop.id)}
                  className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
                >
                  זמני הגעה בזמן אמת
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/*                         מסלולי קווים + מיקום המשתמש                       */
/* ------------------------------------------------------------------------- */

function RoutesLayer({ routes, theme }: { routes: RouteDetails[]; theme: Theme }) {
  return (
    <>
      {routes.map((route) => {
        const positions = route.shape.map((point) => [point.lat, point.lon] as [number, number]);
        if (positions.length < 2) return null;
        return (
          <Fragment key={route.id}>
            <Polyline
              positions={positions}
              pathOptions={{
                color: theme === 'dark' ? '#0f172a' : '#ffffff',
                weight: 11,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              interactive={false}
            />
            <Polyline
              positions={positions}
              pathOptions={{
                color: route.color,
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              interactive={false}
            />
          </Fragment>
        );
      })}
    </>
  );
}

const userIcon = L.divIcon({
  className: 'stop-marker-wrapper',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<div class="user-dot"></div>'
});

function UserLocationLayer({ location }: { location: UserLocation | null }) {
  if (!location) return null;
  return (
    <>
      <Circle
        center={[location.lat, location.lon]}
        radius={Math.max(location.accuracy, 15)}
        pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }}
        interactive={false}
      />
      <Marker
        position={[location.lat, location.lon]}
        icon={userIcon}
        zIndexOffset={3000}
        interactive={false}
        keyboard={false}
      />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/*                             הקומפוננטה הראשית                             */
/* ------------------------------------------------------------------------- */

function BusMapComponent({
  theme,
  vehicles,
  routes,
  stops,
  selectedVehicleId,
  selectedStopId,
  focus,
  userLocation,
  onSelectVehicle,
  onSelectStop,
  onClearSelection
}: BusMapProps) {
  const tile = TILE_LAYERS[theme];

  const highlightedColors = useMemo(() => {
    const colors = new Map<string, string>();
    for (const route of routes) {
      for (const stop of route.stops) {
        if (!colors.has(stop.id)) colors.set(stop.id, route.color);
      }
    }
    return colors;
  }, [routes]);

  const allStops = useMemo(() => {
    const merged = new Map<string, Stop>();
    for (const stop of stops) merged.set(stop.id, stop);
    for (const route of routes) {
      for (const stop of route.stops) merged.set(stop.id, stop);
    }
    return [...merged.values()];
  }, [stops, routes]);

  return (
    <div dir="ltr" className="absolute inset-0" role="application" aria-label="מפת אוטובוסים בזמן אמת">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={7}
        maxZoom={19}
        zoomControl={false}
        zoomSnap={0.5}
        preferCanvas
        className="h-full w-full"
      >
        <TileLayer
          key={theme}
          url={tile.url}
          attribution={TILE_ATTRIBUTION}
          subdomains="abcd"
          maxZoom={19}
          className={tile.className}
        />
        <ZoomControl position="bottomleft" />
        <MapController focus={focus} />
        <MapClickHandler onClear={onClearSelection} />
        <RoutesLayer routes={routes} theme={theme} />
        <StopsLayer
          stops={allStops}
          highlightedColors={highlightedColors}
          selectedStopId={selectedStopId}
          onSelectStop={onSelectStop}
        />
        <UserLocationLayer location={userLocation} />
        <BusLayer
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={onSelectVehicle}
        />
      </MapContainer>
    </div>
  );
}

const BusMap = memo(BusMapComponent);
export default BusMap;
