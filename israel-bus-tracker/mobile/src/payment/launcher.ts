import { notImplemented, type Outcome } from '../core/outcome';
import type { AddMethodLauncher, AddMethodSession } from './types';

/** אין SDK של ספק => NOT_IMPLEMENTED. כשמחברים ספק, מחליפים במימוש שפותח את ה-SDK. */
export class NotImplementedAddMethodLauncher implements AddMethodLauncher {
  async launch(_session: AddMethodSession): Promise<Outcome<void>> {
    return notImplemented('payment.launch', 'אין SDK של ספק סליקה מחובר, ולכן לא ניתן להציג טופס הזנת כרטיס.');
  }
}
