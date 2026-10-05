import { motion, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { ReactNode } from 'react';
import { AlertCircle, ChevronLeft, Clock, Gauge, Hash, Loader2, MapPin, Radio, X } from 'lucide-react';

import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNow } from '../hooks/useNow';
import { usePolling } from '../hooks/usePolling';
import { fetchStopArrivals, fetchVehicleUpcoming } from '../lib/api';
import {
  DELAY_TONE_CLASSES,
  describeDelay,
  formatClock,
  formatEta,
  formatSpeed,
  secondsAgo
} from '../lib/format';
import type { Stop, Vehicle } from '../types/bus';

interface BusInfoDrawerProps {
  mode: 'bus' | 'stop';
  vehicle: Vehicle | null;
  stop: Stop | null;
  onClose: () => void;
  onSelectVehicle: (vehicleId: string) => void;
  onSelectStop: (stopId: string) => void;
}

const POLL_INTERVAL_MS = 4000;

/* ------------------------------------------------------------------------- */
/*                               רכיבי עזר                                  */
/* ------------------------------------------------------------------------- */

function RouteBadge({
  label,
  color,
  textColor,
  size = 'md'
}: {
  label: string;
  color: string;
  textColor: string;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-display font-bold shadow-sm ${
        size === 'lg' ? 'h-14 min-w-[3.5rem] px-3 text-2xl' : 'h-10 min-w-[2.75rem] px-2 text-base'
      }`}
      style={{ backgroundColor: color, color: textColor }}
      dir="ltr"
    >
      {label}
    </span>
  );
}

function DelayPill({ delaySeconds }: { delaySeconds: number }) {
  const info = describeDelay(delaySeconds);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${DELAY_TONE_CLASSES[info.tone]}`}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {info.label}
    </span>
  );
}

