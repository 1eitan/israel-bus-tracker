export type RootStackParamList = {
  Tabs: undefined;
  Map: { routeId?: string; focus?: { lat: number; lon: number; label: string } } | undefined;
};

export type TabParamList = {
  Plan: undefined;
  Payment: undefined;
  RavKav: undefined;
  Profile: undefined;
};
