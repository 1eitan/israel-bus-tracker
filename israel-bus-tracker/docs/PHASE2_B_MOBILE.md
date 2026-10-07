# שלב 2 / B - חיבור המובייל ל-Backend

## מה נעשה
| סעיף | מימוש |
| --- | --- |
| B1 React Query | `lib/queryClient.ts` (retry עם backoff+jitter, מטמון 24 ש׳ נשמר ל-AsyncStorage, NetInfo→onlineManager, AppState→focusManager), `hooks/queries.ts` (routes, route, stopArrivals, vehicleUpcoming, search), `hooks/useNearbyStops.ts` |
| Polling הגעות | `refetchInterval` 15 שנ׳ רק כשהאפליקציה בחזית והמסך פעיל |
| Offline | נתונים אחרונים נשארים על המסך, שאילתות מושהות ומתרעננות בחזרת הרשת, `OfflineBanner` |
| WebSocket | `hooks/useVehicleSocket.ts`: מתחבר רק עם רשת+חזית, עדכונים מקובצים (500ms), סינון קואורדינטות לא תקינות, ניקוי רכבים ישנים |
| B2 GPS | `hooks/useLocation.ts` + `components/LocationGate.tsx`: denied / blocked / GPS כבוי / timeout / error, דיוק (`coarse`), מיקום אחרון ידוע, בדיקה מחדש בחזרה מההגדרות, ניקוי watcher |
| B3 מפה | `components/BusMap.tsx`: משתמש, תחנות (+נבחרת), רכבים (+נבחר), קו מסלול, מפה כהה; בלי מפתח Google תקין מוצג "המפה אינה זמינה" ואין קריסה (`lib/maps.ts`, `app.config.js`) |
| B4 Nearby | `lib/nearby.ts`: מרחק מחושב מחדש מהמיקום האמיתי, מיון עולה, סינון כפולים/לא תקינים/ישנים |

## הגדרה
1. `cd mobile && npm install && npx expo install --check` (נוספו netinfo ו-@tanstack/*)
2. `.env`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`, ואופציונלית `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` / `..._IOS_KEY`
3. מפתח Google Maps נכנס גם ל-build (דרך `app.config.js`) - אחרי שינוי מפתח צריך `expo prebuild` מחדש.
4. CI: להגדיר variables `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL` ו-secret `GOOGLE_MAPS_ANDROID_KEY`. בלי זה ה-APK מצביע על localhost.

## לא נבדק (לא רץ על מכשיר)
typecheck מלא, הרצה על Android/iOS, GPS אמיתי, WebSocket מול שרת חי, מצב טיסה, חסימת הרשאה. נבדקה רק לוגיקת `rankNearbyStops`/`isValidCoord` (node --test).
