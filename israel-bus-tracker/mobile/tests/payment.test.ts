import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MemoryKeyValueStore } from '../src/core/store';
import { SensitiveDataError, createGuardedStore, findSensitiveData, looksLikeCardNumber } from '../src/core/sensitive';
import { MockPaymentProvider } from '../src/payment/mock';
import { NotImplementedPaymentProvider } from '../src/payment/notImplemented';
import { withConnectivity } from '../src/payment/connectivity';
import type { ChargeRequest, PaymentProvider } from '../src/payment/types';

const charge = (over: Partial<ChargeRequest> = {}): ChargeRequest => ({
  idempotencyKey: 'k1',
  amountAgorot: 590,
  currency: 'ILS',
  methodId: 'mock-method-2',
  description: 'test',
  ...over
});

async function mockWithCard(script?: ConstructorParameters<typeof MockPaymentProvider>[0]) {
  const p = new MockPaymentProvider(script);
  const added = p.simulateMethodAdded({ brand: 'Visa', last4: '4242' });
  assert.equal(added.kind, 'ok');
  return { p, methodId: added.kind === 'ok' ? added.data.id : '' };
}

describe('Payment: אין ספק => NOT_IMPLEMENTED, בלי הצלחה מדומה', () => {
  const p = new NotImplementedPaymentProvider();

  it('הסטטוס אומר שהספק לא מוגדר', async () => {
    const s = await p.getStatus();
    assert.deepEqual(s, { kind: 'ok', data: { state: 'not_configured', vendor: null, isMock: false } });
  });

  it('כל פעולה מחזירה NOT_IMPLEMENTED', async () => {
    const results = await Promise.all([
      p.listMethods(),
      p.beginAddMethod(),
      p.removeMethod('x'),
      p.charge(charge()),
      p.listTransactions(),
      p.configure({ publishableKey: 'pk_x' })
    ]);
    for (const r of results) {
      assert.equal(r.kind, 'not_implemented');
      assert.equal(r.kind === 'not_implemented' && r.code, 'NOT_IMPLEMENTED');
    }
  });

  it('אינו mock', () => {
    assert.equal(p.isMock, false);
  });
});

describe('Payment: MockPaymentProvider (הדגמה)', () => {
  it('isMock תמיד true', async () => {
    const p = new MockPaymentProvider();
    assert.equal(p.isMock, true);
    const s = await p.getStatus();
    assert.ok(s.kind === 'ok' && s.data.isMock);
  });

  it('beginAddMethod מחזיר סשן הדגמה ולא טוקן אמיתי', async () => {
    const r = await new MockPaymentProvider().beginAddMethod();
    assert.ok(r.kind === 'ok' && r.data.kind === 'demo' && r.data.launchToken === undefined);
  });

  it('דוחה מספר כרטיס / CVV בכל שדה', () => {
    const p = new MockPaymentProvider();
    assert.equal(p.simulateMethodAdded({ brand: '4111 1111 1111 1111', last4: '1111' }).kind, 'error');
    assert.equal(p.simulateMethodAdded({ brand: 'Visa', last4: '4111111111111111' }).kind, 'error');
    assert.equal(p.simulateMethodAdded({ brand: 'Visa', last4: '12' }).kind, 'error');
    assert.equal(p.simulateMethodAdded({ brand: 'Visa', last4: '4242', cvv: '123' } as never).kind, 'error');
  });

  it('חיוב מצליח רק עם אמצעי תשלום קיים', async () => {
    const empty = new MockPaymentProvider();
    assert.equal((await empty.charge(charge())).kind, 'error');
    const { p, methodId } = await mockWithCard();
    const r = await p.charge(charge({ methodId }));
    assert.ok(r.kind === 'ok' && r.data.status === 'succeeded');
  });

  it('idempotency: אותו מפתח לא מחויב פעמיים', async () => {
    const { p, methodId } = await mockWithCard();
    const a = await p.charge(charge({ methodId }));
    const b = await p.charge(charge({ methodId }));
    assert.deepEqual(a, b);
    const tx = await p.listTransactions();
    assert.ok(tx.kind === 'ok' && tx.data.length === 1);
  });

  it('סכום לא תקין / ללא idempotencyKey נדחים', async () => {
    const { p, methodId } = await mockWithCard();
    for (const amountAgorot of [0, -5, 1.5, Number.NaN]) {
      assert.equal((await p.charge(charge({ methodId, amountAgorot, idempotencyKey: `a${amountAgorot}` }))).kind, 'error');
    }
    assert.equal((await p.charge(charge({ methodId, idempotencyKey: '' }))).kind, 'error');
  });

  it('דחיית חיוב (declined) מועברת כמו שהיא', async () => {
    const { p, methodId } = await mockWithCard({ chargeScript: ['declined'] });
    const r = await p.charge(charge({ methodId }));
    assert.ok(r.kind === 'ok' && r.data.status === 'declined');
  });

  it('הסרת אמצעי תשלום מעבירה ברירת מחדל', async () => {
    const p = new MockPaymentProvider();
    const a = p.simulateMethodAdded({ brand: 'Visa', last4: '4242' });
    const b = p.simulateMethodAdded({ brand: 'Mastercard', last4: '4444' });
    assert.ok(a.kind === 'ok' && b.kind === 'ok');
    if (a.kind !== 'ok') return;
    await p.removeMethod(a.data.id);
    const list = await p.listMethods();
    assert.ok(list.kind === 'ok' && list.data.length === 1 && list.data[0].isDefault === true);
    assert.equal((await p.removeMethod('nope')).kind, 'error');
  });
});

