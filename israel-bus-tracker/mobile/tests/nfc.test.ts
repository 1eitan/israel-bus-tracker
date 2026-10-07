import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fail } from '../src/core/outcome';
import {
  ForbiddenApduError,
  assertReadOnlyApdu,
  bytesToHex,
  classifySw,
  hexToBytes,
  parseApduResponse
} from '../src/nfc/apdu';
import { classifyNfcError } from '../src/nfc/errors';
import { checkCapability, scanCard, type CardScan } from '../src/nfc/scan';
import { VERIFIED_RAVKAV_SPEC, type RavKavSpec } from '../src/nfc/spec';
import { initialNfcState, nfcReducer, type NfcState } from '../src/nfc/state';
import { FakeNfcDriver, SYNTHETIC_TEST_SPEC, tick } from './helpers';

describe('NFC: אין מפרט מאומת', () => {
  it('המפרט המאומת הוא null (אסור לנחש AID/APDU)', () => {
    assert.equal(VERIFIED_RAVKAV_SPEC, null);
  });

  it('סריקה בלי מפרט: לא נשלח אף APDU, יתרה/פרופיל/היסטוריה = NOT_IMPLEMENTED', async () => {
    const driver = new FakeNfcDriver();
    const result = await scanCard(driver, VERIFIED_RAVKAV_SPEC);
    assert.equal(driver.sent.length, 0, 'no APDU may be sent without a verified spec');
    assert.equal(driver.count('transceive'), 0);
    assert.equal(result.kind, 'ok');
    if (result.kind !== 'ok') return;
    assert.equal(result.data.cardType, 'unverified_iso_dep');
    assert.equal(result.data.uid, '04A1B2C3D4');
    assert.equal(result.data.readOnly, true);
    for (const part of [result.data.balance, result.data.profile, result.data.history]) {
      assert.equal(part.kind, 'not_implemented');
    }
    assert.equal(driver.count('cancel'), 1, 'connection must be released');
  });

  it('אין יתרה מזויפת: balance אף פעם לא ok בלי מפרט', async () => {
    const result = await scanCard(new FakeNfcDriver(), null);
    assert.ok(result.kind === 'ok' && result.data.balance.kind !== 'ok');
  });
});

describe('NFC: READ ONLY', () => {
  it('allowlist: קריאה מותרת, כתיבה אסורה', () => {
    for (const ins of [0xa4, 0xb0, 0xb2, 0xc0, 0xca]) assertReadOnlyApdu([0x00, ins, 0x00, 0x00]);
    // UPDATE BINARY, UPDATE RECORD, WRITE BINARY, PUT DATA, ERASE BINARY, APPEND RECORD
    for (const ins of [0xd6, 0xdc, 0xd0, 0xda, 0x0e, 0xe2]) {
      assert.throws(() => assertReadOnlyApdu([0x00, ins, 0x00, 0x00]), ForbiddenApduError);
    }
  });

  it('APDU לא תקין נדחה', () => {
    assert.throws(() => assertReadOnlyApdu([0x00, 0xa4]), ForbiddenApduError);
    assert.throws(() => assertReadOnlyApdu([0x00, 0xa4, 0x04, 300]), ForbiddenApduError);
    assert.throws(() => assertReadOnlyApdu([0x00, 0xa4, 0x04, -1]), ForbiddenApduError);
    assert.throws(() => assertReadOnlyApdu(new Array(262).fill(0xa4)), ForbiddenApduError);
  });

  it('מפרט שמכיל פקודת כתיבה נדחה לפני שמחכים לכרטיס ולפני כל שליחה', async () => {
    const evil: RavKavSpec = {
      ...SYNTHETIC_TEST_SPEC,
      readPlan: [
        ...SYNTHETIC_TEST_SPEC.readPlan,
        { id: 'write', description: 'must never run', apdu: [0x00, 0xd6, 0x00, 0x00, 0x01, 0xff] }
      ]
    };
    const driver = new FakeNfcDriver();
    const result = await scanCard(driver, evil);
    assert.equal(result.kind, 'error');
    assert.equal(driver.count('requestIsoDep'), 0);
    assert.equal(driver.sent.length, 0);
  });

  it('תוכנית ריקה נדחית', async () => {
    const driver = new FakeNfcDriver();
    const result = await scanCard(driver, { ...SYNTHETIC_TEST_SPEC, readPlan: [] });
    assert.equal(result.kind, 'error');
    assert.equal(driver.sent.length, 0);
  });
});

