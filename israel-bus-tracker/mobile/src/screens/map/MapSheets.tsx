import { StyleSheet, View } from 'react-native';

import AppText from '../../components/AppText';
import ArrivalRow from '../../components/ArrivalRow';
import { BottomSheetScrollView } from '../../components/BottomSheet';
import ErrorState from '../../components/ErrorState';
import FavoriteButton from '../../components/FavoriteButton';
import IconButton from '../../components/IconButton';
import { StationCardSkeleton } from '../../components/LoadingSkeleton';
import PrimaryButton from '../../components/PrimaryButton';
import StatusBadge, { type StatusKind } from '../../components/StatusBadge';
import { useStopArrivals, useVehicleUpcoming } from '../../hooks/queries';
import { toArrivalRow } from '../../lib/arrivals';
import { describeDelay, formatClock, formatEtaText } from '../../lib/format';
import { colors, radius, space } from '../../theme/tokens';
import type { Stop, Vehicle } from '../../types/bus';

const DELAY_KIND: Record<string, StatusKind> = {
  ontime: 'success',
  late: 'warning',
  verylate: 'danger',
  early: 'info'
};

interface StopDetailProps {
  stop: Stop;
  now: number;
  active: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onOpenRoute: (routeId: string) => void;
}

/** גיליון תחנה נבחרת: שם, מספר, מועדף והגעות חיות. */
export function StopDetail({ stop, now, active, favorite, onToggleFavorite, onClose, onOpenRoute }: StopDetailProps) {
  const arrivals = useStopArrivals(stop.id, active);

  return (
    <BottomSheetScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title" numberOfLines={2}>
            {stop.name}
          </AppText>
          <AppText variant="caption">{`תחנה ${stop.code}`}</AppText>
        </View>
        <FavoriteButton active={favorite} onToggle={onToggleFavorite} name={stop.name} />
        <IconButton icon="close" accessibilityLabel="סגור" onPress={onClose} />
      </View>

      {arrivals.loading && !arrivals.data ? <StationCardSkeleton /> : null}
      {arrivals.error && !arrivals.data ? <ErrorState title="לא הצלחנו לטעון הגעות" onRetry={arrivals.refresh} /> : null}
      {arrivals.data && arrivals.data.arrivals.length === 0 ? (
        <AppText variant="caption">אין הגעות צפויות כרגע.</AppText>
      ) : null}
      {arrivals.data?.arrivals.slice(0, 8).map((arrival, i) => (
        <ArrivalRow
          key={`${arrival.tripId}-${i}`}
          {...toArrivalRow(arrival, now, () => onOpenRoute(arrival.routeId))}
        />
      ))}
    </BottomSheetScrollView>
  );
}

interface BusDetailProps {
  vehicle: Vehicle;
  now: number;
  active: boolean;
  onClose: () => void;
  onShowRoute: () => void;
}

/** גיליון אוטובוס נבחר: קו, יעד, סטטוס עיכוב, מהירות ותחנות הבאות. */
export function BusDetail({ vehicle, now, active, onClose, onShowRoute }: BusDetailProps) {
  const upcoming = useVehicleUpcoming(vehicle.id, active);
  const delay = describeDelay(vehicle.delaySeconds);

  return (
    <BottomSheetScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.bigBadge, { backgroundColor: vehicle.routeColor || colors.routeFallback }]}>
          <AppText variant="routeNumber" style={{ color: vehicle.routeTextColor || colors.onPrimary }} numberOfLines={1}>
            {vehicle.routeShortName}
          </AppText>
        </View>
        <View style={styles.headerText}>
          <AppText variant="title" numberOfLines={2}>
            {vehicle.headsign || `קו ${vehicle.routeShortName}`}
          </AppText>
          <View style={styles.badges}>
            <StatusBadge label={delay.label} kind={DELAY_KIND[delay.tone] ?? 'neutral'} />
            <StatusBadge label={`${Math.round(vehicle.speedKmh)} קמ״ש`} kind="neutral" />
          </View>
        </View>
        <IconButton icon="close" accessibilityLabel="סגור" onPress={onClose} />
      </View>

      <PrimaryButton title="הצג את מסלול הקו" icon="git-branch-outline" onPress={onShowRoute} />

      <AppText variant="heading" style={styles.sectionTitle}>
        התחנות הבאות
      </AppText>
      {upcoming.loading && !upcoming.data ? <StationCardSkeleton /> : null}
      {upcoming.error && !upcoming.data ? <ErrorState title="לא הצלחנו לטעון תחנות" onRetry={upcoming.refresh} /> : null}
      {upcoming.data && upcoming.data.upcoming.length === 0 ? (
        <AppText variant="caption">אין מידע על התחנות הבאות.</AppText>
      ) : null}
      {upcoming.data?.upcoming.slice(0, 6).map((item) => (
        <View key={`${item.stop.id}-${item.stopSequence}`} style={styles.upcomingRow}>
          <View style={styles.dot} />
          <View style={styles.headerText}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {item.stop.name}
            </AppText>
            <AppText variant="caption">{formatClock(item.arrivalTime)}</AppText>
          </View>
          <AppText variant="eta" tone="success">
            {formatEtaText(item.arrivalTime, now)}
          </AppText>
        </View>
      ))}
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space(3), paddingHorizontal: space(4), paddingBottom: space(10) },
  header: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  headerText: { flex: 1, gap: space(1) },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  bigBadge: {
    minWidth: space(16),
    height: space(14),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionTitle: { marginTop: space(2) },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: space(12) },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background
  }
});
