/**
 * Design tokens - מקור האמת היחיד לצבעים, רדיוסים, ריווח וטיפוגרפיה.
 * אין להשתמש בצבעים/גדלים hardcoded מחוץ לקובץ הזה.
 */
export const colors = {
  background: '#111111',
  surface: '#1E1E1E',
  surfaceElevated: '#242424',
  primary: '#2B4ACB',
  /** primary כהה יותר (~15%) למצב לחוץ */
  primaryPressed: '#2139A3',
  /** primary בהיר לטקסט/אייקונים על רקע כהה (ניגודיות ~7.9:1 מול #111111; primary עצמו רק ~2.7:1) */
  primaryText: '#8DA2FF',
  /** primary עדין לרקעים של chips/badges */
  primarySoft: 'rgba(43, 74, 203, 0.18)',
  /** טקסט/אייקון על primary */
  onPrimary: '#FFFFFF',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  /** טקסט מושבת (ניגודיות מכוונת נמוכה) */
  textDisabled: '#6B6B6B',
  success: '#4CAF50',
  successSoft: 'rgba(76, 175, 80, 0.16)',
  warning: '#FFC107',
  warningSoft: 'rgba(255, 193, 7, 0.16)',
  /** אדום נגיש על רקע כהה (ניגודיות ~5.6:1 מול #111111) */
  danger: '#FF5A5F',
  dangerSoft: 'rgba(255, 90, 95, 0.16)',
  /** מקדים (לא תקלה) */
  info: '#4FC3F7',
  infoSoft: 'rgba(79, 195, 247, 0.16)',
  border: '#2C2C2C',
  /** מסלול מתג (Toggle) במצב כבוי - מובחן מ-surface */
  controlOff: '#3A3A3A',
  overlay: 'rgba(0, 0, 0, 0.6)',
  /** צבע ברירת מחדל לכרטיסי קו כשאין צבע מהשרת */
  routeFallback: '#2B4ACB',
  transparent: 'transparent'
} as const;

export const radius = {
  /** 12px - כרטיס */
  card: 12,
  /** 12px - כפתור */
  button: 12,
  /** pill (צ'יפים, badges, סרגל תחתון) */
  pill: 9999,
  /** 12px - שדות ופריטים קטנים (שם מקורי, זהה ל-card) */
  md: 12,
  /** 20px - bottom sheet ודיאלוגים */
  lg: 20,
  /** שם מקורי ל-pill */
  full: 9999
} as const;

/** יחידת ריווח: כפולות של 4px. space(4) = 16 */
export const space = (units: number): number => units * 4;

/** גודל מינימלי לאזור מגע (נגישות) */
export const TOUCH_TARGET = 44;

/** תקרת הגדלת גופן (font scaling) - כדי לא לשבור פריסות, אך עדיין מכבד את הגדרת המשתמש */
export const MAX_FONT_SCALE = 1.3;

/** גדלי אייקון */
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 28 } as const;

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold'
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  /** תווית כפתור (ראשי/משני) */
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.text },
  /** תווית טאב / צ'יפ עליון */
  tab: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  /** תווית בסרגל הניווט התחתון */
  navigation: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  /** שם מקורי ל-tab */
  chip: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  /** שם מקורי ל-navigation */
  navLabel: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  /** מספר קו גדול */
  routeNumber: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, color: colors.text },
  /** זמן הגעה מודגש */
  eta: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.text }
} as const;

/** הצללה אחידה לכרטיסים מורמים */
export const elevation = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  }
} as const;

/** משכי אנימציה (ms) - עדינים בכוונה */
export const motion = { fast: 120, base: 200, slow: 320 } as const;

export const NAV_BAR_HEIGHT = 64;

export type ColorToken = keyof typeof colors;