describe('NFC: עם מפרט (סינתטי) - צינור הקריאה', () => {
  it('שולח רק את צעדי התוכנית ומפענח יתרה', async () => {
    const driver = new FakeNfcDriver();
    driver.transceiveImpl = async (apdu) => (apdu[1] === 0xb2 ? [0x04, 0xd2, 0x90, 0x00] : [0x90, 0x00]);
    const result = await scanCard(driver, SYNTHETIC_TEST_SPEC);
    assert.equal(result.kind, 'ok');
    if (result.kind !== 'ok') return;
    assert.deepEqual(driver.sent, SYNTHETIC_TEST_SPEC.readPlan.map((s) => [...s.apdu]));
    assert.equal(result.data.cardType, 'ravkav');
    assert.deepEqual(result.data.balance, { kind: 'ok', data: { agorot: 1234 } });
    // אין parser לפרופיל/היסטוריה במפרט => NOT_IMPLEMENTED ולא ניחוש
    assert.equal(result.data.profile.kind, 'not_implemented');
    assert.equal(result.data.history.kind, 'not_implemented');
  });

  it('SW שאינו הצלחה בצעד חובה => apdu_failed', async () => {
    const driver = new FakeNfcDriver();
    driver.transceiveImpl = async () => [0x6a, 0x82];
    const result = await scanCard(driver, SYNTHETIC_TEST_SPEC);
    assert.ok(result.kind === 'error' && result.error.code === 'apdu_failed');
    assert.equal(driver.sent.length, 1, 'stops at the first failed required step');
    assert.equal(driver.count('cancel'), 1);
  });

  it('תשובה קצרה מ-2 בתים => apdu_failed', async () => {
    const driver = new FakeNfcDriver();
    driver.transceiveImpl = async () => [0x90];
    const result = await scanCard(driver, SYNTHETIC_TEST_SPEC);
    assert.ok(result.kind === 'error' && result.error.code === 'apdu_failed');
  });

  it('כרטיס שלא עובר identify => not_ravkav, בלי יתרה', async () => {
    const driver = new FakeNfcDriver();
    const spec: RavKavSpec = { ...SYNTHETIC_TEST_SPEC, identify: () => false };
    const result = await scanCard(driver, spec);
    assert.ok(result.kind === 'ok' && result.data.cardType === 'not_ravkav');
    if (result.kind === 'ok') assert.notEqual(result.data.balance.kind, 'ok');
  });

  it('parser שמחזיר שגיאה לא נבלע', async () => {
    const driver = new FakeNfcDriver();
    driver.transceiveImpl = async () => [0x90, 0x00]; // record בלי data
    const result = await scanCard(driver, SYNTHETIC_TEST_SPEC);
    assert.ok(result.kind === 'ok' && result.data.balance.kind === 'error');
  });
});

describe('NFC: timeout / cancel / שגיאות', () => {
  it('timeout בהמתנה לכרטיס, ומשחררים את החיבור', async () => {
    const driver = new FakeNfcDriver();
    driver.requestImpl = () => new Promise(() => undefined);
    const result = await scanCard(driver, null, { waitTimeoutMs: 20 });
    assert.ok(result.kind === 'error' && result.error.code === 'timeout');
    assert.equal(driver.count('cancel'), 1);
  });

  it('timeout על פקודה שלא חוזרת', async () => {
    const driver = new FakeNfcDriver();
    driver.transceiveImpl = () => new Promise(() => undefined);
    const result = await scanCard(driver, SYNTHETIC_TEST_SPEC, { apduTimeoutMs: 20 });
    assert.ok(result.kind === 'error' && result.error.code === 'timeout');
    assert.equal(driver.count('cancel'), 1);
  });

  it('ביטול ע"י המשתמש (AbortSignal) באמצע ההמתנה', async () => {
    const driver = new FakeNfcDriver();
    driver.requestImpl = () => new Promise(() => undefined);
    const controller = new AbortController();
    const pending = scanCard(driver, null, { signal: controller.signal });
    await tick(5);
    controller.abort();
    const result = await pending;
    assert.ok(result.kind === 'error' && result.error.code === 'cancelled');
    assert.equal(driver.count('cancel'), 1);
  });

  it('signal שכבר בוטל לפני ההתחלה', async () => {
    const driver = new FakeNfcDriver();
    const controller = new AbortController();
    controller.abort();
    const result = await scanCard(driver, null, { signal: controller.signal });
    assert.ok(result.kind === 'error' && result.error.code === 'cancelled');
  });

  it('הכרטיס התרחק באמצע קריאה => tag_lost', async () => {
    const driver = new FakeNfcDriver();
    driver.transceiveImpl = async () => {
      throw new Error('Tag was lost.');
    };
    const result = await scanCard(driver, SYNTHETIC_TEST_SPEC);
    assert.ok(result.kind === 'error' && result.error.code === 'tag_lost');
    assert.equal(result.kind === 'error' && result.error.retryable, true);
  });

  it('כרטיס שאינו ISO-DEP (requestIsoDep נכשל) => שגיאה מסווגת, ללא קריסה', async () => {
    const driver = new FakeNfcDriver();
    driver.requestImpl = async () => {
      throw new Error('IsoDep is not supported by this tag');
    };
    const result = await scanCard(driver, null);
    assert.equal(result.kind, 'error');
    assert.equal(driver.sent.length, 0);
  });

  it('onReading נקרא אחרי שהכרטיס זוהה', async () => {
    const driver = new FakeNfcDriver();
    let reading = 0;
    await scanCard(driver, null, { onReading: () => (reading += 1) });
    assert.equal(reading, 1);
  });

  it('classifyNfcError', () => {
    assert.equal(classifyNfcError(new Error('User cancelled')).code, 'cancelled');
    assert.equal(classifyNfcError(new Error('Transceive timed out')).code, 'timeout');
    assert.equal(classifyNfcError(new Error('Tag was lost')).code, 'tag_lost');
    assert.equal(classifyNfcError(new Error('NFC is disabled')).code, 'unavailable');
    const unknown = classifyNfcError(new Error('weird'));
    assert.equal(unknown.code, 'unknown');
    assert.equal(unknown.cause, 'weird');
    assert.equal(classifyNfcError('str').code, 'unknown');
  });
});

