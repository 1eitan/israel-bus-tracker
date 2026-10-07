import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../../components/AppText';
import Chip from '../../components/Chip';
import DemoBadge from '../../components/DemoBadge';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import FavoriteCard from '../../components/FavoriteCard';
import ItineraryCard from '../../components/ItineraryCard';
import NotImplementedCard from '../../components/NotImplementedCard';
import PrimaryButton from '../../components/PrimaryButton';
import RecentSearchCard from '../../components/RecentSearchCard';
import SecondaryButton from '../../components/SecondaryButton';
import SectionHeader from '../../components/SectionHeader';
import TripFields from '../../components/TripFields';
import type { FavoritePlace } from '../../favorites/places';
import type { RecentSearch } from '../../history/recents';
import { useRoutePlanner } from '../../hooks/useRoutePlanner';
import type { TimeSpec } from '../../routing/types';
import { space } from '../../theme/tokens';

export interface GoToTarget {
  title: string;
  subtitle?: string;
  lat?: number;
  lon?: number;
}

interface Props {
  favorites: FavoritePlace[];
  recents: RecentSearch[];
  isFavorite: (title: string) => boolean;
  onGoTo: (place: GoToTarget) => Promise<void>;
  onRecord: (title: string) => void;
  onToggleFavorite: (place: GoToTarget) => void;
  onRemoveFavorite: (id: string) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecents: () => void;
}

type TimeMode = 'depart' | 'arrive';
const OFFSETS_MIN = [0, 30, 60, 120] as const;
const offsetLabel = (m: number): string => (m === 0 ? 'עכשיו' : m < 60 ? `בעוד ${m} דק׳` : `בעוד ${m / 60} ${m === 60 ? 'שעה' : 'שעות'}`);

function buildTime(mode: TimeMode, offsetMin: number, now: number): TimeSpec {
  if (mode === 'depart') return offsetMin === 0 ? { mode: 'depart_now' } : { mode: 'depart_at', at: now + offsetMin * 60_000 };
  return { mode: 'arrive_by', at: now + Math.max(offsetMin, 30) * 60_000 };
}

/**
 * לשונית "תכנון מסלול". התכנון עצמו עובר דרך RoutePlannerProvider:
 *  - אין מנוע => NOT_IMPLEMENTED (מוצג כך, בלי מסלול מומצא)
 *  - Mock (פיתוח בלבד) => מסלול מסומן "הדגמה"
 * "הצג יעד במפה" נשאר כמו בשלב 1 ואינו תכנון מסלול.
 */
