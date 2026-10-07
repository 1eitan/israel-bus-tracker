import { guardOnline, type Outcome } from '../core/outcome';
import type { PaymentProvider } from './types';

/**
 * עוטף ספק תשלום: פעולות שמדברות עם הספק (הוספה/הסרה/חיוב/רשימות) לא יוצאות בלי רשת.
 * בלי רשת מוחזר error 'offline' ו*שום בקשה לא נשלחת*. לא מנסים שוב אוטומטית (במיוחד חיוב).
 * getStatus אינו פעולת רשת ולכן אינו נחסם. ספק שאינו מוגדר (not_configured) מחזיר NOT_IMPLEMENTED גם offline.
 */
export function withConnectivity(provider: PaymentProvider, isOnline: () => boolean): PaymentProvider {
  const net = async <T>(run: () => Promise<Outcome<T>>): Promise<Outcome<T>> => {
    // ספק שלא מוגדר מחזיר NOT_IMPLEMENTED גם בלי רשת - "אין אינטרנט" יהיה הסבר מטעה כי חיבור לא יעזור.
    const status = await provider.getStatus();
    if (status.kind === 'ok' && status.data.state === 'not_configured') return run();
    return guardOnline(isOnline, run);
  };
  return {
    id: provider.id,
    isMock: provider.isMock,
    getStatus: () => provider.getStatus(),
    listMethods: () => net(() => provider.listMethods()),
    beginAddMethod: () => net(() => provider.beginAddMethod()),
    removeMethod: (id) => net(() => provider.removeMethod(id)),
    charge: (request) => net(() => provider.charge(request)),
    listTransactions: () => net(() => provider.listTransactions())
  };
}
