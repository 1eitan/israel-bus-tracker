import type {
  LatLng,
  Route,
  Stop,
  StopTimeUpdate,
  TripUpdate,
  VehiclePosition
} from '../types/gtfs';
import {
  cumulativeDistances,
  distanceAlongShape,
  pointAtDistance
} from '../utils/geo';

interface DirectionPath {
  shape: LatLng[];
  cumulative: number[];
  total: number;
  /** סדר התחנות בכיוון הזה */
  stopIds: string[];
  /** מרחק כל תחנה מתחילת המסלול בכיוון הזה */
  stopDistances: number[];
  headsign: string;
}

interface SimVehicle {
  id: string;
  label: string;
  route: Route;
  paths: [DirectionPath, DirectionPath];
  direction: 0 | 1;
  /** מרחק שנגמר מתחילת המסלול בכיוון הנוכחי */
  distance: number;
  speedMs: number;
  targetSpeedMs: number;
  dwellUntil: number;
  delaySeconds: number;
  tripSequence: number;
  nextStopIndex: number;
}

export interface SimulationFrame {
  vehicles: VehiclePosition[];
  tripUpdates: TripUpdate[];
}

const AVERAGE_SPEED_FOR_ETA_MS = 6.5;
const VEHICLES_PER_ROUTE = 3;

/**
 * מדמה אוטובוסים שנוסעים לאורך הקווים: עוצרים בתחנות, מאיצים, מתעכבים
 * והופכים כיוון בסוף הקו. מייצר VehiclePosition ו-TripUpdate באותו מבנה
 * שמגיע מפיד GTFS-RT אמיתי.
 */
export class BusSimulator {
  private readonly vehicles: SimVehicle[] = [];

  private lastStepAt: number;

  constructor(routes: Route[], stops: Stop[], now: number = Date.now()) {
    this.lastStepAt = now;
    const stopsById = new Map(stops.map((stop) => [stop.id, stop]));

    routes.forEach((route, routeIndex) => {
      const forward = this.buildPath(route, stopsById, false);
      const backward = this.buildPath(route, stopsById, true);

      for (let n = 0; n < VEHICLES_PER_ROUTE; n += 1) {
        const startDirection: 0 | 1 = n % 2 === 0 ? 0 : 1;
        const path = startDirection === 0 ? forward : backward;
        const spread = (n + 0.5) / VEHICLES_PER_ROUTE;
        const vehicleNumber = 30000 + routeIndex * 100 + n * 7 + 11;
        this.vehicles.push({
          id: String(vehicleNumber),
          label: String(vehicleNumber),
          route,
          paths: [forward, backward],
          direction: startDirection,
          distance: path.total * spread * 0.9,
          speedMs: 0,
          targetSpeedMs: this.randomSpeed(),
          dwellUntil: 0,
          delaySeconds: Math.round(-30 + Math.random() * 420),
          tripSequence: n + 1,
          nextStopIndex: this.firstStopIndexAfter(path, path.total * spread * 0.9)
        });
      }
    });
  }

  private buildPath(route: Route, stopsById: Map<string, Stop>, reversed: boolean): DirectionPath {
    const shape = reversed ? [...route.shape].reverse() : [...route.shape];
    const cumulative = cumulativeDistances(shape);
    const stopIds = reversed ? [...route.stopIds].reverse() : [...route.stopIds];
    const stopDistances = stopIds.map((stopId) => {
      const stop = stopsById.get(stopId);
      if (!stop) return 0;
      return distanceAlongShape(shape, cumulative, { lat: stop.lat, lon: stop.lon });
    });
    const lastStop = stopsById.get(stopIds[stopIds.length - 1]);
    return {
      shape,
      cumulative,
      total: cumulative[cumulative.length - 1] ?? 0,
      stopIds,
      stopDistances,
      headsign: lastStop ? lastStop.name : route.longName
    };
  }

  private randomSpeed(): number {
    return 6 + Math.random() * 7;
  }

  private firstStopIndexAfter(path: DirectionPath, distance: number): number {
    const index = path.stopDistances.findIndex((d) => d > distance + 1);
    return index === -1 ? path.stopDistances.length - 1 : index;
  }

  /** מקדם את הסימולציה ומחזיר תמונת מצב נוכחית */
  step(now: number = Date.now()): SimulationFrame {
    const dt = Math.min(10, Math.max(0.2, (now - this.lastStepAt) / 1000));
    this.lastStepAt = now;

    const vehicles: VehiclePosition[] = [];
    const tripUpdates: TripUpdate[] = [];

    for (const vehicle of this.vehicles) {
      this.advance(vehicle, dt, now);
      vehicles.push(this.toPosition(vehicle, now));
      tripUpdates.push(this.toTripUpdate(vehicle, now));
    }

    return { vehicles, tripUpdates };
  }

