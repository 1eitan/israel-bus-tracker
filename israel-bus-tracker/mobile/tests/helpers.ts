import { MemoryKeyValueStore, type KeyValueStore } from '../src/core/store';
import type { NfcDriver, NfcTag } from '../src/nfc/scan';
import type { RavKavSpec } from '../src/nfc/spec';
import { ok, fail } from '../src/core/outcome';

/** driver מזויף - רק לבדיקות. סופר כל קריאה ואת כל ה-APDU שנשלחו. */
export class FakeNfcDriver implements NfcDriver {
  platform: 'android' | 'ios' | 'other' = 'android';
  supported = true;
  enabled = true;
  startError: Error | null = null;
  tag: NfcTag | null = { id: '04a1b2c3d4', techTypes: ['IsoDep', 'NfcA'] };
  requestImpl: () => Promise<void> = async () => undefined;
  transceiveImpl: (apdu: number[]) => Promise<number[]> = async () => [0x90, 0x00];

  calls: string[] = [];
  sent: number[][] = [];

  async isSupported() {
    this.calls.push('isSupported');
    return this.supported;
  }
  async isEnabled() {
    this.calls.push('isEnabled');
    return this.enabled;
  }
  async start() {
    this.calls.push('start');
    if (this.startError) throw this.startError;
  }
  async requestIsoDep() {
    this.calls.push('requestIsoDep');
    return this.requestImpl();
  }
  async getTag() {
    this.calls.push('getTag');
    return this.tag;
  }
  async transceive(apdu: number[]) {
    this.calls.push('transceive');
    this.sent.push(apdu);
    return this.transceiveImpl(apdu);
  }
  async cancel() {
    this.calls.push('cancel');
  }
  async openSettings() {
    this.calls.push('openSettings');
  }
  count(name: string) {
    return this.calls.filter((c) => c === name).length;
  }
}

/**
 * מפרט סינתטי לבדיקות בלבד: *אינו* מפרט של הרב-קו ואין בו שום AID אמיתי.
 * משמש רק כדי לבדוק שצינור הקריאה (allowlist, SW, parsers) עובד כשיש מפרט.
 */
export const SYNTHETIC_TEST_SPEC: RavKavSpec = {
  source: 'SYNTHETIC TEST FIXTURE (not a real card spec)',
  verifiedOn: '1970-01-01',
  readPlan: [
    { id: 'select', description: 'synthetic select', apdu: [0x00, 0xa4, 0x04, 0x00, 0x02, 0xaa, 0xbb] },
    { id: 'record', description: 'synthetic read record', apdu: [0x00, 0xb2, 0x01, 0x0c, 0x00] }
  ],
  identify: (r) => r.get('select')?.sw === '9000',
  parseBalance: (r) => {
    const data = r.get('record')?.data ?? [];
    if (data.length < 2) return fail('invalid_response', 'record too short');
    return ok({ agorot: data[0] * 256 + data[1] });
  }
};

/** אחסון שאפשר להפיל: לבדיקת עמידות לשגיאות אחסון */
export class FlakyKeyValueStore implements KeyValueStore {
  readonly inner = new MemoryKeyValueStore();
  failReads = false;
  failWrites = false;
  async getItem(key: string) {
    if (this.failReads) throw new Error('read failed');
    return this.inner.getItem(key);
  }
  async setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('write failed');
    return this.inner.setItem(key, value);
  }
  async removeItem(key: string) {
    return this.inner.removeItem(key);
  }
}

export const tick = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));
