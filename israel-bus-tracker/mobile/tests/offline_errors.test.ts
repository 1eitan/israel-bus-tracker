import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attempt, failure, guardOnline, isOk, notImplemented, ok, toFailure, ERROR_MESSAGES_HE, type ErrorCode } from '../src/core/outcome';
import { MemoryKeyValueStore } from '../src/core/store';
import { createServices } from '../src/providers/factory';
import { scanCard } from '../src/nfc/scan';
import { toggleFavoriteRoute } from '../src/favorites/places';
import { FakeNfcDriver } from './helpers';

describe('Errors: Outcome', () => {
  it('ok / notImplemented / fail', () => {
    assert.deepEqual(ok(1), { kind: 'ok', data: 1 });
    const ni = notImplemented('f', 'r');
    assert.ok(ni.kind === 'not_implemented' && ni.code === 'NOT_IMPLEMENTED' && ni.feature === 'f');
    assert.ok(isOk(ok(1)) && !isOk(ni));
  });

  it('לכל קוד שגיאה יש הודעה בעברית', () => {
    const codes = Object.keys(ERROR_MESSAGES_HE) as ErrorCode[];
    assert.ok(codes.length >= 10);
    for (const code of codes) assert.ok(failure(code).message.length > 0);
  });

  it('retryable: רשת/זמן/כרטיס שהתרחק כן; קלט לא תקין / ביטול לא', () => {
    for (const c of ['offline', 'timeout', 'network', 'tag_lost'] as const) assert.equal(failure(c).retryable, true);
    for (const c of ['invalid_input', 'cancelled', 'invalid_response', 'apdu_failed'] as const) assert.equal(failure(c).retryable, false);
  });

  it('toFailure שומר את ההודעה המקורית', () => {
    assert.equal(toFailure(new Error('boom')).cause, 'boom');
    assert.equal(toFailure('plain').cause, 'plain');
  });

  it('attempt הופך חריגה ל-error', async () => {
    const r = await attempt(async () => {
      throw new Error('x');
    });
    assert.ok(r.kind === 'error' && r.error.code === 'unknown');
    assert.deepEqual(await attempt(async () => ok(2)), { kind: 'ok', data: 2 });
  });

  it('guardOnline: offline לא מריץ את הפעולה', async () => {
    let ran = 0;
    const r = await guardOnline(() => false, async () => (ran += 1, ok(1)));
    assert.ok(r.kind === 'error' && r.error.code === 'offline');
    assert.equal(ran, 0);
    assert.equal((await guardOnline(() => true, async () => ok(1))).kind, 'ok');
  });
});

describe('Offline: מה עובד ומה לא', () => {
  const make = (online: boolean, useMocks = false) =>
    createServices({ useMocks, kv: new MemoryKeyValueStore(), isOnline: () => online });

  it('פיצרים מקומיים עובדים offline: מועדפים, היסטוריה, פרופיל', async () => {
    const s = make(false);
    await s.favorites.routes.update((l) => toggleFavoriteRoute(l, '480'));
    assert.deepEqual(s.favorites.routes.get(), ['480']);
    assert.equal(await s.recents.record({ title: 'חיפה' }), true);
    assert.ok((await s.profile.updateSettings({ haptics: false })).kind === 'ok');
  });

  it('NFC עובד offline (אין תלות ברשת)', async () => {
    const r = await scanCard(new FakeNfcDriver(), null);
    assert.equal(r.kind, 'ok');
  });

  it('תשלום מחובר (mock) offline: חיוב נחסם', async () => {
    const s = make(false, true);
    const r = await s.payment.charge({ idempotencyKey: 'k', amountAgorot: 100, currency: 'ILS', methodId: 'm', description: 'd' });
    assert.ok(r.kind === 'error' && r.error.code === 'offline');
  });

  it('תשלום לא מחובר: NOT_IMPLEMENTED גם offline וגם online', async () => {
    for (const online of [true, false]) {
      const r = await make(online).payment.beginAddMethod();
      assert.equal(r.kind, 'not_implemented');
    }
  });

  it('חזרה לרשת: אותו שירות עובד שוב', async () => {
    let online = false;
    const s = createServices({ useMocks: true, kv: new MemoryKeyValueStore(), isOnline: () => online });
    assert.ok((await s.payment.listMethods()).kind === 'error');
    online = true;
    assert.ok((await s.payment.listMethods()).kind === 'ok');
  });
});
