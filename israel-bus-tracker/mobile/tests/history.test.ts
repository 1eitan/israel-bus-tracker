import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MemoryKeyValueStore } from '../src/core/store';
import {
  MAX_RECENTS,
  MAX_TITLE_LENGTH,
  RECENTS_KEY,
  addRecent,
  clearRecents,
  createRecentSearches,
  normalizeKey,
  removeRecent,
  sanitizeRecents,
  type RecentSearch
} from '../src/history/recents';
import { FlakyKeyValueStore } from './helpers';

const NOW = 1_700_000_000_000;

describe('History: פעולות טהורות', () => {
  it('שמירה: חדש בראש הרשימה עם זמן', () => {
    const list = addRecent(addRecent([], { title: 'א' }, NOW), { title: 'ב' }, NOW + 1);
    assert.deepEqual(list.map((r) => r.title), ['ב', 'א']);
    assert.equal(list[0].searchedAt, NOW + 1);
  });

  it('אי-כפילות: אותו חיפוש עובר לראש ולא מוכפל (רווחים/אותיות/ניקוד)', () => {
    let list: RecentSearch[] = [];
    list = addRecent(list, { title: 'תל אביב' }, NOW);
    list = addRecent(list, { title: 'חיפה' }, NOW + 1);
    list = addRecent(list, { title: '  תל   אביב ' }, NOW + 2);
    assert.deepEqual(list.map((r) => r.title), ['תל אביב', 'חיפה']);
    assert.equal(list[0].searchedAt, NOW + 2);
    list = addRecent(list, { title: 'Haifa' }, NOW + 3);
    list = addRecent(list, { title: 'HAIFA' }, NOW + 4);
    assert.equal(list.filter((r) => normalizeKey(r.title) === 'haifa').length, 1);
    // ניקוד עברי לא יוצר כפילות
    assert.equal(normalizeKey('שָׁלוֹם'), normalizeKey('שלום'));
  });

  it('כפילות משמרת קואורדינטות ותת-כותרת קיימות אם החדשות חסרות', () => {
    let list = addRecent([], { title: 'א', subtitle: 'ס', lat: 32.1, lon: 34.8 }, NOW);
    list = addRecent(list, { title: 'א' }, NOW + 1);
    assert.equal(list[0].lat, 32.1);
    assert.equal(list[0].subtitle, 'ס');
  });

  it('מגבלה: לא יותר מ-MAX_RECENTS, הישן נופל', () => {
    let list: RecentSearch[] = [];
    for (let i = 0; i < MAX_RECENTS + 5; i += 1) list = addRecent(list, { title: `מקום ${i}` }, NOW + i);
    assert.equal(list.length, MAX_RECENTS);
    assert.equal(list[0].title, `מקום ${MAX_RECENTS + 4}`);
    assert.ok(!list.some((r) => r.title === 'מקום 0'));
    assert.equal(addRecent([], { title: 'x' }, NOW, 0).length, 0);
  });

  it('קלט ריק/רווחים נדחה (אותו reference); כותרת ארוכה נחתכת', () => {
    const list = addRecent([], { title: 'x' }, NOW);
    assert.equal(addRecent(list, { title: '   ' }, NOW), list);
    assert.equal(addRecent([], { title: 'ש'.repeat(500) }, NOW)[0].title.length, MAX_TITLE_LENGTH);
  });

  it('קואורדינטות לא תקינות לא נשמרות', () => {
    const r = addRecent([], { title: 'x', lat: 0, lon: 0 }, NOW)[0];
    assert.equal(r.lat, undefined);
    assert.equal(r.lon, undefined);
  });

  it('מחיקה בודדת ו"נקה הכול"', () => {
    const list = addRecent(addRecent([], { title: 'א' }, NOW), { title: 'ב' }, NOW + 1);
    assert.deepEqual(removeRecent(list, list[0].id).map((r) => r.title), ['א']);
    assert.equal(removeRecent(list, 'nope'), list);
    assert.deepEqual(clearRecents(), []);
  });
});

