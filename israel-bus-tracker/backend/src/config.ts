import dotenv from 'dotenv';

dotenv.config();

function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const vehiclePositionsUrl = process.env.VEHICLE_POSITIONS_URL?.trim() ?? '';
const tripUpdatesUrl = process.env.TRIP_UPDATES_URL?.trim() ?? '';
const siriSmUrl = process.env.SIRI_SM_URL?.trim() ?? '';

export const config = {
  port: toInt(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  demoMode: toBool(process.env.DEMO_MODE, true) || (vehiclePositionsUrl === '' && siriSmUrl === ''),
  vehiclePositionsUrl,
  tripUpdatesUrl,
  /** SIRI-SM (Stop Monitoring) של משרד התחבורה - שאילתה לפי תחנה. נדרש מפתח והוספת IP לרשימה הלבנה. */
  siriSmUrl,
  siriKey: process.env.SIRI_KEY?.trim() ?? '',
  siriKeyParam: process.env.SIRI_KEY_PARAM?.trim() || 'Key',
  siriKeyHeader: process.env.SIRI_KEY_HEADER?.trim() ?? '',
  siriMinRefreshMs: Math.max(3000, toInt(process.env.SIRI_MIN_REFRESH_MS, 10000)),
  siriHotStopTtlMs: Math.max(30000, toInt(process.env.SIRI_HOT_STOP_TTL_MS, 120000)),
  siriWarmStopIds: (process.env.SIRI_WARM_STOP_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  apiKey: process.env.GTFS_API_KEY?.trim() ?? '',
  apiKeyHeader: process.env.GTFS_API_KEY_HEADER?.trim() || 'x-api-key',
  apiKeyParam: process.env.GTFS_API_KEY_PARAM?.trim() ?? '',
  staticDataPath: process.env.STATIC_DATA_PATH?.trim() ?? '',
  pollIntervalMs: Math.max(1000, toInt(process.env.POLL_INTERVAL_MS, 3000)),
  vehicleStaleMs: Math.max(10000, toInt(process.env.VEHICLE_STALE_MS, 120000))
};

export type AppConfig = typeof config;