describe('Payment: offline', () => {
  function spy(inner: PaymentProvider) {
    const calls: string[] = [];
    const wrapped: PaymentProvider = {
      id: inner.id,
      isMock: inner.isMock,
      getStatus: () => inner.getStatus(),
      listMethods: () => (calls.push('listMethods'), inner.listMethods()),
      beginAddMethod: () => (calls.push('beginAddMethod'), inner.beginAddMethod()),
      removeMethod: (id) => (calls.push('removeMethod'), inner.removeMethod(id)),
      charge: (r) => (calls.push('charge'), inner.charge(r)),
      listTransactions: () => (calls.push('listTransactions'), inner.listTransactions())
    };
    return { wrapped, calls };
  }

  it('ספק מחובר + offline: שגיאת offline ושום בקשה לא יוצאת (במיוחד חיוב)', async () => {
    const { wrapped, calls } = spy(new MockPaymentProvider());
    const p = withConnectivity(wrapped, () => false);
    const results = await Promise.all([p.charge(charge()), p.beginAddMethod(), p.listMethods(), p.removeMethod('x'), p.listTransactions()]);
    for (const r of results) assert.ok(r.kind === 'error' && r.error.code === 'offline');
    assert.deepEqual(calls, [], 'no request may leave the device while offline');
  });

  it('ספק מחובר + online: עובר', async () => {
    const { wrapped, calls } = spy(new MockPaymentProvider());
    const p = withConnectivity(wrapped, () => true);
    await p.listMethods();
    assert.deepEqual(calls, ['listMethods']);
  });

  it('ספק לא מוגדר + offline: עדיין NOT_IMPLEMENTED (לא "אין אינטרנט")', async () => {
    const p = withConnectivity(new NotImplementedPaymentProvider(), () => false);
    assert.equal((await p.charge(charge())).kind, 'not_implemented');
    assert.equal((await p.beginAddMethod()).kind, 'not_implemented');
  });

  it('getStatus לא נחסם offline', async () => {
    const p = withConnectivity(new MockPaymentProvider(), () => false);
    assert.equal((await p.getStatus()).kind, 'ok');
  });

  it('שומר isMock של הספק העטוף', () => {
    assert.equal(withConnectivity(new MockPaymentProvider(), () => true).isMock, true);
    assert.equal(withConnectivity(new NotImplementedPaymentProvider(), () => true).isMock, false);
  });
});

describe('אבטחה: לא שומרים מספר כרטיס / CVV / secrets', () => {
  it('looksLikeCardNumber (Luhn)', () => {
    assert.equal(looksLikeCardNumber('4111 1111 1111 1111'), true);
    assert.equal(looksLikeCardNumber('4111-1111-1111-1111'), true);
    assert.equal(looksLikeCardNumber('4111111111111112'), false); // נכשל Luhn
    assert.equal(looksLikeCardNumber('1234'), false);
    assert.equal(looksLikeCardNumber('שלום'), false);
  });

  it('findSensitiveData: מפתחות וערכים, גם מקוננים', () => {
    assert.ok(findSensitiveData({ cardNumber: '1' }));
    assert.ok(findSensitiveData({ a: { b: [{ cvv: '123' }] } }));
    assert.ok(findSensitiveData({ clientSecret: 'x' }));
    assert.ok(findSensitiveData({ note: 'my card 4111111111111111' }) === null); // טקסט חופשי עם מילים - לא נבדק
    assert.ok(findSensitiveData({ note: '4111111111111111' }));
    assert.equal(findSensitiveData({ brand: 'Visa', last4: '4242' }), null);
    assert.equal(findSensitiveData(null), null);
  });

  it('חותמות זמן במילישניות (13 ספרות) לעולם לא נחסמות', () => {
    for (let i = 0; i < 2000; i += 1) {
      const t = 1_700_000_000_000 + i * 7919;
      assert.equal(findSensitiveData({ searchedAt: t }), null);
    }
  });

  it('האחסון המוגן דוחה כתיבה רגישה ולא שומר דבר', async () => {
    const inner = new MemoryKeyValueStore();
    const kv = createGuardedStore(inner);
    await assert.rejects(kv.setItem('k', JSON.stringify({ cardNumber: '4111111111111111' })), SensitiveDataError);
    await assert.rejects(kv.setItem('k', JSON.stringify([{ cvv: '123' }])), SensitiveDataError);
    await assert.rejects(kv.setItem('k', '4111111111111111'), SensitiveDataError);
    assert.deepEqual(inner.dump(), {});
    await kv.setItem('ok', JSON.stringify({ last4: '4242', brand: 'Visa' }));
    assert.equal(await kv.getItem('ok'), '{"last4":"4242","brand":"Visa"}');
  });
});
