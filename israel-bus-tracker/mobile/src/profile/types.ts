import type { Outcome } from '../core/outcome';

/** ---------- Auth ---------- */

/** זהות מינימלית. אין כאן שדות שלא סוכמו עם שרת חשבונות (שרת כזה לא קיים). */
export interface Session {
  userId: string;
  displayName: string | null;
}

export interface SignInRequest {
  method: 'email' | 'phone';
  identifier: string;
}

export interface AuthProvider {
  readonly id: string;
  readonly isMock: boolean;
  /** null = אורח (לא מחובר). אין זה שגיאה. */
  getSession(): Promise<Outcome<Session | null>>;
  signIn(request: SignInRequest): Promise<Outcome<Session>>;
  signOut(): Promise<Outcome<void>>;
  subscribe(listener: () => void): () => void;
}

/** ---------- Profile ---------- */

export interface UserProfile {
  /** שם תצוגה שנשמר *במכשיר בלבד* */
  displayName: string | null;
}

export interface AppSettings {
  haptics: boolean;
}

export interface NotificationPrefs {
  arrivals: boolean;
  disruptions: boolean;
  serviceUpdates: boolean;
}

export interface PrivacyPrefs {
  /** האם לשמור חיפושים אחרונים. כבוי = לא נשמר כלום */
  saveSearchHistory: boolean;
}

export interface ProfileSnapshot {
  profile: UserProfile;
  settings: AppSettings;
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
}

export const DEFAULT_PROFILE_SNAPSHOT: ProfileSnapshot = {
  profile: { displayName: null },
  settings: { haptics: true },
  // התראות הן opt-in: כבוי כברירת מחדל
  notifications: { arrivals: false, disruptions: false, serviceUpdates: false },
  privacy: { saveSearchHistory: true }
};

export interface ProfileProvider {
  readonly id: string;
  readonly isMock: boolean;
  /** מצב נוכחי, סינכרוני (מהזיכרון) - מתאים ל-useSyncExternalStore */
  peek(): ProfileSnapshot;
  subscribe(listener: () => void): () => void;
  load(): Promise<Outcome<ProfileSnapshot>>;
  updateProfile(patch: Partial<UserProfile>): Promise<Outcome<ProfileSnapshot>>;
  updateSettings(patch: Partial<AppSettings>): Promise<Outcome<ProfileSnapshot>>;
  updateNotifications(patch: Partial<NotificationPrefs>): Promise<Outcome<ProfileSnapshot>>;
  updatePrivacy(patch: Partial<PrivacyPrefs>): Promise<Outcome<ProfileSnapshot>>;
  /** סנכרון עם חשבון מרוחק. אין שרת חשבונות => NOT_IMPLEMENTED במימוש האמיתי */
  syncWithAccount(): Promise<Outcome<void>>;
  /** מחיקת הפרופיל וההעדפות המקומיים (חזרה לברירות מחדל) */
  clearLocalData(): Promise<Outcome<void>>;
}
