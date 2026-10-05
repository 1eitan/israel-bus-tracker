import { AnimatePresence, motion } from 'framer-motion';
import { Bus, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { searchAll } from '../lib/api';
import type { RouteSummary, SearchResults, Stop } from '../types/bus';

interface SearchBarProps {
  selectedRoutes: RouteSummary[];
  locating: boolean;
  onSelectRoute: (route: RouteSummary) => void;
  onSelectStop: (stop: Stop) => void;
  onRemoveRoute: (routeId: string) => void;
  onClearRoutes: () => void;
  onLocate: () => void;
}

type ResultItem =
  | { type: 'route'; route: RouteSummary }
  | { type: 'stop'; stop: Stop };

const EMPTY_RESULTS: SearchResults = { routes: [], stops: [] };

export default function SearchBar({
  selectedRoutes,
  locating,
  onSelectRoute,
  onSelectStop,
  onRemoveRoute,
  onClearRoutes,
  onLocate
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const items = useMemo<ResultItem[]>(
    () => [
      ...results.routes.map((route): ResultItem => ({ type: 'route', route })),
      ...results.stops.map((stop): ResultItem => ({ type: 'stop', stop }))
    ],
    [results]
  );

  /* חיפוש עם debounce וביטול בקשות ישנות */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchAll(trimmed, controller.signal);
        setResults(data);
        setActiveIndex(0);
      } catch {
        if (!controller.signal.aborted) setResults(EMPTY_RESULTS);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /* סגירה בלחיצה מחוץ לרכיב */
  useEffect(() => {
    const handler = (event: PointerEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const choose = (item: ResultItem): void => {
    if (item.type === 'route') onSelectRoute(item.route);
    else onSelectStop(item.stop);
    setQuery('');
    setResults(EMPTY_RESULTS);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (items.length === 0 ? 0 : (index - 1 + items.length) % items.length));
    } else if (event.key === 'Enter') {
      const item = items[activeIndex];
      if (item) {
        event.preventDefault();
        choose(item);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim() !== '';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="glass flex items-center gap-1 rounded-3xl px-2 py-1.5">
        <div className="flex h-11 w-9 shrink-0 items-center justify-center text-slate-500 dark:text-slate-400">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="חפש קו או תחנה..."
          aria-label="חיפוש קו או תחנה"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listId}
          role="combobox"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
        />

        {query !== '' && (
          <button
            type="button"
            className="icon-btn !h-9 !w-9"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="נקה חיפוש"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mx-1 h-6 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onLocate}
          disabled={locating}
          className="icon-btn text-brand-600 dark:text-brand-300"
          aria-label="המיקום שלי"
          title="המיקום שלי"
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {selectedRoutes.length > 0 && !showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 flex flex-wrap items-center gap-1.5"
          >
            {selectedRoutes.map((route) => (
              <span
                key={route.id}
                className="glass inline-flex items-center gap-1.5 rounded-full py-1 pe-1 ps-1 text-xs font-semibold"
              >
                <span
                  className="inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 font-display text-xs font-bold"
                  style={{ backgroundColor: route.color, color: route.textColor }}
                >
                  {route.shortName}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRoute(route.id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/10 dark:text-slate-300 dark:hover:bg-white/15"
                  aria-label={`הסר את קו ${route.shortName} מהסינון`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {selectedRoutes.length > 1 && (
              <button
                type="button"
                onClick={onClearRoutes}
                className="glass rounded-full px-3 py-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                הצג את כל הקווים
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPanel && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="glass scroll-thin absolute inset-x-0 top-full mt-2 max-h-[55vh] overflow-y-auto rounded-3xl p-2"
          >
            {items.length === 0 && !loading && (
              <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                לא נמצאו קווים או תחנות עבור ״{query.trim()}״
              </li>
            )}

            {results.routes.length > 0 && (
              <li
                role="presentation"
                className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                קווים
              </li>
            )}
            {items.map((item, index) => {
              const active = index === activeIndex;
              const showStopsHeader =
                item.type === 'stop' && index === results.routes.length && results.stops.length > 0;
              return (
                <li key={item.type === 'route' ? `r-${item.route.id}` : `s-${item.stop.id}`} role="presentation">
                  {showStopsHeader && (
                    <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      תחנות
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition ${
                      active ? 'bg-brand-500/10 dark:bg-brand-400/15' : 'hover:bg-slate-900/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {item.type === 'route' ? (
                      <>
                        <span
                          className="flex h-10 min-w-[2.75rem] items-center justify-center rounded-xl px-2 font-display text-base font-bold shadow-sm"
                          style={{ backgroundColor: item.route.color, color: item.route.textColor }}
                        >
                          {item.route.shortName}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {item.route.longName || `קו ${item.route.shortName}`}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Bus className="h-3 w-3" aria-hidden="true" />
                            {item.route.agency || 'קו אוטובוס'}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex h-10 w-11 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          <MapPin className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.stop.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            תחנה {item.stop.code}
                          </span>
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
