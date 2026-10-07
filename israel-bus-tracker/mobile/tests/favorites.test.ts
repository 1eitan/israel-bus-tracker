import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MemoryKeyValueStore, createPersistedStore } from '../src/core/store';
import {
  DEFAULT_FAVORITES,
  FAVORITES_KEY,
  FAVORITE_ROUTES_KEY,
  FAVORITE_STOPS_KEY,
  MAX_FAVORITE_PLACES,
  addFavoritePlace,
  createFavoriteStores,
  isFavoritePlace,
  removeFavoritePlace,
  sanitizeFavoritePlaces,
  sanitizeFavoriteStops,
  toggleFavoritePlace,
  toggleFavoriteRoute,
  toggleFavoriteStop,
  type FavoritePlace
} from '../src/favorites/places';
import type { Stop } from '../src/types/bus';
import { FlakyKeyValueStore } from './helpers';

const stop = (id: string, over: Partial<Stop> = {}): Stop => ({ id, code: id, name: `תחנה ${id}`, lat: 32.08, lon: 34.78, ...over });

describe('Favorites: מקומות', () => {
  it('הוספה, אי-כפילות (גם עם רווחים/אותיות), הסרה', () => {
    let list: FavoritePlace[] = [];
    list = addFavoritePlace(list, { title: 'עבודה', icon: 'briefcase' });
    list = addFavoritePlace(list, { title: '  עבודה  ' });
    list = addFavoritePlace(list, { title: 'Work' });
    list = addFavoritePlace(list, { title: 'WORK' });
    assert.equal(list.length, 2);
    assert.equal(isFavoritePlace(list, ' work '), true);
    list = removeFavoritePlace(list, list[0].id);
    assert.equal(list.length, 1);
    assert.equal(removeFavoritePlace(list, 'nope'), list, 'no-op keeps the same reference');
  });

  it('toggle מקום: מוסיף ואז מסיר (גם אם האותיות/רווחים שונים)', () => {
    let list = toggleFavoritePlace([], { title: 'Home Sweet' });
    assert.equal(list.length, 1);
    list = toggleFavoritePlace(list, { title: '  home   sweet ' });
    assert.equal(list.length, 0);
    assert.deepEqual(toggleFavoritePlace([], { title: '  ' }), []);
  });

  it('כותרת ריקה נדחית; מגבלת מספר מועדפים', () => {
    assert.deepEqual(addFavoritePlace([], { title: '   ' }), []);
    let list: FavoritePlace[] = [];
    for (let i = 0; i < MAX_FAVORITE_PLACES + 10; i += 1) list = addFavoritePlace(list, { title: `מקום ${i}` });
    assert.equal(list.length, MAX_FAVORITE_PLACES);
  });

  it('קואורדינטות לא תקינות (0,0 / NaN) נזרקות; תקינות מושלמות לפריט קיים', () => {
    let list = addFavoritePlace([], { title: 'א', lat: 0, lon: 0 });
    assert.equal(list[0].lat, undefined);
    list = addFavoritePlace(list, { title: 'א', lat: Number.NaN, lon: 3 });
    assert.equal(list[0].lat, undefined);
    list = addFavoritePlace(list, { title: 'א', lat: 32.1, lon: 34.8 });
    assert.equal(list.length, 1);
    assert.equal(list[0].lat, 32.1);
  });

  it('sanitize: פורמט שלב 1, פגום, כפילויות, ריק תקין', () => {
    const legacy = sanitizeFavoritePlaces([...DEFAULT_FAVORITES]);
    assert.equal(legacy?.length, 3);
    const dirty = sanitizeFavoritePlaces([
      { id: 'a', title: 'טוב', icon: 'weird' },
      { id: 'a', title: 'כפול' },
      { id: 5, title: 'x' },
      { id: 'b' },
      null,
      { id: 'c', title: 'c', lat: 0, lon: 0 }
    ]);
    assert.deepEqual(dirty?.map((p) => p.id), ['a', 'c']);
    assert.equal(dirty?.[0].icon, 'star');
    assert.equal(dirty?.[1].lat, undefined);
    assert.deepEqual(sanitizeFavoritePlaces([]), []);
    assert.equal(sanitizeFavoritePlaces({}), undefined);
  });
});

describe('Favorites: תחנות וקווים', () => {
  it('toggle תחנה', () => {
    let list: Stop[] = [];
    list = toggleFavoriteStop(list, stop('1'));
    list = toggleFavoriteStop(list, stop('2'));
    assert.deepEqual(list.map((s) => s.id), ['1', '2']);
    list = toggleFavoriteStop(list, stop('1'));
    assert.deepEqual(list.map((s) => s.id), ['2']);
  });

  it('תחנה עם קואורדינטות לא תקינות לא נוספת', () => {
    assert.deepEqual(toggleFavoriteStop([], stop('1', { lat: 0, lon: 0 })), []);
    assert.deepEqual(toggleFavoriteStop([], stop('1', { lat: Number.NaN })), []);
  });

  it('sanitize תחנות', () => {
    const out = sanitizeFavoriteStops([stop('1'), stop('1'), { id: 'x' }, stop('2', { lat: 999 }), stop('3')]);
    assert.deepEqual(out?.map((s) => s.id), ['1', '3']);
    assert.equal(sanitizeFavoriteStops('x'), undefined);
  });

  it('toggle קו + sanitize', () => {
    let ids: string[] = [];
    ids = toggleFavoriteRoute(ids, '480');
    ids = toggleFavoriteRoute(ids, '5');
    ids = toggleFavoriteRoute(ids, '480');
    assert.deepEqual(ids, ['5']);
    assert.deepEqual(toggleFavoriteRoute([], ''), []);
  });
});

