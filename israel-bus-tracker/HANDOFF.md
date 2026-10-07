# HANDOFF - אפליקציית אוטובוסים (Egg-style)

## Design System (עבודה ממוקדת) - הושלם. זה הסוף של החלק הזה

**נגעתי רק ב-Design System תחת `mobile/`. לא נבנו מסכים חדשים ולא שונו מסכים קיימים, NFC, תשלום, ניתוב, backend או frontend.** פירוט: `WORK_SUMMARY.md` (החלק הראשון).

### מה יש עכשיו
- `src/theme/tokens.ts` (מקור אמת): צבעים לפי המפרט, `radius.card/button/pill` (12/12/9999; `md/lg/full` נשארו כשמות תואמים לאחור), `space(n)` בסיס 4px, `TOUCH_TARGET=44`, `MAX_FONT_SCALE=1.3`, `iconSize`, `colors.controlOff`, טיפוגרפיה Heebo עם הווריאנטים `title/heading/body/caption/button/tab/navigation` (+`display`, `label`, `routeNumber`, `eta`, ושמות ישנים `chip`/`navLabel` כתואמים).
- `src/theme/contrast.ts` (חדש, טהור): `contrastRatio`, `readableTextOn`, `withAlpha`.
- רכיבים חדשים: `Screen`, `LineBadge`, `ArrivalBadge`, `Divider`, `Modal`, `Toggle`.
- רכיבים ששודרגו: `PrimaryButton`, `SecondaryButton` (variant `button`, `radius.button`), `Chip` (variant `tab`, prop `role`), `BottomNavBar` (variant `navigation`, 12px), `RouteCard`/`ArrivalRow`/`StationCard` (משתמשים ב-`LineBadge`/`ArrivalBadge`), `StatusBadge`, `SectionHeader`, `ToggleRow` (עכשיו על `Toggle`), `BottomSheet` (תווית לרקע), `LoadingSkeleton` (כיבוד reduce-motion, מוסתר מקורא מסך), `AppText`.
- `tests/design_system.test.ts` (24 בדיקות): tokens, ניגודיות AA, ואכיפה סטטית על `src/components` (אין צבעים קשיחים, אין כיוון פיזי, אין Pressable גולמי, role על כל לחיץ, touch target, font scaling).

### שינויים ויזואליים שכדאי לדעת עליהם
- תגי קו הם עכשיו pill (קודם מלבן 12px); זמן הגעה ב-`RouteCard`/`ArrivalRow` הוא pill עם רקע עדין (קודם טקסט צבעוני בלבד); קווים ב-`StationCard` הם `LineBadge` ניטרלי.
- צבע טקסט בתג קו נבחר אוטומטית לפי ניגודיות כשלא הועבר `badgeTextColor`.
- מצב כבוי של מתג מובחן יותר (מסלול `#3A3A3A`, ידית אפורה).
- תווית הסרגל התחתון 12px (היה 11px).

### אימות שהורץ
- `npx tsc --noEmit`: **2 שגיאות קיימות מראש, מחוץ ל-Design System, לא נגעתי בהן**: `src/nfc/driver.ts(26)` (`Promise<boolean>` מול `Promise<void>`) ו-`tests/history.test.ts(53)` (טיפוס literal). אין שגיאות בקבצי ה-Design System.
- בגלל השגיאה ב-`history.test.ts`, `npm test` נעצר ב-`tsc` לפני הרצה. הרצתי ידנית `tsc -p tsconfig.test.json` ואז `node --test test-out/tests/*.test.js`: **193/193 עברו** (169 קיימות + 24 חדשות).
- `npx expo export --platform android`: עבר (Hermes bundle ~4.1MB).

### מה לא נבדק (ופתוח)
1. מראה בפועל, RTL בפועל ו-TalkBack/VoiceOver על מכשיר/אמולטור. הבדיקות הן לוגיקה וסריקת קוד.
2. `Screen` ו-`Modal` החדשים עדיין לא בשימוש באף מסך (בכוונה: לא נבנו/שונו מסכים). `Divider` ו-`Toggle` בשימוש רק דרך `ToggleRow`/זמינים לשימוש.
3. ל-`BottomSheet` של `@gorhom` הוספתי `accessibilityLabel` לרקע; מעבר typecheck, אך ההתנהגות בקורא מסך לא נבדקה.
4. ESLint עדיין לא קיים, לכן אכיפת ה-Design System היא דרך `tests/design_system.test.ts` בלבד.
5. התקנה (`npm install`) יצרה `mobile/package-lock.json` בסביבה הזו; **לא כלול** בחבילה המעודכנת. צור/אמת אותו אצלך כמתואר בסעיף הפתוח הקודם.
6. שתי שגיאות ה-typecheck הקיימות (למעלה) דורשות החלטה שלך: הן מחוץ להיקף הזה.

