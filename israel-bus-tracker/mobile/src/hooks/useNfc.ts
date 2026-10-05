import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

import { RAVKAV_AID_HEX, parseRavKavBalance, type RavKavReadResult } from '../lib/ravkav';

export type NfcStatus =
  | 'checking'
  | 'unsupported'
  | 'disabled'
  | 'ready'
  | 'waiting' // ממתין שהכרטיס יוצמד
  | 'reading' // הכרטיס זוהה, קורא
  | 'done'
  | 'error';

const hexToBytes = (hex: string): number[] => hex.match(/.{2}/g)!.map((h) => parseInt(h, 16));
const bytesToHex = (bytes: number[]): string =>
  bytes.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

/** פקודת ISO 7816 SELECT לפי AID */
function buildSelect(aidHex: string): number[] {
  const aid = hexToBytes(aidHex);
  return [0x00, 0xa4, 0x04, 0x00, aid.length, ...aid, 0x00];
}

export function useNfc() {
  const [status, setStatus] = useState<NfcStatus>('checking');
  const [result, setResult] = useState<RavKavReadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const refreshSupport = useCallback(async () => {
    try {
      const supported = await NfcManager.isSupported();
      if (!supported) return setStatus('unsupported');
      await NfcManager.start();
      const enabled = Platform.OS === 'ios' ? true : await NfcManager.isEnabled();
      setStatus(enabled ? 'ready' : 'disabled');
    } catch {
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    void refreshSupport();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => undefined);
    };
  }, [refreshSupport]);

  /** כפתור "הפעל NFC": אם כבוי באנדרואיד פותח הגדרות; אחרת מתחיל סריקה */
  const start = useCallback(async () => {
    if (busy.current) return;
    if (status === 'disabled') {
      await NfcManager.goToNfcSetting();
      return;
    }
    if (status === 'unsupported' || status === 'checking') return;

    busy.current = true;
    setError(null);
    setResult(null);
    setStatus('waiting');
    try {
      const iso = Platform.OS === 'ios' ? NfcTech.Iso7816 : NfcTech.IsoDep;
      await NfcManager.requestTechnology(iso, { alertMessage: 'הצמד את כרטיס הרב-קו לגב המכשיר' });
      setStatus('reading');

      const tag = await NfcManager.getTag();
      const select = buildSelect(RAVKAV_AID_HEX);
      const response: number[] =
        Platform.OS === 'ios'
          ? await NfcManager.sendCommandAPDUIOS(select).then((r) => [...r.response, r.sw1, r.sw2])
          : await NfcManager.isoDepHandler.transceive(select);

      const sw = response.slice(-2);
      const data = response.slice(0, -2);
      const read: RavKavReadResult = {
        uid: tag?.id ?? null,
        selectOk: sw[0] === 0x90 && sw[1] === 0x00,
        statusWord: bytesToHex(sw),
        fciHex: bytesToHex(data),
        balanceAgorot: parseRavKavBalance(data)
      };
      setResult(read);
      setStatus('done');
      if (Platform.OS === 'ios') await NfcManager.setAlertMessageIOS('הקריאה הושלמה');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // ביטול ע"י המשתמש (iOS/אנדרואיד) אינו שגיאה להצגה
      if (/cancel/i.test(message)) setStatus('ready');
      else {
        setError(message);
        setStatus('error');
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => undefined);
      busy.current = false;
    }
  }, [status]);

  const cancel = useCallback(() => {
    NfcManager.cancelTechnologyRequest().catch(() => undefined);
    busy.current = false;
    setStatus('ready');
  }, []);

  return { status, result, error, start, cancel, refreshSupport };
}
