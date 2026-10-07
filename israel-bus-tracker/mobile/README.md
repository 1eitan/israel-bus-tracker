# אפליקציית מובייל (Expo / React Native)

לקוח מובייל ל-backend הקיים. ה-frontend (web) וה-backend נשארו כפי שהיו; ה-backend הורחב (SIRI-SM + `/api/stops/nearby`).

## הרצה

1. הפעל את ה-backend (`cd backend && npm install && npm run dev`).
2. `cd mobile && cp .env.example .env` והגדר `EXPO_PUBLIC_API_URL` ל-IP של המחשב (לא `localhost` במכשיר פיזי).
3. `npm install`
4. בניית Dev Client (חובה - **Expo Go לא יעבוד**, בגלל NFC ו-Google Maps):
   `npx expo prebuild && npx expo run:android` (או `run:ios`).
5. ב-`app.json` החלף את `REPLACE_WITH_*_GOOGLE_MAPS_KEY` במפתחות Google Maps.

בהרצה הראשונה האפליקציה נטענת מחדש פעם אחת כדי להפעיל RTL מקורי.

## מה מחובר באמת

| תחום | מימוש |
| --- | --- |
| מיקומי אוטובוסים | Socket.io מה-backend (אותם אירועים כמו ב-web); מושהה כשהאפליקציה ברקע |
| זמני הגעה | `/api/stops/nearby` ו-`/api/stops/:id/arrivals`, polling כל 15 שניות |
| GPS | `expo-location`, תחנות בטווח 500 מ' מהמשתמש |
| NFC | `react-native-nfc-manager`: זיהוי כרטיס NFC (UID) **בלבד**, קריאה בלבד. אין AID/APDU מאומתים, ולכן לא נשלחת אף פקודה לכרטיס |
| מועדפים / היסטוריה / פרופיל והעדפות | AsyncStorage מקומי (עובד offline), דרך `src/core/store.ts` |

## SIRI (משרד התחבורה)

`backend/src/services/siri.service.ts` מממש SIRI-SM (שאילתה לפי תחנה) וממפה לאותם מבנים של GTFS-RT. הגדרות ב-`backend/.env.example` (`SIRI_SM_URL`, `SIRI_KEY`, ...) והכתובת **לא** קבועה בקוד.

- ה-API דורש הרשמה, מפתח, ו-IP סטטי ברשימה לבנה, ולכן האפליקציה לא פונה אליו ישירות אלא דרך ה-backend.
- המיקומים החיים מגיעים רק לרכבים שבדרך לתחנות שמישהו ביקש לאחרונה (לא "כל הרכבים בארץ").
- חובה לספק `STATIC_DATA_PATH` עם תחנות (כולל `code` = קוד התחנה ב-SIRI), אחרת אין תחנות קרובות.
- לא אימתתי מול ה-ICD: יחידת `Velocity`, והמיפוי של `DatedVehicleJourneyRef` למזהה נסיעה.

## מה עדיין לא אמיתי

- **רב-קו:** קריאת יתרה/פרופיל/היסטוריה = `NOT_IMPLEMENTED`. נדרש מפרט רשמי מאומת (ראה `src/nfc/spec.ts`). AID/APDU לא מנוחשים. טעינה/כתיבה לכרטיס לא נתמכות.
- **תכנון מסלול:** ארכיטקטורה קיימת (`src/routing`), אך אין מנוע: `NOT_IMPLEMENTED`. "הצג יעד במפה" עדיין מאתר יעד בלבד.
- **תשלום ואזור אישי:** `PaymentProvider`/`AuthProvider`/`ProfileProvider` קיימים; אין ספק סליקה ואין שרת חשבונות => `NOT_IMPLEMENTED`.
- שלושת המועדפים (בית, אורן משי, איקאה) הם ברירות מחדל מהעיצוב בלבד. החיפושים האחרונים מתחילים ריקים.

## טיפוגרפיה ועיצוב

כל ה-tokens ב-`src/theme/tokens.ts` (צבעים, רדיוס, ריווח בכפולות של 4, Heebo). שימוש ב-StyleSheet ולא ב-Tailwind/NativeWind.

## Providers: Mock / Real

כל יכולת חיצונית (תשלום, חשבון, פרופיל, תכנון מסלול, NFC) עוברת interface; `src/providers/factory.ts` מרכיב אותם.

| ברירת מחדל (גם ב-release) | מה קורה |
| --- | --- |
| `NotImplementedPaymentProvider` | כל פעולה => `NOT_IMPLEMENTED` |
| `NotImplementedRoutePlanner` | `NOT_IMPLEMENTED` |
| `RealAuthProvider` | אורח; התחברות => `NOT_IMPLEMENTED` |
| `RealProfileProvider` | נשמר במכשיר; סנכרון חשבון => `NOT_IMPLEMENTED` |

Mock מופעל רק ב-`__DEV__` **וגם** עם `EXPO_PUBLIC_USE_MOCK_PROVIDERS=1`, וה-UI מסמן "הדגמה". ב-release הוא לא נוצר.

## בדיקות

`npm test` (מקמפל את `tests/` ואת שכבת הלוגיקה הטהורה עם tsc ומריץ `node --test`; דורש `npm install` בגלל `@types/node`). 169 בדיקות לוגיקה. בדיקות UI/מכשיר/NFC אמיתי אינן חלק מהן. קובץ חדש בשכבה הטהורה צריך להיכנס ל-`include` ב-`tsconfig.test.json`.

## כתובות שרת

`EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` (ראה `.env.example`). בפיתוח ברירת המחדל `http://localhost:4000`. ב-release אין ברירת מחדל, `http://` נחסם, ובלי כתובת https תקינה האפליקציה לא מבצעת בקשות רשת (`lib/url.ts`).
