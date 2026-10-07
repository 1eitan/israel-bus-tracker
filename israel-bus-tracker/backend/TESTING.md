# בדיקות Backend

```
npm install        # פעם אחת: package-lock.json צריך להתעדכן ב-socket.io-client (devDependency חדש)
npm ci
npm run typecheck
npm run build      # משתמש ב-tsconfig.build.json (בלי __tests__)
npm test           # tsx --test src/__tests__/*.test.ts  (node:test, בלי framework נוסף)
```

| קובץ | מכסה | תלוי ב-node_modules |
| --- | --- | --- |
| validation / errors / providers / geo | ולידציה, צורת שגיאה, REAL/MOCK/NOT_IMPLEMENTED, גאומטריה | לא |
| app.test.ts | כל ה-routes, 400/404/500, CORS | express, cors |
| websocket.test.ts | connect/subscribe/unsubscribe/snapshot/update/remove/reconnect/disconnect | socket.io, socket.io-client |
| siri.test.ts | פענוח SIRI-SM (XML **סינתטי**, לא תגובה אמיתית) | fast-xml-parser, axios |
| fetcher.test.ts | פענוח JSON סטטי, כפילויות רכבים, stale, חיפוש | axios, gtfs-realtime-bindings |