---

## ניקוי וייצוב מבנה (אחרי שלב 4) - הושלם. זה הסוף של החלק הזה

**נעשה רק ניקוי מבנה. לא נגעתי ב-UI, תשלום, NFC, ניתוב או realtime.** פירוט מלא: `WORK_SUMMARY.md` (החלק הראשון).

### המבנה הסופי
```
backend/    שרת (קנוני)           frontend/  web, React+Vite (קנוני, עכשיו שלם)
mobile/     Expo/RN (קנוני)       docs/      FEATURE_STATUS, WHAT_IS_READY, PHASE2_B_MOBILE
.github/    CI                    .env.example (מפה מלאה) + backend|frontend|mobile/.env.example
```
`israel-bus-tracker/` **נמחק** (67 קבצים) אחרי בדיקה קובץ-קובץ. בדיקות נשארו ליד הקוד (`backend/src/__tests__`, `mobile/tests`), לא הוקמה תיקיית `tests/` בשורש: העברה הייתה שוברת imports וסקריפטי `npm test` ולא ניתן לאמת אותם כאן.

### הממצא הכי חשוב
`backend/package-lock.json` **לא היה מסונכרן** עם `package.json` (`socket.io-client` חסר). זה היה שובר `npm ci` ב-job של ה-backend ב-CI, וה-job הזה חוסם את בניית ה-APK. תיקנתי **ידנית** (תוספות בלבד, ערכי integrity אמיתיים מה-lock של ה-frontend, אומת מבנית). **לא הורץ `npm ci` בפועל** (אין רשת). ראה "מה עוד פתוח" סעיף 2.

### מה לעשות ראשון אצלך (דורש רשת)
```bash
cd backend  && npm install && git diff --stat package-lock.json   # נרמול ה-lock שתוקן ידנית; צפוי diff זניח
cd backend  && npm ci && npm run typecheck && npm test && npm run build
cd frontend && npm ci && npm run typecheck && npm run build        # מעולם לא עבר typecheck אמיתי בשום שלב
cd mobile   && npm install && npx expo install --check && npx expo install expo-dev-client
cd mobile   && npm run typecheck && npm test                       # ואז לעשות commit ל-mobile/package-lock.json
```

### מה עוד פתוח (לפי חשיבות)
1. **`mobile/package-lock.json` לא קיים.** לא ניתן להפיק ללא רשת (`npm install --package-lock-only` נכשל 403). אחרי שנוצר: ב-`.github/workflows/build-apk.yml` להחליף `npm install` ב-`npm ci` ולהוסיף `cache: npm`.
2. ה-lock של ה-backend נערך ידנית (ראה למעלה). אם `npm ci` ייכשל: `cd backend && npm install` ו-commit.
3. `expo-constants ~16.0.2` נוסף ל-`mobile/package.json` (היה מיובא ב-`ProfileScreen` בלי הצהרה). הגרסה לפי SDK 51 **מהזיכרון, לא אומתה**: `npx expo install --check` יתקן אם שגויה.
4. `expo-dev-client` **לא מותקן**, אבל `npm start` משתמש ב-`--dev-client` ופרופיל EAS `development` (הועבר מהעותק הישן ל-`mobile/eas.json`) דורש אותו. `react-native-nfc-manager` מחייב dev client. להריץ `npx expo install expo-dev-client`.
5. dependencies שאינן בשימוש ולא הוסרו בכוונה: `protobufjs` ב-backend (תלות ישירה שמגדירה רצפה ^7.4.0 מעל `gtfs-realtime-bindings`); `gh-pages` ב-frontend (אין סקריפט deploy). הסרה דורשת הפקת lock מחדש, לכן נדחתה לצד הרשת.
6. סטייה בטיפוסים: `ConnectionStatus` בשם זהה אך שונה בין `frontend/src/types/bus.ts` (3 ערכים) ל-`mobile/src/types/bus.ts` (+`'offline'`). הטיפוסים משוכפלים בשלוש חבילות, אין חבילה משותפת. לא אוחד.
7. אין CI ל-frontend. ה-workflow של העותק הישן (בנייה דרך EAS עם `EXPO_TOKEN`) לא הועבר: ה-workflow הנוכחי עדיף (כולל backend job, typecheck, tests, משתני Maps/API). פרופילי EAS נשארו ב-`eas.json` לבנייה ידנית.
8. הפרויקט אינו Git repository: לא בוצע commit, ואין היסטוריה להשוואה. `git init` נשאר להחלטתך (ה-`.gitignore` מוכן ונבדק).

