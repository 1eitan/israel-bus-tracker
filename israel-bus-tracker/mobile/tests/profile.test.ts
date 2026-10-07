import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MemoryKeyValueStore } from '../src/core/store';
import { MockAuthProvider, RealAuthProvider } from '../src/profile/auth';
import {
  MAX_NAME_LENGTH,
  MockProfileProvider,
  PROFILE_KEY,
  RealProfileProvider,
  normalizeDisplayName,
  sanitizeProfileSnapshot
} from '../src/profile/provider';
import { DEFAULT_PROFILE_SNAPSHOT } from '../src/profile/types';
import { createServices } from '../src/providers/factory';
import { FlakyKeyValueStore } from './helpers';

describe('Auth', () => {
  it('Real: אורח (null) הוא מצב תקין, התחברות = NOT_IMPLEMENTED', async () => {
    const auth = new RealAuthProvider();
    assert.deepEqual(await auth.getSession(), { kind: 'ok', data: null });
    assert.equal((await auth.signIn({ method: 'email', identifier: 'a@b.co' })).kind, 'not_implemented');
    assert.equal((await auth.signOut()).kind, 'ok');
    assert.equal(auth.isMock, false);
  });

  it('Mock: isMock, התחברות והתנתקות, והודעות למאזינים', async () => {
    const auth = new MockAuthProvider();
    let notified = 0;
    const off = auth.subscribe(() => (notified += 1));
    assert.equal(auth.isMock, true);
    assert.equal((await auth.signIn({ method: 'email', identifier: 'x' })).kind, 'error');
    const s = await auth.signIn({ method: 'email', identifier: 'user@example.com' });
    assert.equal(s.kind, 'ok');
    assert.ok((await auth.getSession()).kind === 'ok');
    await auth.signOut();
    assert.deepEqual(await auth.getSession(), { kind: 'ok', data: null });
    assert.equal(notified, 2);
    off();
    await auth.signIn({ method: 'phone', identifier: '0501234567' });
    assert.equal(notified, 2);
  });
});

