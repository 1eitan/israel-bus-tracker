import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import RouteCard from '../../components/RouteCard';
import SearchInput from '../../components/SearchInput';
import { useFavoriteRoutes } from '../../hooks/useFavoriteRoutes';
import { useRoutes } from '../../hooks/queries';
import type { RouteSummary } from '../../types/bus';
import { colors, space } from '../../theme/tokens';

interface Props {
  focused: boolean;
  onOpenRoute: (routeId: string) => void;
}

const NO_ROUTES: RouteSummary[] = [];

/** מפריד יציב (ראה StopsTab) */
const Gap = () => <View style={styles.gap} />;

/** לשונית "קווים": חיפוש + רשימת קווים מה-backend, מועדפים, pull-to-refresh. */
export default function LinesTab({ focused, onOpenRoute }: Props) {
  const [query, setQuery] = useState('');
  const { toggle, isFavorite } = useFavoriteRoutes();
  // מטמון + retry + offline מנוהלים ב-React Query; הרשימה נשמרת לדיסק ומוצגת גם בלי רשת
  const routesQuery = useRoutes(focused);
  // הפניה יציבה כשאין נתונים: מערך חדש בכל רינדור היה מבטל את ה-useMemo
  const routes = routesQuery.data ?? NO_ROUTES;
  // רשימת קווים אמיתית היא באלפים: ההקלדה נשארת חלקה, והסינון רץ בעדיפות נמוכה
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    const list = q ? routes.filter((r) => r.shortName.includes(q) || r.longName.includes(q)) : routes;
    // מועדפים קודם
    return [...list].sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
  }, [routes, deferredQuery, isFavorite]);

  const empty = (() => {
    if (!routesQuery.data) {
      if (routesQuery.error) {
        return (
          <ErrorState
            title="לא הצלחנו לטעון קווים"
            message={routesQuery.offline ? 'אין חיבור לאינטרנט. הקווים יוצגו ברגע שהחיבור יחזור.' : undefined}
            onRetry={routesQuery.refresh}
          />
        );
      }
      return <LoadingSkeleton count={4} variant="route" />;
    }
    return query.trim() ? (
      <EmptyState icon="search-outline" title="לא נמצאו קווים" message={`אין תוצאות עבור "${query.trim()}".`} />
    ) : (
      <EmptyState icon="bus-outline" title="אין קווים זמינים" message="הרשימה תופיע כשהשרת יחזיר קווים." />
    );
  })();

  return (
    <View style={styles.flex}>
      <View style={styles.search}>
        <SearchInput
          large
          placeholder="חיפוש קו או יעד"
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={routesQuery.data ? filtered : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Gap}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={routesQuery.refreshing}
            onRefresh={routesQuery.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({ item }) => (
          <RouteCard
            routeNumber={item.shortName}
            destination={item.longName || `קו ${item.shortName}`}
            operator={item.agency}
            badgeColor={item.color}
            badgeTextColor={item.textColor}
            favorite={isFavorite(item.id)}
            onToggleFavorite={() => toggle(item.id)}
            onPress={() => onOpenRoute(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: space(4), paddingBottom: space(3) },
  content: { paddingHorizontal: space(4), paddingBottom: space(8), flexGrow: 1 },
  gap: { height: space(2) }
});