describe('Favorites: התמדה (store)', () => {
  it('מצב ראשוני = ברירות המחדל של שלב 1, ולא נכתב לאחסון עד שהמשתמש עורך', async () => {
    const kv = new MemoryKeyValueStore();
    const { places } = createFavoriteStores(kv);
    await places.hydrate();
    assert.equal(places.get().length, 3);
    assert.deepEqual(kv.dump(), {});
  });

  it('עריכה נשמרת וחוזרת אחרי "הפעלה מחדש"', async () => {
    const kv = new MemoryKeyValueStore();
    const first = createFavoriteStores(kv);
    await first.places.update((l) => removeFavoritePlace(l, 'fav-oren'));
    await first.stops.update((l) => toggleFavoriteStop(l, stop('9')));
    await first.routes.update((l) => toggleFavoriteRoute(l, '480'));
    const second = createFavoriteStores(kv);
    await Promise.all([second.places.hydrate(), second.stops.hydrate(), second.routes.hydrate()]);
    assert.deepEqual(second.places.get().map((p) => p.id), ['fav-home', 'fav-ikea']);
    assert.deepEqual(second.stops.get().map((s) => s.id), ['9']);
    assert.deepEqual(second.routes.get(), ['480']);
  });

  it('המשתמש מחק הכול => נשאר ריק (לא חוזרים לברירת מחדל)', async () => {
    const kv = new MemoryKeyValueStore();
    const a = createFavoriteStores(kv);
    await a.places.update(() => []);
    const b = createFavoriteStores(kv);
    await b.places.hydrate();
    assert.deepEqual(b.places.get(), []);
  });

  it('קריאה מפורמט ישן ופגום לא קורסת', async () => {
    const kv = new MemoryKeyValueStore();
    await kv.setItem(FAVORITES_KEY, 'not json');
    await kv.setItem(FAVORITE_STOPS_KEY, '{"a":1}');
    await kv.setItem(FAVORITE_ROUTES_KEY, '["1",2,"1","3"]');
    const s = createFavoriteStores(kv);
    await Promise.all([s.places.hydrate(), s.stops.hydrate(), s.routes.hydrate()]);
    assert.equal(s.places.get().length, 3, 'falls back to defaults');
    assert.deepEqual(s.stops.get(), []);
    assert.deepEqual(s.routes.get(), ['1', '3']);
    assert.ok(s.places.lastError());
  });

  it('עדכונים מקבילים לא הולכים לאיבוד ובסדר הנכון', async () => {
    const kv = new MemoryKeyValueStore();
    const s = createFavoriteStores(kv);
    await Promise.all(Array.from({ length: 20 }, (_, i) => s.routes.update((l) => toggleFavoriteRoute(l, String(i)))));
    assert.deepEqual(s.routes.get(), Array.from({ length: 20 }, (_, i) => String(i)));
    const again = createFavoriteStores(kv);
    await again.routes.hydrate();
    assert.equal(again.routes.get().length, 20);
  });

  it('עדכון לפני סיום ה-hydrate לא דורס נתונים שמורים', async () => {
    const kv = new MemoryKeyValueStore();
    await kv.setItem(FAVORITE_ROUTES_KEY, JSON.stringify(['old']));
    const s = createFavoriteStores(kv);
    await s.routes.update((l) => toggleFavoriteRoute(l, 'new')); // בלי hydrate מפורש
    assert.deepEqual(s.routes.get(), ['old', 'new']);
  });

  it('כשל כתיבה: המצב נשאר בזיכרון ו-lastError מדווח; אחרי החלמה נשמר', async () => {
    const kv = new FlakyKeyValueStore();
    const s = createFavoriteStores(kv);
    await s.routes.hydrate();
    kv.failWrites = true;
    await s.routes.update((l) => toggleFavoriteRoute(l, 'a'));
    assert.deepEqual(s.routes.get(), ['a']);
    assert.equal(s.routes.lastError(), 'write failed');
    kv.failWrites = false;
    await s.routes.update((l) => toggleFavoriteRoute(l, 'b'));
    assert.equal(s.routes.lastError(), null);
    assert.deepEqual(JSON.parse((await kv.getItem(FAVORITE_ROUTES_KEY)) ?? '[]'), ['a', 'b']);
  });

  it('כשל קריאה: ממשיכים עם ברירת המחדל', async () => {
    const kv = new FlakyKeyValueStore();
    kv.failReads = true;
    const s = createFavoriteStores(kv);
    await s.places.hydrate();
    assert.equal(s.places.isHydrated(), true);
    assert.equal(s.places.get().length, 3);
  });

  it('update שלא משנה כלום לא כותב ולא מודיע', async () => {
    const kv = new MemoryKeyValueStore();
    const store = createPersistedStore<number[]>({ key: 'k', kv, initial: [], sanitize: (r) => (Array.isArray(r) ? (r as number[]) : undefined) });
    let n = 0;
    store.subscribe(() => (n += 1));
    await store.hydrate();
    const before = n;
    await store.update((x) => x);
    assert.equal(n, before);
    assert.deepEqual(kv.dump(), {});
  });

  it('reset מחזיר לברירת מחדל ומוחק מהאחסון', async () => {
    const kv = new MemoryKeyValueStore();
    const s = createFavoriteStores(kv);
    await s.routes.update((l) => toggleFavoriteRoute(l, 'a'));
    await s.routes.reset();
    assert.deepEqual(s.routes.get(), []);
    assert.equal(await kv.getItem(FAVORITE_ROUTES_KEY), null);
  });
});
