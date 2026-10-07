import { colors } from '../theme/tokens';

/**
 * סגנון מפה כהה ל-Google Maps (react-native-maps), נגזר מה-theme.
 * ב-iOS עם Apple Maps משתמשים ב-userInterfaceStyle="dark".
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: colors.surface }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.background }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: colors.border }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.border }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: colors.surface }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: colors.surfaceElevated }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: colors.surfaceElevated }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.background }] }
];
