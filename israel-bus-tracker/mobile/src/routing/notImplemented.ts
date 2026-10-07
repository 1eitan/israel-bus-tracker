import { notImplemented, type Outcome } from '../core/outcome';
import {
  NO_CAPABILITIES,
  type Itinerary,
  type PlannerCapabilities,
  type RealRoutePlannerProvider,
  type RoutePlannerConfig,
  type RouteQuery
} from './types';

export const ROUTE_PLANNER_NOT_IMPLEMENTED_REASON =
  'מנוע תכנון המסלולים עדיין לא מחובר. אפשר לאתר יעד על המפה ולראות תחנות בסביבתו.';

/** ברירת המחדל כשאין מנוע: NOT_IMPLEMENTED. לא ממציא מסלול. */
export class NotImplementedRoutePlanner implements RealRoutePlannerProvider {
  readonly id = 'routing.not_implemented';
  readonly isMock = false as const;
  readonly engine = 'none';
  readonly requiresNetwork = false;
  readonly capabilities: PlannerCapabilities = NO_CAPABILITIES;

  async configure(_config: RoutePlannerConfig): Promise<Outcome<void>> {
    return notImplemented('routing.configure', ROUTE_PLANNER_NOT_IMPLEMENTED_REASON);
  }
  async plan(_query: RouteQuery): Promise<Outcome<Itinerary[]>> {
    return notImplemented('routing.plan', ROUTE_PLANNER_NOT_IMPLEMENTED_REASON);
  }
}