describe('Profile state', () => {
  it('ברירות מחדל: התראות כבויות (opt-in), שמירת היסטוריה פעילה', async () => {
    const p = new RealProfileProvider(new MemoryKeyValueStore());
    const r = await p.load();
    assert.deepEqual(r, { kind: 'ok', data: DEFAULT_PROFILE_SNAPSHOT });
    assert.deepEqual(p.peek().notifications, { arrivals: false, disruptions: false, serviceUpdates: false });
    assert.equal(p.peek().privacy.saveSearchHistory, true);
  });

  it('Real: נשמר ונטען מחדש בין הפעלות', async () => {
    const kv = new MemoryKeyValueStore();
    const a = new RealProfileProvider(kv);
    await a.updateProfile({ displayName: '  דנה   כהן ' });
    await a.updateNotifications({ arrivals: true });
    await a.updatePrivacy({ saveSearchHistory: false });
    await a.updateSettings({ haptics: false });
    const b = new RealProfileProvider(kv);
    await b.load();
    assert.equal(b.peek().profile.displayName, 'דנה כהן');
    assert.equal(b.peek().notifications.arrivals, true);
    assert.equal(b.peek().privacy.saveSearchHistory, false);
    assert.equal(b.peek().settings.haptics, false);
  });

  it('עדכון חלקי לא דורס שדות אחרים; ערכים שאינם boolean מתעלמים', async () => {
    const p = new RealProfileProvider(new MemoryKeyValueStore());
    await p.updateNotifications({ arrivals: true });
    await p.updateNotifications({ disruptions: true, serviceUpdates: 'yes' as never });
    assert.deepEqual(p.peek().notifications, { arrivals: true, disruptions: true, serviceUpdates: false });
  });

  it('שם: ניקוי, מגבלת אורך, תווי בקרה, ריק => null', async () => {
    assert.equal(normalizeDisplayName('  '), null);
    assert.equal(normalizeDisplayName(null), null);
    assert.equal(normalizeDisplayName('א\u0000ב\n'), 'א ב');
    assert.equal(normalizeDisplayName('x'.repeat(100))?.length, MAX_NAME_LENGTH);
    const p = new RealProfileProvider(new MemoryKeyValueStore());
    await p.updateProfile({ displayName: 'x' });
    await p.updateProfile({ displayName: '   ' });
    assert.equal(p.peek().profile.displayName, null);
    assert.equal((await p.updateProfile({ displayName: 'x'.repeat(500) })).kind, 'error');
  });

  it('אחסון פגום: חוזרים לברירת מחדל ולא קורסים', async () => {
    const kv = new MemoryKeyValueStore();
    await kv.setItem(PROFILE_KEY, '{not json');
    const p = new RealProfileProvider(kv);
    assert.equal((await p.load()).kind, 'ok');
    assert.deepEqual(p.peek(), DEFAULT_PROFILE_SNAPSHOT);
    await kv.setItem(PROFILE_KEY, '[1,2]');
    const q = new RealProfileProvider(kv);
    await q.load();
    assert.deepEqual(q.peek(), DEFAULT_PROFILE_SNAPSHOT);
  });

  it('sanitize: שדות חסרים/שגויי טיפוס חוזרים לברירת מחדל', () => {
    const s = sanitizeProfileSnapshot({ profile: { displayName: 5 }, settings: { haptics: 'x' }, privacy: null });
    assert.deepEqual(s, DEFAULT_PROFILE_SNAPSHOT);
    assert.equal(sanitizeProfileSnapshot('str'), undefined);
    assert.equal(sanitizeProfileSnapshot(null), undefined);
  });

  it('כשל כתיבה לאחסון: המצב נשאר בזיכרון (offline-first)', async () => {
    const kv = new FlakyKeyValueStore();
    const p = new RealProfileProvider(kv);
    await p.load();
    kv.failWrites = true;
    const r = await p.updateSettings({ haptics: false });
    assert.ok(r.kind === 'ok' && r.data.settings.haptics === false);
    assert.equal(p.peek().settings.haptics, false);
  });

  it('subscribe מקבל עדכונים', async () => {
    const p = new RealProfileProvider(new MemoryKeyValueStore());
    let n = 0;
    const off = p.subscribe(() => (n += 1));
    await p.updateSettings({ haptics: false });
    assert.ok(n >= 1);
    off();
    const before = n;
    await p.updateSettings({ haptics: true });
    assert.equal(n, before);
  });

  it('סנכרון חשבון: Real = NOT_IMPLEMENTED (אין backend), Mock = הדגמה', async () => {
    assert.equal((await new RealProfileProvider(new MemoryKeyValueStore()).syncWithAccount()).kind, 'not_implemented');
    const mock = new MockProfileProvider();
    assert.equal(mock.isMock, true);
    assert.equal((await mock.syncWithAccount()).kind, 'ok');
  });

  it('Mock מבודד: לא כותב לאחסון אמיתי', async () => {
    const mock = new MockProfileProvider();
    await mock.updateProfile({ displayName: 'x' });
    assert.equal(mock.peek().profile.displayName, 'x');
  });

  it('פרטיות: כיבוי שמירת היסטוריה עוצר שמירה מיידית', async () => {
    const services = createServices({ useMocks: false, kv: new MemoryKeyValueStore(), isOnline: () => true });
    assert.equal(await services.recents.record({ title: 'תל אביב' }), true);
    await services.profile.updatePrivacy({ saveSearchHistory: false });
    assert.equal(await services.recents.record({ title: 'חיפה' }), false);
    assert.deepEqual(services.recents.store.get().map((r) => r.title), ['תל אביב']);
    await services.profile.updatePrivacy({ saveSearchHistory: true });
    assert.equal(await services.recents.record({ title: 'חיפה' }), true);
  });
});
