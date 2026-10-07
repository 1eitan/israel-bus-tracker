const R = 6371000;
const rad = (d: number): number => (d * Math.PI) / 180;

/** מרחק במטרים (Haversine) - אותו אלגוריתם כמו ב-backend */
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** קואורדינטה תקינה: מספרים סופיים בטווח, ולא (0,0) (ערך "ריק" נפוץ של GPS/שרת) */
export function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0)
  );
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} מ׳`;
  return `${(meters / 1000).toFixed(1)} ק״מ`;
}
