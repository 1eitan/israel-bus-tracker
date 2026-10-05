# אוטובוסים בזמן אמת - ישראל (GTFS-RT)

אפליקציית מעקב אחר אוטובוסים בזמן אמת: שרת Node.js + Socket.io ולקוח React + Leaflet, ממשק מלא בעברית (RTL) עם מצב כהה/בהיר.

## הרצה מהירה (מצב הדגמה)

```bash
# טרמינל 1 - שרת
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:4000

# טרמינל 2 - לקוח
cd frontend
npm install
npm run dev          # http://localhost:5173
```

ללא הגדרות נוספות השרת רץ ב-`DEMO_MODE`: 4 קווים בתל אביב ו-12 אוטובוסים מדומים שנוסעים לאורך המסלול, עוצרים בתחנות ומצטברים להם עיכובים. הנתונים עוברים בדיוק באותו מבנה (VehiclePosition / TripUpdate) שמגיע מפיד אמיתי.

## חיבור לפיד GTFS-RT אמיתי

ב-`backend/.env`:

```
DEMO_MODE=false
VEHICLE_POSITIONS_URL=https://<כתובת פיד VehiclePositions בפורמט protobuf>
TRIP_UPDATES_URL=https://<כתובת פיד TripUpdates בפורמט protobuf>
GTFS_API_KEY=<המפתח שלך, אם נדרש>
GTFS_API_KEY_HEADER=x-api-key      # או GTFS_API_KEY_PARAM=key לשליחה בכתובת
STATIC_DATA_PATH=./data/static.json
```

הערות חשובות:

- משרד התחבורה מפרסם נתוני זמן אמת בעיקר דרך SIRI ודורש הרשמה/מפתח. אם אין לך פיד GTFS-RT ישיר, אפשר להשתמש בשער שממיר SIRI ל-GTFS-RT ולהצביע עליו. הכתובות לא מוגדרות בקוד בכוונה.
- הנתונים הסטטיים (קווים, תחנות, מסלולים) נטענים מקובץ JSON בפורמט `{ "routes": [...], "stops": [...] }` (ראה `backend/src/types/gtfs.ts`, הטיפוסים `Route` ו-`Stop`). בלי הקובץ, קו שמופיע בפיד נוצר אוטומטית עם שם וצבע, אבל ללא מסלול ותחנות.

## API

| נתיב | תיאור |
| --- | --- |
| `GET /api/health` | סטטוס שירות |
| `GET /api/routes` | רשימת קווים |
| `GET /api/routes/:id` | קו מלא עם מסלול ותחנות |
| `GET /api/stops` | כל התחנות |
| `GET /api/stops/:id/arrivals` | הגעות צפויות לתחנה |
| `GET /api/vehicles/:id/upcoming` | התחנות הבאות של רכב |
| `GET /api/search?q=` | השלמה אוטומטית של קווים ותחנות |

**WebSocket:** הלקוח שולח `subscribe` עם `{ routeIds: string[] }` (`['*']` = כל הקווים) ומקבל `snapshot`, `vehicles:update`, `vehicles:remove`, `server:status`. כל קו הוא חדר נפרד, כך שמתקבלים עדכונים רק לקווים שנבחרו.

## מבנה

```
backend/src
  config.ts, server.ts
  types/gtfs.ts
  services/gtfsFetcher.service.ts   משיכה, פענוח protobuf ו-cache
  services/simulator.service.ts     סימולטור למצב הדגמה
  services/websocket.service.ts     Socket.io לפי קווים
frontend/src
  components/Map.tsx, SearchBar.tsx, BusInfoDrawer.tsx, Header.tsx
  hooks/ (socket, theme, polling...), lib/ (api, format), types/bus.ts, App.tsx
```

## פריסה

`npm run build` בשתי התיקיות. את תיקיית `frontend/dist` אפשר להגיש מכל שרת סטטי, ולהגדיר `VITE_API_URL` ו-`VITE_SOCKET_URL` בזמן ה-build אם השרת בדומיין אחר (ואז לעדכן `CORS_ORIGIN`).

## אפליקציית מובייל

ראה `mobile/README.md`. ה-backend תומך גם ב-SIRI-SM (`SIRI_SM_URL`) וב-`GET /api/stops/nearby?lat=&lon=&radius=&limit=`.