describe('History: שחזור מאחסון', () => {
  it('מסיר את שני ה"חיפושים" המזויפים משלב 1', () => {
    const out = sanitizeRecents([
      { id: 'rec-1', title: 'מסעד סגאב שלום / כביש 25' },
      { id: 'rec-2', title: 'תחנה מרכזית באר שבע / רציפים' },
      { id: 'rec-אמיתי', title: 'חיפוש אמיתי' }
    ]);
    assert.deepEqual(out?.map((r) => r.title), ['חיפוש אמיתי']);
  });

  it('פורמט ישן בלי searchedAt נשמר עם 0; פגום נזרק; כפילויות מתאחדות', () => {
    const out = sanitizeRecents([{ id: 'x', title: 'א' }, { id: 'y', title: ' א ' }, { title: 5 }, null, { id: 'z', title: 'ב', searchedAt: NOW }]);
    assert.deepEqual(out?.map((r) => r.title), ['א', 'ב']);
    assert.equal(out?.[0].searchedAt, 0);
  });

  it('לא-מערך נדחה; מערך ריק תקין; חותך למגבלה', () => {
    assert.equal(sanitizeRecents({}), undefined);
    assert.deepEqual(sanitizeRecents([]), []);
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `${i}`, title: `מקום ${i}`, searchedAt: i }));
    assert.equal(sanitizeRecents(many)?.length, MAX_RECENTS);
  });
});

describe('History: שירות (התמדה + פרטיות)', () => {
  const make = (kv = new MemoryKeyValueStore(), enabled = { value: true }) => ({
    kv,
    enabled,
    service: createRecentSearches({ kv, isEnabled: () => enabled.value, now: () => NOW })
  });

  it('מתחיל ריק - בלי היסטוריה מזויפת', async () => {
    const { service } = make();
    await service.store.hydrate();
    assert.deepEqual(service.store.get(), []);
  });

  it('שמירה, מחיקה, ניקוי - ונשמר בין הפעלות', async () => {
    const { kv, service } = make();
    await service.record({ title: 'א' });
    await service.record({ title: 'ב' });
    await service.remove(service.store.get()[0].id);
    const reopened = make(kv).service;
    await reopened.store.hydrate();
    assert.deepEqual(reopened.store.get().map((r) => r.title), ['א']);
    await reopened.clear();
    const third = make(kv).service;
    await third.store.hydrate();
    assert.deepEqual(third.store.get(), []);
  });

  it('record מחזיר false כשהמשתמש כיבה שמירת היסטוריה, ולא כותב כלום', async () => {
    const { kv, service, enabled } = make();
    enabled.value = false;
    assert.equal(await service.record({ title: 'סודי' }), false);
    assert.deepEqual(kv.dump(), {});
    enabled.value = true;
    assert.equal(await service.record({ title: 'גלוי' }), true);
  });

  it('record מחזיר false לקלט ריק ולכפילות מיידית אינה מוכפלת', async () => {
    const { service } = make();
    assert.equal(await service.record({ title: '  ' }), false);
    await service.record({ title: 'א' });
    await service.record({ title: 'א' });
    assert.equal(service.store.get().length, 1);
  });

  it('קריאות מקבילות לא מאבדות חיפושים', async () => {
    const { service } = make();
    await Promise.all(['א', 'ב', 'ג', 'ד'].map((title) => service.record({ title })));
    assert.equal(service.store.get().length, 4);
  });

  it('אחסון פגום => מתחילים ריק', async () => {
    const kv = new MemoryKeyValueStore();
    await kv.setItem(RECENTS_KEY, '}{');
    const { service } = make(kv);
    await service.store.hydrate();
    assert.deepEqual(service.store.get(), []);
  });

  it('כשל כתיבה: ההיסטוריה נשארת בזיכרון (offline-first)', async () => {
    const kv = new FlakyKeyValueStore();
    kv.failWrites = true;
    const { service } = make(kv as never);
    assert.equal(await service.record({ title: 'א' }), true);
    assert.equal(service.store.get().length, 1);
    assert.equal(service.store.lastError(), 'write failed');
  });
});
