import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MemoryKeyValueStore } from '../src/core/store';
import { createServices } from '../src/providers/factory';
import { FAVORITES_KEY, toggleFavoriteRoute, toggleFavoriteStop } from '../src/favorites/places';
import { clearAllLocalData } from '../src/providers/clearData';

describe('Providers: factory', () => {
  const base = { kv: new MemoryKeyValueStore(), isOnline: () => true };

  it('ללא הפעלה מפורשת של mocks - אף provider אינו mock (release-safe)', () => {
    const s = createServices({ ...base, useMocks: false });
    assert.equal(s.usingMocks, false);
    for (const p of [s.payment, s.auth, s.profile, s.routePlanner]) assert.equal(p.isMock, false, p.id);
  });

  it('ברירות המחדל: סליקה ומתכנן = NOT_IMPLEMENTED, אורח = ok(null)', async () => {
    const s = createServices({ ...base, useMocks: false });
    assert.equal((await s.payment.beginAddMethod()).kind, 'not_implemented');
    assert.equal((await s.auth.signIn({ method: 'email', identifier: 'a@b.co' })).kind, 'not_implemented');
    assert.equal((await s.profile.syncWithAccount()).kind, 'not_implemented');
    const plan = await s.routePlanner.plan({ origin: { lat: 1, lon: 1 }, destination: { lat: 2, lon: 2 }, time: { mode: 'depart_now' } });
    assert.equal(plan.kind, 'not_implemented');
  });

  it('עם mocks: כולם isMock', () => {
    const s = createServices({ ...base, useMocks: true });
    for (const p of [s.payment, s.auth, s.profile, s.routePlanner]) assert.equal(p.isMock, true, p.id);
  });

  it('האחסון עטוף במסנן נתונים רגישים: מועדף עם מספר כרטיס לא נכתב', async () => {
    const kv = new MemoryKeyValueStore();
    const s = createServices({ kv, isOnline: () => true, useMocks: false });
    await s.favorites.places.update((l) => [...l, { id: 'x', title: '4111 1111 1111 1111', icon: 'star' }]);
    assert.equal(await kv.getItem(FAVORITES_KEY), null, 'sensitive write must be refused');
    assert.ok(s.favorites.places.lastError()?.includes('sensitive'));
  });

  it('"מחק את כל הנתונים": הכול מתרוקן, גם אחרי הפעלה מחדש, ומועדפי העיצוב לא חוזרים', async () => {
    const kv = new MemoryKeyValueStore();
    const a = createServices({ kv, isOnline: () => true, useMocks: false });
    await a.recents.record({ title: 'חיפה' });
    await a.favorites.routes.update((l) => toggleFavoriteRoute(l, '480'));
    await a.favorites.stops.update((l) => toggleFavoriteStop(l, { id: '1', code: '1', name: 'ת', lat: 32.1, lon: 34.8 }));
    await a.profile.updateProfile({ displayName: 'דנה' });
    assert.equal((await clearAllLocalData(a)).kind, 'ok');

    const b = createServices({ kv, isOnline: () => true, useMocks: false });
    await Promise.all([b.favorites.places.hydrate(), b.favorites.stops.hydrate(), b.favorites.routes.hydrate(), b.recents.store.hydrate(), b.profile.load()]);
    assert.deepEqual(b.favorites.places.get(), []);
    assert.deepEqual(b.favorites.stops.get(), []);
    assert.deepEqual(b.favorites.routes.get(), []);
    assert.deepEqual(b.recents.store.get(), []);
    assert.equal(b.profile.peek().profile.displayName, null);
  });
});
