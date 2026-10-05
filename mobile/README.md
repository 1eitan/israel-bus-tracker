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
| NFC | `react-native-nfc-manager`: זיהוי כרטיס (UID) ו-SELECT ליישום |
| מועדפים / חיפושים אחרונים | AsyncStorage מקומי |

## SIRI (משרד התחבורה)

`backend/src/services/siri.service.ts` מממש SIRI-SM (שאילתה לפי תחנה) וממפה לאותם מבנים של GTFS-RT. הגדרות ב-`backend/.env.example` (`SIRI_SM_URL`, `SIRI_KEY`, ...) והכתובת **לא** קבועה בקוד.

- ה-API דורש הרשמה, מפתח, ו-IP סטטי ברשימה לבנה, ולכן האפליקציה לא פונה אליו ישירות אלא דרך ה-backend.
- המיקומים החיים מגיעים רק לרכבים שבדרך לתחנות שמישהו ביקש לאחרונה (לא "כל הרכבים בארץ").
- חובה לספק `STATIC_DATA_PATH` עם תחנות (כולל `code` = קוד התחנה ב-SIRI), אחרת אין תחנות קרובות.
- לא אימתתי מול ה-ICD: יחידת `Velocity`, והמיפוי של `DatedVehicleJourneyRef` למזהה נסיעה.

## מה עדיין לא אמיתי

- **רב-קו:** קריאת יתרה דורשת פענוח קבצי Calypso לפי מפרט הרב-קו (`parseRavKavBalance` מחזיר `null`), וה-AID ב-`src/lib/ravkav.ts` דורש אימות. טעינה לכרטיס אפשרית רק דרך מערכות הטעינה הרשמיות.
- **תכנון מסלול:** כרגע מאתר יעד (geocoding) ומציג אותו במפה עם תחנות בסביבה. מסלול מלא מנקודה לנקודה דורש מתכנן (למשל OpenTripPlanner).
- **תשלום ואזור אישי:** אין שירות חשבונות/סליקה. כפתור הוספת כרטיס לא אוסף מספר כרטיס; יש לחבר SDK של ספק סליקה עם טוקניזציה.
- הערכים בשלוש המועדפים ושני החיפושים האחרונים הם ברירות מחדל בלבד.

## טיפוגרפיה ועיצוב

כל ה-tokens ב-`src/theme/tokens.ts` (צבעים, רדיוס, ריווח בכפולות של 4, Heebo). שימוש ב-StyleSheet ולא ב-Tailwind/NativeWind.