---

## PHASE 4 COMPLETE (ביקורת סופית)

**זה סוף 4 השלבים. פירוט: `WORK_SUMMARY.md` (מה תוקן), `docs/FEATURE_STATUS.md` (סטטוס מדויק), `docs/WHAT_IS_READY.md` (מה אפשר ומה דורש גורם חיצוני).**

### הדבר החשוב ביותר
הסביבה האחרונה הייתה בלי רשת ובלי `node_modules`/Android SDK. **לא הורצו:** `npm run typecheck` (mobile/backend/frontend), lint (אין ESLint באף חבילה), Metro, `expo export`, `prebuild`, build של Android, בדיקות backend ב-4 קבצים (חסרות תלויות), וכל בדיקה על מכשיר. הרץ אצלך לפני כל דבר אחר:

```bash
cd backend  && npm ci && npm run typecheck && npm test && npm run build
cd mobile   && npm install && npx expo install --check && npm run typecheck && npm test
cd mobile   && npx expo export --platform android      # Metro / bundle
cd mobile   && npx expo prebuild && npx expo run:android   # דורש Android SDK + מכשיר
cd frontend && npm ci && npm run typecheck
```
אם `npm run typecheck` ב-mobile ייכשל: זה צפוי להיות ממצא אמיתי; טיפוסי הספריות (react-native-maps, nfc-manager, TanStack, expo) מעולם לא נבדקו מול גרסה מותקנת בשלבים 3-4 (בשלב 1 כן עבר).

