import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

import type { AppConfig } from '../config';
import type { Route, Stop, TripUpdate, VehiclePosition } from '../types/gtfs';

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function toSeconds(iso: unknown): number {
  const ms = Date.parse(text(iso));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

export interface SiriStopResult {
  vehicles: VehiclePosition[];
  tripUpdates: TripUpdate[];
}

type RouteResolver = (lineRef: string, publishedName: string) => Route;

/**
 * לקוח SIRI-SM (Stop Monitoring) של משרד התחבורה.
 * שאילתה לכל תחנה מחזירה את הרכבים שבדרך אליה, עם מיקום (VehicleLocation)
 * וזמן הגעה צפוי (ExpectedArrivalTime). הם ממופים לאותם מבנים (VehiclePosition / TripUpdate)
 * שהשרת כבר משתמש בהם עבור GTFS-RT, כך ששאר המערכת (WebSocket, API) לא משתנה.
 *
 * הערה: ה-API מחייב מפתח ו-IP ברשימה לבנה, ולכן הקריאה מתבצעת רק מהשרת ולא מהאפליקציה.
 */
export class SiriService {
  constructor(private readonly config: AppConfig) {}

  private buildUrl(stopCode: string): string {
    const url = new URL(this.config.siriSmUrl);
    url.searchParams.set('MonitoringRef', stopCode);
    url.searchParams.set('StopVisitDetailLevel', 'normal');
    if (this.config.siriKey && this.config.siriKeyParam && !this.config.siriKeyHeader) {
      url.searchParams.set(this.config.siriKeyParam, this.config.siriKey);
    }
    return url.toString();
  }

  public async fetchStop(stop: Stop, resolveRoute: RouteResolver): Promise<SiriStopResult> {
    const headers: Record<string, string> = { Accept: 'application/xml, text/xml' };
    if (this.config.siriKey && this.config.siriKeyHeader) {
      headers[this.config.siriKeyHeader] = this.config.siriKey;
    }
    const response = await axios.get<string>(this.buildUrl(stop.code), {
      responseType: 'text',
      timeout: 10000,
      headers
    });
    return this.parse(response.data, stop, resolveRoute);
  }

  public parse(xml: string, stop: Stop, resolveRoute: RouteResolver): SiriStopResult {
    const doc = parser.parse(xml) as Record<string, any>;
    const deliveries = asArray(doc?.Siri?.ServiceDelivery?.StopMonitoringDelivery);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const vehicles = new Map<string, VehiclePosition>();
    const tripUpdates: TripUpdate[] = [];

    for (const delivery of deliveries) {
      for (const visit of asArray<any>(delivery?.MonitoredStopVisit)) {
        const journey = visit?.MonitoredVehicleJourney;
        if (!journey) continue;

        const lineRef = text(journey.LineRef);
        if (!lineRef) continue;
        const route = resolveRoute(lineRef, text(journey.PublishedLineName));

        const call = journey.MonitoredCall ?? {};
        const arrivalTime =
          toSeconds(call.ExpectedArrivalTime) || toSeconds(call.ExpectedDepartureTime);
        if (arrivalTime <= 0) continue;
        const aimed = toSeconds(call.AimedArrivalTime);
        const delaySeconds = aimed > 0 ? arrivalTime - aimed : 0;

        const vehicleId = text(journey.VehicleRef) || null;
        const dated = text(journey.FramedVehicleJourneyRef?.DatedVehicleJourneyRef);
        const tripId =
          dated || `${lineRef}:${vehicleId ?? 'unknown'}:${text(journey.OriginAimedDepartureTime)}`;
        const headsign = text(journey.DestinationName) || route.longName;
        const direction = text(journey.DirectionRef) === '2' || text(journey.DirectionRef) === '1' ? 1 : 0;

        tripUpdates.push({
          tripId,
          routeId: route.id,
          vehicleId,
          headsign,
          delaySeconds,
          timestamp: toSeconds(visit.RecordedAtTime) || nowSeconds,
          stopTimeUpdates: [
            {
              stopId: stop.id,
              stopSequence: Number(call.Order) || 0,
              arrivalTime,
              delaySeconds
            }
          ]
        });

        const lat = Number(journey.VehicleLocation?.Latitude);
        const lon = Number(journey.VehicleLocation?.Longitude);
        if (vehicleId && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
          vehicles.set(vehicleId, {
            id: vehicleId,
            label: vehicleId,
            routeId: route.id,
            routeShortName: route.shortName,
            routeColor: route.color,
            routeTextColor: route.textColor,
            headsign,
            tripId,
            directionId: direction,
            lat,
            lon,
            bearing: Number(journey.Bearing) || 0,
            // יחידת Velocity לא אומתה מול ה-ICD; מניחים קמ"ש. יש לאמת לפני הצגה למשתמשים.
            speedKmh: Math.round(Number(journey.Velocity) || 0),
            timestamp: toSeconds(visit.RecordedAtTime) || nowSeconds,
            delaySeconds,
            nextStopId: stop.id
          });
        }
      }
    }

    return { vehicles: [...vehicles.values()], tripUpdates };
  }
}
