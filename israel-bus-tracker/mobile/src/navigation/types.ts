export type PrefsKind = 'settings' | 'notifications' | 'privacy';

export type RootStackParamList = {
  Tabs: undefined;
  Map: { routeId?: string; focus?: { lat: number; lon: number; label: string } } | undefined;
  Services: undefined;
  Favorites: undefined;
  History: undefined;
  Prefs: { kind: PrefsKind };
  Help: undefined;
};

export type TabParamList = {
  Plan: undefined;
  Payment: undefined;
  RavKav: undefined;
  Profile: undefined;
};
