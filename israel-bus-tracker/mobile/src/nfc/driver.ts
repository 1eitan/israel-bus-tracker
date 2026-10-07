import { Platform } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

import type { NfcDriver } from './scan';

/**
 * מתאם react-native-nfc-manager ל-NfcDriver. זה המקום היחיד שנוגע בספרייה.
 * לא נשלחת כאן שום פקודה בעצמה: requestIsoDep רק מתחבר, ו-transceive נקרא אך ורק מ-scanCard
 * אחרי assertReadOnlyApdu על כל צעד במפרט מאומת.
 * לא אומת על מכשיר פיזי (אין חומרה בסביבת הפיתוח).
 */
export const nfcManagerDriver: NfcDriver = {
  platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other',
  isSupported: () => NfcManager.isSupported(),
  isEnabled: () => NfcManager.isEnabled(),
  start: () => NfcManager.start(),
  async requestIsoDep(alertMessage) {
    await NfcManager.requestTechnology(NfcTech.IsoDep, { alertMessage });
  },
  async getTag() {
    const tag = await NfcManager.getTag();
    return tag ? { id: tag.id ?? null, techTypes: tag.techTypes } : null;
  },
  transceive: (apdu) => NfcManager.isoDepHandler.transceive(apdu),
  cancel: () => NfcManager.cancelTechnologyRequest().catch(() => undefined),
  openSettings: () => NfcManager.goToNfcSetting()
};