export default function PlanTab({
  favorites,
  recents,
  isFavorite,
  onGoTo,
  onRecord,
  onToggleFavorite,
  onRemoveFavorite,
  onRemoveRecent,
  onClearRecents
}: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [timeMode, setTimeMode] = useState<TimeMode>('depart');
  const [offsetMin, setOffsetMin] = useState<number>(0);
  const planner = useRoutePlanner();
  const submitted = useRef('');

  const showOnMap = async () => {
    const title = to.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onGoTo({ title });
    } finally {
      setBusy(false);
    }
  };

  const planTrip = () => {
    if (!to.trim() || planner.state.phase === 'loading') return;
    submitted.current = to.trim();
    void planner.plan(from, to, buildTime(timeMode, offsetMin, Date.now()));
  };

  // יעד נשמר בהיסטוריה רק אחרי שאותר בהצלחה (הגענו עד הספק), ולא על קלט שגוי
  const phase = planner.state.phase;
  useEffect(() => {
    if ((phase === 'ok' || phase === 'empty' || phase === 'not_implemented') && submitted.current) {
      onRecord(submitted.current);
      submitted.current = '';
    }
  }, [phase, onRecord]);

  const swap = () => {
    setFrom(to);
    setTo(from);
    planner.reset();
  };

  const favoriteMenu = (place: FavoritePlace) =>
    Alert.alert(place.title, undefined, [
      { text: 'הסרה מהמועדפים', style: 'destructive', onPress: () => onRemoveFavorite(place.id) },
      { text: 'ביטול', style: 'cancel' }
    ]);

  const { state } = planner;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <TripFields from={from} to={to} onFromChange={setFrom} onToChange={setTo} onSwap={swap} onSubmit={planTrip} />

      <View style={styles.chips} accessibilityRole="tablist">
        <Chip label="יציאה" selected={timeMode === 'depart'} onPress={() => setTimeMode('depart')} />
        <Chip
          label="הגעה עד"
          selected={timeMode === 'arrive'}
          onPress={() => {
            setTimeMode('arrive');
            if (offsetMin === 0) setOffsetMin(30);
          }}
        />
      </View>
      <View style={styles.chips} accessibilityRole="tablist">
        {OFFSETS_MIN.filter((m) => timeMode === 'depart' || m > 0).map((m) => (
          <Chip key={m} label={offsetLabel(m)} selected={offsetMin === m} onPress={() => setOffsetMin(m)} />
        ))}
      </View>

      <View style={styles.cta}>
        <PrimaryButton title="תכנון מסלול" icon="navigate" onPress={planTrip} loading={state.phase === 'loading'} disabled={!to.trim()} />
        <SecondaryButton title="הצג יעד במפה" icon="map" onPress={() => void showOnMap()} disabled={!to.trim() || busy} />
      </View>

      <View style={styles.result}>
        {state.phase === 'idle' ? (
          <AppText variant="caption">
            מוצא ריק = המיקום שלך (אם ניתנה הרשאה). {planner.isMock ? '' : 'אפשר גם לאתר יעד על המפה ולראות תחנות בסביבתו.'}
          </AppText>
        ) : null}
        {state.phase === 'not_implemented' ? (
          <NotImplementedCard title="תכנון מסלול" message={state.reason} icon="navigate-outline" />
        ) : null}
        {state.phase === 'error' ? (
          <ErrorState
            title="לא הצלחנו לתכנן מסלול"
            message={state.failure.message}
            onRetry={state.failure.retryable ? planTrip : undefined}
          />
        ) : null}
        {state.phase === 'empty' ? <EmptyState icon="trail-sign-outline" title="לא נמצאו מסלולים" message="נסה זמן אחר או יעד אחר." /> : null}
        {state.phase === 'ok' ? (
          <View style={styles.stack}>
            {planner.isMock ? <DemoBadge label="הדגמה - המסלולים אינם אמיתיים" /> : null}
            {state.itineraries.map((it) => (
              <ItineraryCard key={it.id} itinerary={it} />
            ))}
          </View>
        ) : null}
      </View>

      <SectionHeader title="מועדפים" />
      <View style={styles.stack}>
        {favorites.length === 0 ? (
          <EmptyState icon="star-outline" title="אין מועדפים עדיין" message="מקומות שתשמור יופיעו כאן לגישה מהירה." />
        ) : (
          favorites.map((place) => (
            <FavoriteCard
              key={place.id}
              icon={place.icon}
              title={place.title}
              subtitle={place.subtitle}
              onPress={() => void onGoTo(place)}
              onMenuPress={() => favoriteMenu(place)}
            />
          ))
        )}
      </View>

      <SectionHeader
        title="חיפושים אחרונים"
        actionLabel={recents.length > 0 ? 'נקה הכול' : undefined}
        onActionPress={onClearRecents}
      />
      <View>
        {recents.length === 0 ? (
          <EmptyState icon="time-outline" title="אין חיפושים אחרונים" message="יעדים שחיפשת יופיעו כאן." />
        ) : (
          recents.map((place) => (
            <RecentSearchCard
              key={place.id}
              title={place.title}
              subtitle={place.subtitle}
              isFavorite={isFavorite(place.title)}
              onToggleFavorite={() => onToggleFavorite(place)}
              onPress={() => void onGoTo(place)}
              onRemove={() => onRemoveRecent(place.id)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  cta: { gap: space(2), marginTop: space(3) },
  result: { marginTop: space(3) },
  stack: { gap: space(2) }
});
