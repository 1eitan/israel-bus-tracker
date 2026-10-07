import IconButton from './IconButton';
import { colors } from '../theme/tokens';

interface Props {
  active: boolean;
  onToggle: () => void;
  /** שם הפריט - לתווית קורא המסך */
  name: string;
}

/** כפתור כוכב למועדפים (מצב פעיל בצהוב). */
export default function FavoriteButton({ active, onToggle, name }: Props) {
  return (
    <IconButton
      icon={active ? 'star' : 'star-outline'}
      color={active ? colors.warning : colors.textSecondary}
      filled={false}
      accessibilityLabel={active ? `הסר את ${name} ממועדפים` : `הוסף את ${name} למועדפים`}
      onPress={onToggle}
    />
  );
}
