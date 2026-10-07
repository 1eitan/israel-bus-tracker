import type { LocationState, LocationStatus } from '../hooks/useLocation';
import EmptyState from './EmptyState';

/** מצבי מיקום שמחליפים את התוכן במסך הסבר + פעולה (במקום רשימה ריקה/טעינה אינסופית) */
const BLOCKING: ReadonlySet<LocationStatus> = new Set(['denied', 'blocked', 'disabled', 'timeout', 'error']);

export const isLocationBlocking = (status: LocationStatus): boolean => BLOCKING.has(status);

type Props = Pick<LocationState, 'status' | 'requestPermission' | 'retry' | 'openSettings'>;

/** מסך הסבר לכל מצב מיקום בעייתי. מחזיר null כשאין בעיה (locating/ready/idle). */
export default function LocationGate({ status, requestPermission, retry, openSettings }: Props) {
  switch (status) {
    case 'denied':
      return (
        <EmptyState
          icon="location-outline"
          title="נדרשת גישה למיקום"
          message="כדי להציג תחנות בסביבתך יש לאפשר גישה למיקום."
          actionLabel="אפשר גישה למיקום"
          onAction={() => void requestPermission()}
        />
      );
    case 'blocked':
      return (
        <EmptyState
          icon="lock-closed-outline"
          title="הגישה למיקום חסומה"
          message="כדי להציג תחנות בסביבתך יש לאפשר מיקום לאפליקציה בהגדרות המכשיר."
          actionLabel="פתח הגדרות"
          onAction={openSettings}
        />
      );
    case 'disabled':
      return (
        <EmptyState
          icon="navigate-circle-outline"
          title="שירותי המיקום כבויים"
          message="הפעל את המיקום (GPS) במכשיר כדי לראות תחנות בסביבתך."
          actionLabel="פתח הגדרות"
          onAction={openSettings}
        />
      );
    case 'timeout':
      return (
        <EmptyState
          icon="time-outline"
          title="לא הצלחנו לאתר אותך"
          message="האיתור לוקח יותר מדי זמן. נסה לצאת לשטח פתוח ולנסות שוב."
          actionLabel="נסה שוב"
          onAction={retry}
        />
      );
    case 'error':
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="שגיאה באיתור המיקום"
          message="אירעה שגיאה בקבלת המיקום מהמכשיר."
          actionLabel="נסה שוב"
          onAction={retry}
        />
      );
    default:
      return null;
  }
}
