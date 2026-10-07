import { ok, type Outcome } from '../core/outcome';
import type { AppServices } from './factory';

/**
 * "מחק את כל הנתונים במכשיר" (פרטיות): מועדפים (מקומות/תחנות/קווים), חיפושים אחרונים והפרופיל.
 * מועדפי המקומות מתרוקנים לגמרי - לא חוזרים לערכי ברירת המחדל של העיצוב.
 * לא נוגע בשום דבר מרוחק (אין backend) ולא בכרטיס הרב-קו (שום דבר ממנו לא נשמר).
 */
export async function clearAllLocalData(services: AppServices): Promise<Outcome<void>> {
  await Promise.all([
    services.favorites.places.update(() => []),
    services.favorites.stops.update(() => []),
    services.favorites.routes.update(() => []),
    services.recents.clear(),
    services.profile.clearLocalData()
  ]);
  return ok(undefined);
}
