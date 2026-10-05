import type { LatLng, Route, StaticGtfsData, Stop } from '../types/gtfs';

/**
 * נתוני הדגמה: תחנות וקווים בתל אביב.
 * משמשים במצב DEMO_MODE וכברירת מחדל כשלא הוגדר קובץ GTFS סטטי.
 */
const DEMO_STOPS: Stop[] = [
  { id: 'S100', code: '10001', name: 'אוניברסיטת תל אביב', lat: 32.1131, lon: 34.8044 },
  { id: 'S101', code: '10002', name: 'תחנת רכבת האוניברסיטה', lat: 32.1032, lon: 34.8046 },
  { id: 'S102', code: '10003', name: 'תחנת רידינג', lat: 32.0986, lon: 34.7862 },
  { id: 'S103', code: '10004', name: 'כיכר דיזנגוף', lat: 32.0780, lon: 34.7741 },
  { id: 'S104', code: '10005', name: 'תיאטרון הבימה', lat: 32.0724, lon: 34.7790 },
  { id: 'S105', code: '10006', name: 'שדרות רוטשילד / אלנבי', lat: 32.0647, lon: 34.7706 },
  { id: 'S106', code: '10007', name: 'שוק הכרמל', lat: 32.0683, lon: 34.7683 },
  { id: 'S107', code: '10008', name: 'מגדל השעון - יפו', lat: 32.0541, lon: 34.7519 },
  { id: 'S108', code: '10009', name: 'מרכז עזריאלי', lat: 32.0745, lon: 34.7919 },
  { id: 'S109', code: '10010', name: 'תחנה מרכזית ארלוזורוב', lat: 32.0840, lon: 34.7981 },
  { id: 'S110', code: '10011', name: 'בורסת היהלומים', lat: 32.0838, lon: 34.8035 },
  { id: 'S111', code: '10012', name: 'תחנת ההגנה', lat: 32.0561, lon: 34.7846 },
  { id: 'S112', code: '10013', name: 'בית חולים איכילוב', lat: 32.0807, lon: 34.7895 },
  { id: 'S113', code: '10014', name: 'כיכר הבימה', lat: 32.0731, lon: 34.7786 },
  { id: 'S114', code: '10015', name: 'נמל תל אביב', lat: 32.0975, lon: 34.7737 }
];

function stopById(id: string): Stop {
  const found = DEMO_STOPS.find((stop) => stop.id === id);
  if (!found) {
    throw new Error(`Demo stop not found: ${id}`);
  }
  return found;
}

function shapeFromStops(stopIds: string[]): LatLng[] {
  return stopIds.map((id) => {
    const stop = stopById(id);
    return { lat: stop.lat, lon: stop.lon };
  });
}

function buildRoute(
  id: string,
  shortName: string,
  longName: string,
  color: string,
  textColor: string,
  stopIds: string[]
): Route {
  return {
    id,
    shortName,
    longName,
    agency: 'דן',
    color,
    textColor,
    stopIds,
    shape: shapeFromStops(stopIds)
  };
}

export function buildDemoData(): StaticGtfsData {
  const routes: Route[] = [
    buildRoute(
      'R5',
      '5',
      'רידינג ⇄ מגדל השעון יפו',
      '#e11d48',
      '#ffffff',
      ['S102', 'S103', 'S104', 'S105', 'S106', 'S107']
    ),
    buildRoute(
      'R18',
      '18',
      'אוניברסיטת תל אביב ⇄ תחנת ההגנה',
      '#0284c7',
      '#ffffff',
      ['S100', 'S101', 'S102', 'S112', 'S108', 'S111']
    ),
    buildRoute(
      'R25',
      '25',
      'בורסת היהלומים ⇄ מגדל השעון יפו',
      '#16a34a',
      '#ffffff',
      ['S110', 'S109', 'S108', 'S113', 'S105', 'S107']
    ),
    buildRoute(
      'R72',
      '72',
      'נמל תל אביב ⇄ שוק הכרמל',
      '#f59e0b',
      '#0f172a',
      ['S114', 'S103', 'S113', 'S106']
    )
  ];

  return { routes, stops: DEMO_STOPS.map((stop) => ({ ...stop })) };
}
