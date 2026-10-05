import { motion } from 'framer-motion';
import { Bus, Moon, Sun } from 'lucide-react';

import type { ConnectionStatus, Theme } from '../types/bus';

interface HeaderProps {
  status: ConnectionStatus;
  vehicleCount: number;
  demoMode: boolean;
  theme: Theme;
  onToggleTheme: () => void;
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const connected = status === 'connected';
  const label = connected
    ? 'מחובר בזמן אמת'
    : status === 'connecting'
      ? 'מתחבר...'
      : 'מנסה להתחבר מחדש...';

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1.5 dark:bg-white/10"
    >
      <span className="relative flex h-2.5 w-2.5">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-500" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            connected ? 'bg-emerald-500' : 'animate-pulse bg-rose-500'
          }`}
        />
      </span>
      <span
        className={`text-xs font-semibold ${
          connected ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function Header({
  status,
  vehicleCount,
  demoMode,
  theme,
  onToggleTheme
}: HeaderProps) {
  const isDark = theme === 'dark';

  return (
    <header className="glass flex items-center justify-between gap-3 rounded-3xl px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md">
          <Bus className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-bold leading-tight sm:text-lg">
            אוטובוסים בזמן אמת
          </h1>
          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {vehicleCount > 0 ? `${vehicleCount} אוטובוסים פעילים על המפה` : 'ממתין לנתונים...'}
            {demoMode ? ' · מצב הדגמה' : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <StatusIndicator status={status} />
        <motion.button
          type="button"
          whileTap={{ scale: 0.88, rotate: 20 }}
          onClick={onToggleTheme}
          className="icon-btn"
          aria-label={isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          title={isDark ? 'מצב בהיר' : 'מצב כהה'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.button>
      </div>
    </header>
  );
}