function EtaBadge({ arrivalTime, now }: { arrivalTime: number; now: number }) {
  const eta = formatEta(arrivalTime, now);
  const imminent = eta.value === 'עכשיו' || Number(eta.value) <= 2;
  return (
    <div
      className={`flex min-w-[3.5rem] flex-col items-center justify-center rounded-2xl px-2 py-1.5 ${
        imminent
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-slate-900/5 text-slate-800 dark:bg-white/10 dark:text-slate-100'
      }`}
    >
      <span className="font-display text-lg font-bold leading-none">{eta.value}</span>
      {eta.unit && <span className="mt-0.5 text-[10px] font-semibold opacity-70">{eta.unit}</span>}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="font-display text-base font-bold" dir="ltr" style={{ textAlign: 'right' }}>
        {value}
      </div>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-10 text-center">
      <AlertCircle className="mb-1 h-6 w-6 text-slate-400" aria-hidden="true" />
      <div className="text-sm font-bold">{title}</div>
      <div className="max-w-[16rem] text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*                             תוכן: אוטובוס                                 */
/* ------------------------------------------------------------------------- */

function BusContent({
  vehicle,
  onSelectStop
}: {
  vehicle: Vehicle;
  onSelectStop: (stopId: string) => void;
}) {
  const now = useNow(1000);
  const { data, loading, error } = usePolling(
    (signal) => fetchVehicleUpcoming(vehicle.id, signal),
    true,
    POLL_INTERVAL_MS,
    `bus:${vehicle.id}`
  );
  const upcoming = data?.upcoming ?? [];
  const age = secondsAgo(vehicle.timestamp, now);

  return (
    <>
      <div className="flex items-center gap-3">
        <RouteBadge
          label={vehicle.routeShortName}
          color={vehicle.routeColor}
          textColor={vehicle.routeTextColor}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">בכיוון</div>
          <div className="truncate font-display text-lg font-bold leading-tight">
            {vehicle.headsign || `קו ${vehicle.routeShortName}`}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <DelayPill delaySeconds={vehicle.delaySeconds} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard icon={<Hash className="h-3.5 w-3.5" />} label="מספר רכב" value={vehicle.label} />
        <StatCard
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="מהירות"
          value={formatSpeed(vehicle.speedKmh)}
        />
        <StatCard
          icon={<Radio className="h-3.5 w-3.5" />}
          label="עדכון אחרון"
          value={age < 5 ? 'עכשיו' : `לפני ${age} שנ׳`}
        />
      </div>

      <h3 className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold">
        <MapPin className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
        התחנות הבאות
      </h3>

      {loading && <LoadingBlock label="טוען זמני הגעה..." />}
      {!loading && error && upcoming.length === 0 && (
        <EmptyBlock title="לא ניתן לטעון זמני הגעה" subtitle="נסה שוב בעוד רגע, העדכון יתבצע אוטומטית." />
      )}
      {!loading && !error && upcoming.length === 0 && (
        <EmptyBlock
          title="אין תחנות קרובות"
          subtitle="הרכב הגיע ליעד או שאין כרגע מידע על התחנות הבאות."
        />
      )}

      {upcoming.length > 0 && (
        <ol className="relative space-y-1">
          {upcoming.map((item, index) => (
            <li key={`${item.stop.id}-${item.stopSequence}`} className="animate-fade-in-up">
              <button
                type="button"
                onClick={() => onSelectStop(item.stop.id)}
                className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start transition hover:bg-slate-900/5 dark:hover:bg-white/5"
              >
                <span className="relative flex w-5 shrink-0 flex-col items-center self-stretch">
                  <span
                    className="absolute top-0 h-1/2 w-0.5"
                    style={{
                      backgroundColor: index === 0 ? 'transparent' : vehicle.routeColor,
                      opacity: 0.45
                    }}
                  />
                  <span
                    className="absolute bottom-0 h-1/2 w-0.5"
                    style={{
                      backgroundColor: index === upcoming.length - 1 ? 'transparent' : vehicle.routeColor,
                      opacity: 0.45
                    }}
                  />
                  <span
                    className="relative my-auto h-3.5 w-3.5 rounded-full border-[3px] bg-white dark:bg-slate-900"
                    style={{ borderColor: vehicle.routeColor }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.stop.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    מתוכנן {formatClock(item.arrivalTime - item.delaySeconds)} · צפוי{' '}
                    {formatClock(item.arrivalTime)}
                  </span>
                </span>
                <EtaBadge arrivalTime={item.arrivalTime} now={now} />
                <ChevronLeft
                  className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/*                              תוכן: תחנה                                   */
/* ------------------------------------------------------------------------- */

function StopContent({
  stop,
  onSelectVehicle
}: {
  stop: Stop;
  onSelectVehicle: (vehicleId: string) => void;
}) {
  const now = useNow(1000);
  const { data, loading, error } = usePolling(
    (signal) => fetchStopArrivals(stop.id, signal),
    true,
    POLL_INTERVAL_MS,
    `stop:${stop.id}`
  );
  const arrivals = data?.arrivals ?? [];

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <MapPin className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            תחנה {stop.code}
          </div>
          <div className="font-display text-lg font-bold leading-tight">{stop.name}</div>
        </div>
      </div>

      <h3 className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold">
        <Clock className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
        קווים שמגיעים לתחנה
      </h3>

      {loading && <LoadingBlock label="טוען זמני הגעה..." />}
      {!loading && error && arrivals.length === 0 && (
        <EmptyBlock title="לא ניתן לטעון זמני הגעה" subtitle="נסה שוב בעוד רגע, העדכון יתבצע אוטומטית." />
      )}
      {!loading && !error && arrivals.length === 0 && (
        <EmptyBlock
          title="אין הגעות צפויות"
          subtitle="כרגע אין אוטובוסים שצפויים להגיע לתחנה הזו."
        />
      )}

      {arrivals.length > 0 && (
        <ul className="space-y-1.5">
          {arrivals.map((arrival) => {
            const clickable = arrival.vehicleId !== null;
            return (
              <li key={`${arrival.tripId}-${arrival.routeId}`} className="animate-fade-in-up">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (arrival.vehicleId) onSelectVehicle(arrival.vehicleId);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-slate-900/[0.04] px-3 py-2.5 text-start transition enabled:hover:bg-slate-900/[0.08] dark:bg-white/5 dark:enabled:hover:bg-white/10"
                >
                  <RouteBadge
                    label={arrival.routeShortName}
                    color={arrival.routeColor}
                    textColor={arrival.routeTextColor}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {arrival.headsign || `קו ${arrival.routeShortName}`}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>צפוי ב-{formatClock(arrival.arrivalTime)}</span>
                      <span>·</span>
                      <span>{describeDelay(arrival.delaySeconds).label}</span>
                    </span>
                  </span>
                  <EtaBadge arrivalTime={arrival.arrivalTime} now={now} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/*                              הקומפוננטה הראשית                            */
/* ------------------------------------------------------------------------- */

export default function BusInfoDrawer({
  mode,
  vehicle,
  stop,
  onClose,
  onSelectVehicle,
  onSelectStop
}: BusInfoDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const dragControls = useDragControls();

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  const title = mode === 'bus' ? 'פרטי אוטובוס' : 'פרטי תחנה';

  return (
    <motion.aside
      role="dialog"
      aria-label={title}
      aria-modal="false"
      initial={isDesktop ? { x: '115%', opacity: 0 } : { y: '100%' }}
      animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0 }}
      exit={isDesktop ? { x: '115%', opacity: 0 } : { y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
      drag={isDesktop ? false : 'y'}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={handleDragEnd}
      className="glass fixed inset-x-0 bottom-0 z-[1200] flex max-h-[72vh] flex-col rounded-t-[28px] md:inset-x-auto md:bottom-4 md:right-4 md:top-[11rem] md:max-h-none md:w-[400px] md:rounded-[28px]"
    >
      <div
        className="flex shrink-0 touch-none cursor-grab justify-center pb-1 pt-3 active:cursor-grabbing md:hidden"
        onPointerDown={(event) => dragControls.start(event)}
        aria-hidden="true"
      >
        <span className="h-1.5 w-12 rounded-full bg-slate-400/60 dark:bg-slate-500/70" />
      </div>

      <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-1 md:pt-4">
        <span className="rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200">
          {title}
        </span>
        <button type="button" onClick={onClose} className="icon-btn !h-9 !w-9" aria-label="סגור פאנל">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        {mode === 'bus' && vehicle && (
          <BusContent key={vehicle.id} vehicle={vehicle} onSelectStop={onSelectStop} />
        )}
        {mode === 'stop' && stop && (
          <StopContent key={stop.id} stop={stop} onSelectVehicle={onSelectVehicle} />
        )}
      </div>
    </motion.aside>
  );
}