describe('NFC: תמיכה והפעלה', () => {
  it('לא נתמך', async () => {
    const driver = new FakeNfcDriver();
    driver.supported = false;
    assert.deepEqual(await checkCapability(driver), { kind: 'unsupported' });
    assert.equal(driver.count('start'), 0);
  });

  it('כבוי', async () => {
    const driver = new FakeNfcDriver();
    driver.enabled = false;
    assert.deepEqual(await checkCapability(driver), { kind: 'disabled' });
  });

  it('מוכן', async () => {
    assert.deepEqual(await checkCapability(new FakeNfcDriver()), { kind: 'ready' });
  });

  it('כשל ב-start() הוא שגיאה ולא "לא נתמך"', async () => {
    const driver = new FakeNfcDriver();
    driver.startError = new Error('boom');
    const cap = await checkCapability(driver);
    assert.equal(cap.kind, 'error');
  });

  it('iOS: NOT_IMPLEMENTED, לא ניגשים לחומרה ולא שולחים כלום', async () => {
    const driver = new FakeNfcDriver();
    driver.platform = 'ios';
    const cap = await checkCapability(driver);
    assert.equal(cap.kind, 'not_implemented');
    const scan = await scanCard(driver, SYNTHETIC_TEST_SPEC);
    assert.equal(scan.kind, 'not_implemented');
    assert.deepEqual(driver.calls, []);
  });
});

