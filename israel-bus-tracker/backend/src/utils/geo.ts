import type { LatLng } from '../types/gtfs';

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** מרחק במטרים בין שתי נקודות (Haversine) */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** כיוון (Bearing) במעלות מנקודה a לנקודה b */
export function bearingBetween(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** מרחקים מצטברים (במטרים) לאורך מסלול. האיבר הראשון הוא 0. */
export function cumulativeDistances(shape: LatLng[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < shape.length; i += 1) {
    result.push(result[i - 1] + haversine(shape[i - 1], shape[i]));
  }
  return result;
}

export interface PointOnPath {
  lat: number;
  lon: number;
  bearing: number;
}

/** נקודה על המסלול במרחק s מתחילתו (במטרים) */
export function pointAtDistance(shape: LatLng[], cumulative: number[], s: number): PointOnPath {
  if (shape.length === 0) {
    return { lat: 0, lon: 0, bearing: 0 };
  }
  if (shape.length === 1) {
    return { lat: shape[0].lat, lon: shape[0].lon, bearing: 0 };
  }
  const total = cumulative[cumulative.length - 1];
  const clamped = Math.max(0, Math.min(total, s));
  let index = 0;
  for (let i = 0; i < cumulative.length - 1; i += 1) {
    if (clamped >= cumulative[i] && clamped <= cumulative[i + 1]) {
      index = i;
      break;
    }
    index = i;
  }
  const segmentLength = cumulative[index + 1] - cumulative[index];
  const ratio = segmentLength === 0 ? 0 : (clamped - cumulative[index]) / segmentLength;
  const from = shape[index];
  const to = shape[index + 1];
  return {
    lat: from.lat + (to.lat - from.lat) * ratio,
    lon: from.lon + (to.lon - from.lon) * ratio,
    bearing: bearingBetween(from, to)
  };
}

/** המרחק לאורך המסלול של הנקודה הקרובה ביותר (לפי קודקודי המסלול) */
export function distanceAlongShape(shape: LatLng[], cumulative: number[], point: LatLng): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < shape.length; i += 1) {
    const d = haversine(shape[i], point);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return cumulative[bestIndex] ?? 0;
}

/** צבע קבוע ויציב לפי מחרוזת (לקווים ללא צבע מוגדר) */
export function colorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return hslToHex(hue, 65, 42);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** צבע טקסט קריא (שחור/לבן) מעל צבע רקע */
export function readableTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}
