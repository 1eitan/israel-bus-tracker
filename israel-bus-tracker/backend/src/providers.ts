import type { AppConfig } from './config';

/**
 * REAL            - מוגדר לקרוא ממקור חיצוני אמיתי (לא בהכרח אומת מול השירות החי).
 * MOCK            - נתוני הדגמה/סימולציה.
 * NOT_IMPLEMENTED - אין מימוש או אין הגדרה; לא מוחזרים נתונים.
 */
export type ProviderState = 'REAL' | 'MOCK' | 'NOT_IMPLEMENTED';

export interface ProviderInfo {
  state: ProviderState;
  detail: string;
}

export type StaticSource = 'file' | 'demo' | 'none';

export interface ProvidersReport {
  staticData: ProviderInfo;
  gtfsStaticImport: ProviderInfo;
  gtfsRealtime: ProviderInfo;
  siri: ProviderInfo;
  routePlanner: ProviderInfo;
}

type ProviderConfig = Pick<AppConfig, 'demoMode' | 'vehiclePositionsUrl' | 'siriSmUrl'>;

export function describeProviders(config: ProviderConfig, staticSource: StaticSource): ProvidersReport {
  const staticData: ProviderInfo =
    staticSource === 'file'
      ? { state: 'REAL', detail: 'קווים ותחנות נטענו מקובץ JSON (STATIC_DATA_PATH)' }
      : staticSource === 'demo'
        ? { state: 'MOCK', detail: 'נתוני הדגמה בתל אביב' }
        : { state: 'NOT_IMPLEMENTED', detail: 'לא נטענו נתונים סטטיים' };

  const siriActive = !config.demoMode && config.siriSmUrl !== '';
  const gtfsRtActive = !config.demoMode && !siriActive && config.vehiclePositionsUrl !== '';

  const gtfsRealtime: ProviderInfo = config.demoMode
    ? { state: 'MOCK', detail: 'סימולטור אוטובוסים (DEMO_MODE)' }
    : gtfsRtActive
      ? { state: 'REAL', detail: 'פיד GTFS-RT לפי VEHICLE_POSITIONS_URL (לא אומת מול שירות חי)' }
      : { state: 'NOT_IMPLEMENTED', detail: siriActive ? 'SIRI פעיל במקומו' : 'VEHICLE_POSITIONS_URL לא הוגדר' };

  const siri: ProviderInfo = siriActive
    ? {
        state: 'REAL',
        detail: 'SIRI-SM לפי SIRI_SM_URL (לא אומת מול שירות חי; יחידת Velocity ומיפוי DirectionRef לא אומתו מול ה-ICD)'
      }
    : {
        state: 'NOT_IMPLEMENTED',
        detail: config.demoMode ? 'מנוטרל ב-DEMO_MODE' : 'SIRI_SM_URL לא הוגדר'
      };

  return {
    staticData,
    gtfsStaticImport: {
      state: 'NOT_IMPLEMENTED',
      detail: 'אין פענוח של GTFS סטטי גולמי (zip/txt); רק JSON בפורמט routes/stops'
    },
    gtfsRealtime,
    siri,
    routePlanner: { state: 'NOT_IMPLEMENTED', detail: 'תכנון מסלול אינו קיים' }
  };
}
