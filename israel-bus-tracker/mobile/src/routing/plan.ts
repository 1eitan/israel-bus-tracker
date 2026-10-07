import { fail, failure, ok, type Outcome } from '../core/outcome';
import { findItineraryProblem, validateRouteQuery } from './validate';
import type { Itinerary, RoutePlannerProvider, RouteQuery } from './types';

export interface PlanDeps {
  isOnline: () => boolean;
  now?: () => number;
  signal?: AbortSignal;
}

/**
 * נקודת הכניסה היחידה של ה-UI לתכנון מסלול:
 *  1. ולידציה (לפני כל קריאה לספק)
 *  2. offline => שגיאה, בלי לפנות לספק (אם הוא תלוי רשת)
 *  3. קריאה לספק; חריגה => error
 *  4. NOT_IMPLEMENTED עובר כמו שהוא (לא הופך לרשימה ריקה)
 *  5. תשובה לא תקינה => error 'invalid_response'
 * "אין מסלולים" הוא ok עם מערך ריק - שונה מ-NOT_IMPLEMENTED.
 */
export async function planRoute(
  provider: RoutePlannerProvider,
  query: RouteQuery,
  deps: PlanDeps
): Promise<Outcome<Itinerary[]>> {
  const now = (deps.now ?? Date.now)();
  const problem = validateRouteQuery(query, now);
  if (problem) return { kind: 'error', error: problem };
  if (deps.signal?.aborted) return fail('cancelled');
  if (provider.requiresNetwork && !deps.isOnline()) return fail('offline');

  let result: Outcome<Itinerary[]>;
  try {
    result = await provider.plan(query, { signal: deps.signal });
  } catch (error) {
    if (deps.signal?.aborted) return fail('cancelled');
    return { kind: 'error', error: failure('unknown', error instanceof Error ? error.message : String(error)) };
  }
  if (deps.signal?.aborted) return fail('cancelled');
  if (result.kind !== 'ok') return result;

  if (!Array.isArray(result.data)) return fail('invalid_response', 'itineraries is not an array');
  for (const itinerary of result.data) {
    const bad = findItineraryProblem(itinerary);
    if (bad) return fail('invalid_response', `invalid itinerary: ${bad}`);
  }
  return ok(result.data);
}