describe('NFC state machine', () => {
  const fakeScan = { uid: 'AA' } as unknown as CardScan;
  const run = (events: Parameters<typeof nfcReducer>[1][], from: NfcState = initialNfcState) =>
    events.reduce(nfcReducer, from);

  it('זרימה מלאה: checking -> ready -> waiting -> reading -> done', () => {
    const s = run([
      { type: 'capability', capability: { kind: 'ready' } },
      { type: 'scan_started' },
      { type: 'reading' },
      { type: 'scan_succeeded', scan: fakeScan }
    ]);
    assert.equal(s.phase, 'done');
    assert.equal(s.scan, fakeScan);
  });

  it('מצבי תמיכה', () => {
    assert.equal(run([{ type: 'capability', capability: { kind: 'unsupported' } }]).phase, 'unsupported');
    assert.equal(run([{ type: 'capability', capability: { kind: 'disabled' } }]).phase, 'disabled');
    const ni = run([{ type: 'capability', capability: { kind: 'not_implemented', reason: 'r' } }]);
    assert.equal(ni.phase, 'not_implemented');
    assert.equal(ni.reason, 'r');
  });

  it('אי אפשר להתחיל סריקה כש-NFC כבוי / לא נתמך / לא מוטמע', () => {
    for (const kind of ['unsupported', 'disabled'] as const) {
      const s = run([{ type: 'capability', capability: { kind } }, { type: 'scan_started' }]);
      assert.equal(s.phase, kind);
    }
  });

  it('ביטול: חוזר ל-ready בלי שגיאה', () => {
    const s = run([
      { type: 'capability', capability: { kind: 'ready' } },
      { type: 'scan_started' },
      { type: 'cancel' }
    ]);
    assert.equal(s.phase, 'ready');
    assert.equal(s.failure, null);
  });

  it('תוצאה שמגיעה אחרי ביטול מתעלמים ממנה', () => {
    const s = run([
      { type: 'capability', capability: { kind: 'ready' } },
      { type: 'scan_started' },
      { type: 'cancel' },
      { type: 'scan_succeeded', scan: fakeScan }
    ]);
    assert.equal(s.phase, 'ready');
    assert.equal(s.scan, null);
  });

  it('שגיאת cancelled מהסריקה אינה מוצגת כשגיאה', () => {
    const s = run([
      { type: 'capability', capability: { kind: 'ready' } },
      { type: 'scan_started' },
      { type: 'scan_failed', failure: { code: 'cancelled', message: 'x', retryable: false } }
    ]);
    assert.equal(s.phase, 'ready');
  });

  it('שגיאה אמיתית: error + אפשר לנסות שוב', () => {
    let s = run([
      { type: 'capability', capability: { kind: 'ready' } },
      { type: 'scan_started' },
      { type: 'reading' },
      { type: 'scan_failed', failure: { code: 'tag_lost', message: 'x', retryable: true } }
    ]);
    assert.equal(s.phase, 'error');
    assert.equal(s.failure?.code, 'tag_lost');
    s = nfcReducer(s, { type: 'scan_started' });
    assert.equal(s.phase, 'waiting');
    assert.equal(s.failure, null);
  });

  it('רענון תמיכה לא מפריע לסריקה ולא מוחק תוצאה', () => {
    const scanning = run([{ type: 'capability', capability: { kind: 'ready' } }, { type: 'scan_started' }]);
    assert.equal(nfcReducer(scanning, { type: 'capability', capability: { kind: 'disabled' } }), scanning);
    const done = run([{ type: 'scan_succeeded', scan: fakeScan }], { ...scanning, phase: 'reading' });
    assert.equal(nfcReducer(done, { type: 'capability', capability: { kind: 'ready' } }), done);
  });

  it('אחרי שגיאה, אם ה-NFC כובה - מציגים כבוי', () => {
    const err = run([
      { type: 'capability', capability: { kind: 'ready' } },
      { type: 'scan_started' },
      { type: 'scan_failed', failure: { code: 'unknown', message: 'x', retryable: true } }
    ]);
    assert.equal(nfcReducer(err, { type: 'capability', capability: { kind: 'ready' } }).phase, 'error');
    assert.equal(nfcReducer(err, { type: 'capability', capability: { kind: 'disabled' } }).phase, 'disabled');
  });

  it('reading מחוץ ל-waiting מתעלמים', () => {
    const s = run([{ type: 'capability', capability: { kind: 'ready' } }, { type: 'reading' }]);
    assert.equal(s.phase, 'ready');
  });
});

describe('APDU helpers', () => {
  it('parseApduResponse', () => {
    assert.deepEqual(parseApduResponse([0x01, 0x02, 0x90, 0x00]), { data: [1, 2], sw1: 0x90, sw2: 0, sw: '9000' });
    assert.equal(parseApduResponse([0x90]), null);
    assert.equal(parseApduResponse([]), null);
    assert.equal(parseApduResponse([1, 2, 999]), null);
  });

  it('classifySw (ISO 7816-4 כללי)', () => {
    assert.equal(classifySw(0x90, 0x00), 'success');
    assert.equal(classifySw(0x61, 0x10), 'more_data');
    assert.equal(classifySw(0x6c, 0x05), 'wrong_length');
    assert.equal(classifySw(0x6a, 0x82), 'not_found');
    assert.equal(classifySw(0x69, 0x82), 'security');
    assert.equal(classifySw(0x6d, 0x00), 'not_supported');
    assert.equal(classifySw(0x6f, 0x00), 'other');
    assert.equal(classifySw(0x90, 0x01), 'other');
  });

  it('hex', () => {
    assert.equal(bytesToHex([0, 15, 255]), '000FFF');
    assert.deepEqual(hexToBytes('00 0f ff'), [0, 15, 255]);
    assert.throws(() => hexToBytes('0'));
    assert.throws(() => hexToBytes('zz'));
  });

  it('שימוש ב-fail לא נשבר (sanity של outcome)', () => {
    assert.equal(fail('offline').kind, 'error');
  });
});