### מה השתנה בשלב 4 (קצר)
- `src/lib/url.ts` + `config.ts`: ב-release אין ברירת מחדל ל-localhost; `http://` נחסם; `API_CONFIGURED`. בלי כתובת https תקינה האפליקציה לא פונה לרשת.
- "מחיקת כל הנתונים" מוחקת גם את מטמון ה-offline (React Query) בדיסק.
- `tsconfig.test.json`: הוסר `typeRoots` שהצביע על `/tmp`.
- `allowBackup: false`; הפרדות רשימה יציבות; סינון קווים ב-`useDeferredValue`; מקלדת במסך ההגדרות.
- 19 בדיקות חדשות (סה"כ 169). `.env.example` (ראשי + mobile). CI: typecheck/test + job ל-backend.

### מצב מרוכז
REAL (קוד, לא נבדק במכשיר): GPS, socket, REST. PARTIAL: מפה (דורשת מפתח), NFC (UID בלבד), realtime backend (דמו כברירת מחדל). NOT_IMPLEMENTED: יתרת רב-קו, תשלום, תכנון מסלול, חשבון, התראות, iOS NFC.

### מה עדיין פתוח (לפי חשיבות)
1. להריץ את שרשרת הבנייה למעלה ולתקן מה שייכשל.
2. מכשיר Android אמיתי: מראה, RTL, מקלדת, GPS, מפה, NFC, socket.
3. ESLint לא קיים. הערות `eslint-disable` מפנות לכללי `react-hooks` שאינם מותקנים.
4. בדיקות UI/E2E לא קיימות.
5. `mobile/package-lock.json` לא קיים (התקנות לא ניתנות לשחזור).
6. `ensureRtl` מסתמך על `expo-updates` להפעלה מחדש בהרצה ראשונה; בבנייה ללא עדכונים `DevSettings.reload` עשוי לא לעבוד ב-release. במכשיר בעברית RTL כבר פעיל מההתחלה. לא אומת.
7. (נסגר) `israel-bus-tracker/` נמחק בניקוי המבנה; ה-frontend המלא הועבר ל-`frontend/`.
8. החלפת `il.example.bustracker`, `eas.projectId`, חתימת release אמיתית, הגבלת מפתח Maps, `CORS_ORIGIN` מפורש.

---

## PHASE 3 COMPLETE (NFC / תשלום / פרופיל / Route Planner / היסטוריה - ארכיטקטורה + בדיקות לוגיקה)

(היסטורי - שלב 3 הושלם; שלב 4 הושלם אחריו.)

### מה חדש בשלב 3 (הכול תחת `mobile/`)
- שכבות לוגיקה טהורות (ללא React Native, נבדקות ב-`npm test`): `src/core` (Outcome, store מתמיד, הגנת נתונים רגישים), `src/nfc`, `src/payment`, `src/profile`, `src/routing`, `src/history`, `src/favorites`, `src/providers/factory.ts`.
- כל יכולת חיצונית מחזירה `Outcome`: `ok` / `not_implemented` / `error`. אין מצב של הצלחה מדומה.
- **נמחק `src/lib/ravkav.ts`** (הכיל AID מנוחש `315449432E494341` שנשלח לכרטיס). הוסר גם `selectIdentifiers` מ-`app.json`.
- NFC: ללא מפרט מאומת (`VERIFIED_RAVKAV_SPEC = null`) **לא נשלח אף APDU**. מזהים כרטיס ISO-DEP ומציגים UID. יתרה/פרופיל/היסטוריה = NOT_IMPLEMENTED. iOS = NOT_IMPLEMENTED (הוסר ענף `MifareIOS` הלא-מאומת).
- `DEFAULT_RECENTS` המזויף (שני "חיפושים" שלא בוצעו) הוסר; ערכים ישנים כאלה נמחקים מהאחסון בעת הטעינה.
- מסכים חדשים: מועדפים, היסטוריה, הגדרות/התראות/פרטיות (`Prefs`), עזרה. רכיבים חדשים: `NotImplementedCard`, `DemoBadge`, `ToggleRow`, `ItineraryCard`.
- נגזר מ-CI: `package.json` קיבל `npm test` ו-`@types/node` (devDependency). הרץ `npm install`.

### איך מחברים דברים אמיתיים (בלי לשנות UI)
| יכולת | מה להחליף |
| --- | --- |
| רב-קו | למלא `RavKavSpec` מאומת ב-`src/nfc/spec.ts` (מקור+תאריך אימות). כל צעד עובר allowlist של פקודות קריאה |
| סליקה | לממש `RealPaymentProvider` + `AddMethodLauncher` (SDK של הספק) ולהחליף ב-`providers/factory.ts` |
| תכנון מסלול | לממש `RealRoutePlannerProvider` (מסלולים חייבים `source:'real'`) |
| חשבון | לממש `AuthProvider` מרוחק; `RealProfileProvider.syncWithAccount` |

### סיכונים / לא נבדק
1. **לא הורץ על מכשיר/אמולטור.** NFC על חומרה, Android IsoDep, RTL, גיליונות, מתגים, חיווי ויזואלי - לא נבדקו.
2. **בדיקות UI אין.** נבדקה הלוגיקה בלבד (150 בדיקות). ה-UI עבר רק smoke typecheck מול stubs של RN (בלי `node_modules`), לא `npm run typecheck` אמיתי ולא bundling. הרץ `npm install && npm run typecheck && npx expo export --platform android`.
3. מיפוי שגיאות NFC (`src/nfc/errors.ts`) הוא heuristic לפי טקסט ההודעה של הספרייה; לא אומת על מכשיר.
4. `isoDepHandler.transceive` ו-`getTag().techTypes` נשענים על ה-API של `react-native-nfc-manager` כפי שהוא בשימוש הקיים; לא אומת מול גרסה מותקנת.
5. בחירת זמן במתכנן היא chips (עכשיו / +30 / +60 / +120 דק׳). בורר שעה אמיתי דורש ספרייה נוספת.
6. הגנת הנתונים הרגישים בוחנת מפתחות ומחרוזות בלבד; מספר כרטיס שנכתב כמספר מקונן תחת מפתח תמים לא ייתפס (מגבלה מתועדת).
7. מועדפי ברירת המחדל (בית/אורן משי/איקאה) נשארו מהעיצוב.

## PHASE 1 COMPLETE (UI/UX + ארכיטקטורת מסכים בלבד)

(היסטורי - שלב 1)

## איפה עובדים
- **העותק הקנוני למובייל: `mobile/` בשורש.** ה-CI (`.github/workflows/build-apk.yml`) בונה אותו.
- (היסטורי, שלב 1) `israel-bus-tracker/` היה עותק ישן/כפול. **נמחק בניקוי המבנה** (ראה למעלה).
- **ה-backend הקנוני: `backend/` בשורש** (שלב 2 / A1). הועתקו אליו הקבצים שהיו רק בעותק המקונן (`tsconfig.json`, `types/`, `utils/`, `data/`, `simulator.service.ts`, `websocket.service.ts`) והעותק `israel-bus-tracker/backend/` נמחק. הקבצים המשותפים היו זהים בייט-לבייט (נבדק עם `cmp`) ולכן לא אבד דבר.
- (היסטורי) ה-frontend המלא ישב ב-`israel-bus-tracker/frontend`. **הועבר ל-`frontend/`** בניקוי המבנה.
- `git` לא היה בארכיב (אין `.git`), לכן אין diff היסטורי.

## מה שונה (כל השינויים תחת `mobile/`)
- `src/theme/tokens.ts` נכתב מחדש כ-Design System יחיד. **אין יותר צבעים/rgba hardcoded מחוץ אליו** (נסרק; גם `mapStyle.ts` נגזר מה-theme).
  - הוסרו: `card`, `navBackground`, `navIcon` (הסרגל התחתון היה לבן - עכשיו כהה).
  - נוספו: `surface`, `surfaceElevated`, `primaryPressed`, `primaryText`, `danger`, `*Soft`, `info`, `radius.lg`, `elevation`, `motion`, `TOUCH_TARGET`, וריאנטים בטיפוגרפיה.
- 22 רכיבים חדשים/משודרגים תחת `src/components`, ראה WORK_SUMMARY.md.
- המסכים: תכנון מסלול (3 לשוניות), תשלום, רב-קו, אזור אישי, מפה, שירותי תחבורה (חדש).
- `usePolling` קיבל `refresh` ו-`refreshing` (pull-to-refresh). נוספו `usePlaces`, `useFavoriteRoutes`, `lib/haptics`, `lib/arrivals`.
- `lib/api.ts`: נוסף `fetchVehicleUpcoming` (קורא endpoint שכבר קיים ב-backend לפי ה-README; לא נבנה API חדש).
- `package.json`: נוסף `expo-haptics@~13.0.1`.
- `PlaceListItem.tsx` נמחק (הוחלף ב-`ListItem`/`FavoriteCard`/`RecentSearchCard`).
- `useNfc.ts`: שורה אחת שונתה, ראה "סיכונים".

## סיכונים / דברים שיש לאמת
1. **לא הורץ על מכשיר/אמולטור.** כל הוויזואליה, RTL בפועל, haptics, אנימציות, התנהגות ה-bottom sheet ורינדור Google Maps **לא נבדקו**. נבדק רק: typecheck + bundling.
2. **בדיקת רספונסיביות 320/360/390/430 = בדיקה סטטית של הקוד בלבד**, לא ויזואלית.
3. `expo install` נכשל (אין גישה לרשת של Expo), לכן `expo-haptics` הותקן ישירות עם npm. מומלץ להריץ `npx expo install --check`.
4. `useNfc.ts`: `NfcTech.Iso7816` (לא קיים בגרסה 3.17.5, שגיאת typecheck שהייתה קיימת לפני השינויים) הוחלף ב-`NfcTech.MifareIOS` בענף iOS. **לא אומת על iPhone.** ב-Android לא השתנה דבר.
5. `package-lock.json` לא נכלל (לא היה בפרויקט).
6. אין ESLint ואין jest ב-`mobile/` - הפקודות `lint`/`test` לא קיימות.
7. בלי backend רץ ו-`EXPO_PUBLIC_API_URL` - לשוניות תחנות/קווים והמפה יציגו מצב שגיאה/ריק (בכוונה, ללא נתונים מדומים).
8. ניגודיות: `primary` (#2B4ACB) כטקסט על רקע כהה ~2.65:1 ונכשל ב-AA, לכן טקסט/אייקונים משתמשים ב-`primaryText` (#8DA2FF). `primary` נשאר לרקעים (כפתורים, pills). לא נבדק עם קורא מסך אמיתי.

## הצעד הבא (שלב 2, רק לאחר אישור המשתמש)
לא הוחלט. נושאים פתוחים: איחוד backend, Route Planner, פענוח רב-קו, ספק סליקה, שירות חשבונות.
