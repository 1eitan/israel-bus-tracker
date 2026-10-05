/** Design tokens - מקור אמת יחיד לצבעים, רדיוסים, ריווח וטיפוגרפיה */
export const colors = {
  background: '#111111',
  card: '#1E1E1E',
  primary: '#2B4ACB',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  success: '#4CAF50',
  warning: '#FFC107',
  border: '#2C2C2C',
  /** סרגל תחתון בהיר */
  navBackground: '#FFFFFF',
  navIcon: '#111111'
} as const;

export const radius = { md: 12, full: 9999 } as const;

/** יחידת ריווח: כפולות של 4px. space(4) = 16 */
export const space = (units: number): number => units * 4;

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold'
} as const;

export const typography = {
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary }
} as const;

export const NAV_BAR_HEIGHT = 64;
