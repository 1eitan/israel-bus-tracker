import { createGuardedStore } from '../core/sensitive';
import type { KeyValueStore } from '../core/store';
import { createFavoriteStores, type FavoriteStores } from '../favorites/places';
import { createRecentSearches, type RecentSearchesService } from '../history/recents';
import { NotImplementedAddMethodLauncher } from '../payment/launcher';
import { NotImplementedPaymentProvider } from '../payment/notImplemented';
import { MockPaymentProvider } from '../payment/mock';
import { withConnectivity } from '../payment/connectivity';
import type { AddMethodLauncher, PaymentProvider } from '../payment/types';
import { MockAuthProvider, RealAuthProvider } from '../profile/auth';
import { MockProfileProvider, RealProfileProvider } from '../profile/provider';
import type { AuthProvider, ProfileProvider } from '../profile/types';
import { MockRoutePlannerProvider } from '../routing/mock';
import { NotImplementedRoutePlanner } from '../routing/notImplemented';
import type { RoutePlannerProvider } from '../routing/types';

export interface ServicesConfig {
  /**
   * true רק בבנייה לפיתוח עם הדגל המפורש (ראה lib/config.ts). ב-release תמיד false, ולכן
   * אי אפשר להגיע ל-Mock ולהציג הצלחה/מסלול מדומים למשתמש אמיתי.
   */
  useMocks: boolean;
  kv: KeyValueStore;
  isOnline: () => boolean;
  now?: () => number;
}

export interface AppServices {
  usingMocks: boolean;
  payment: PaymentProvider;
  paymentLauncher: AddMethodLauncher;
  auth: AuthProvider;
  profile: ProfileProvider;
  routePlanner: RoutePlannerProvider;
  favorites: FavoriteStores;
  recents: RecentSearchesService;
}

export function createServices(config: ServicesConfig): AppServices {
  // כל כתיבה לדיסק עוברת מסנן שדוחה מספרי כרטיס / CVV / secrets, גם אם נכנסו בטעות.
  const kv = createGuardedStore(config.kv);
  const profile: ProfileProvider = config.useMocks ? new MockProfileProvider() : new RealProfileProvider(kv);
  const paymentBase: PaymentProvider = config.useMocks
    ? new MockPaymentProvider({ now: config.now })
    : new NotImplementedPaymentProvider();

  return {
    usingMocks: config.useMocks,
    payment: withConnectivity(paymentBase, config.isOnline),
    paymentLauncher: new NotImplementedAddMethodLauncher(),
    auth: config.useMocks ? new MockAuthProvider() : new RealAuthProvider(),
    profile,
    routePlanner: config.useMocks ? new MockRoutePlannerProvider({ now: config.now }) : new NotImplementedRoutePlanner(),
    favorites: createFavoriteStores(kv),
    // הגדרת הפרטיות נקראת בזמן אמת - כיבוי שמירה חל מיד
    recents: createRecentSearches({ kv, isEnabled: () => profile.peek().privacy.saveSearchHistory, now: config.now })
  };
}
