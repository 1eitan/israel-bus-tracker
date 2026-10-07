import StatusBadge from './StatusBadge';

/** סימון חובה לכל נתון שמקורו ב-Mock. אסור להציג נתוני הדגמה בלעדיו. */
export default function DemoBadge({ label = 'הדגמה' }: { label?: string }) {
  return <StatusBadge label={label} kind="warning" />;
}