  private advance(vehicle: SimVehicle, dt: number, now: number): void {
    const path = vehicle.paths[vehicle.direction];

    if (now < vehicle.dwellUntil) {
      vehicle.speedMs = 0;
      return;
    }

    if (Math.random() < 0.08) {
      vehicle.targetSpeedMs = this.randomSpeed();
    }
    vehicle.speedMs += (vehicle.targetSpeedMs - vehicle.speedMs) * Math.min(1, dt * 0.6);

    const previous = vehicle.distance;
    vehicle.distance += vehicle.speedMs * dt;

    vehicle.delaySeconds += (Math.random() - 0.5) * 5;
    vehicle.delaySeconds = Math.max(-90, Math.min(660, vehicle.delaySeconds));

    for (let i = 0; i < path.stopDistances.length; i += 1) {
      const stopDistance = path.stopDistances[i];
      if (previous < stopDistance && vehicle.distance >= stopDistance) {
        vehicle.distance = stopDistance;
        vehicle.speedMs = 0;
        vehicle.dwellUntil = now + (8 + Math.random() * 10) * 1000;
        vehicle.delaySeconds += 4;
        vehicle.nextStopIndex = Math.min(i + 1, path.stopIds.length - 1);
        break;
      }
    }

    if (vehicle.distance >= path.total) {
      vehicle.direction = vehicle.direction === 0 ? 1 : 0;
      vehicle.distance = 0;
      vehicle.speedMs = 0;
      vehicle.dwellUntil = now + 25000;
      vehicle.tripSequence += 1;
      vehicle.delaySeconds = Math.round(-20 + Math.random() * 240);
      const nextPath = vehicle.paths[vehicle.direction];
      vehicle.nextStopIndex = this.firstStopIndexAfter(nextPath, 1);
    }
  }

  private tripIdOf(vehicle: SimVehicle): string {
    return `${vehicle.route.id}-d${vehicle.direction}-t${vehicle.tripSequence}-${vehicle.id}`;
  }

  private toPosition(vehicle: SimVehicle, now: number): VehiclePosition {
    const path = vehicle.paths[vehicle.direction];
    const point = pointAtDistance(path.shape, path.cumulative, vehicle.distance);
    const nextStopId = path.stopIds[vehicle.nextStopIndex] ?? null;
    return {
      id: vehicle.id,
      label: vehicle.label,
      routeId: vehicle.route.id,
      routeShortName: vehicle.route.shortName,
      routeColor: vehicle.route.color,
      routeTextColor: vehicle.route.textColor,
      headsign: path.headsign,
      tripId: this.tripIdOf(vehicle),
      directionId: vehicle.direction,
      lat: point.lat,
      lon: point.lon,
      bearing: point.bearing,
      speedKmh: Math.round(vehicle.speedMs * 3.6),
      timestamp: Math.floor(now / 1000),
      delaySeconds: Math.round(vehicle.delaySeconds),
      nextStopId
    };
  }

  private toTripUpdate(vehicle: SimVehicle, now: number): TripUpdate {
    const path = vehicle.paths[vehicle.direction];
    const updates: StopTimeUpdate[] = [];
    let cumulativeDwell = 0;
    const nowSeconds = Math.floor(now / 1000);
    const currentDwellRemaining = Math.max(0, (vehicle.dwellUntil - now) / 1000);

    path.stopIds.forEach((stopId, index) => {
      const stopDistance = path.stopDistances[index];
      const remaining = stopDistance - vehicle.distance;
      if (remaining < 1) return;
      const travelSeconds = remaining / AVERAGE_SPEED_FOR_ETA_MS;
      const arrival = nowSeconds + currentDwellRemaining + travelSeconds + cumulativeDwell;
      updates.push({
        stopId,
        stopSequence: index + 1,
        arrivalTime: Math.round(arrival),
        delaySeconds: Math.round(vehicle.delaySeconds)
      });
      cumulativeDwell += 12;
    });

    return {
      tripId: this.tripIdOf(vehicle),
      routeId: vehicle.route.id,
      vehicleId: vehicle.id,
      headsign: path.headsign,
      delaySeconds: Math.round(vehicle.delaySeconds),
      timestamp: nowSeconds,
      stopTimeUpdates: updates
    };
  }
}
