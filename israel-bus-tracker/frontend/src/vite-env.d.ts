/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** כתובת בסיס ל-API (ברירת מחדל: אותו מקור, עם proxy של Vite בפיתוח) */
  readonly VITE_API_URL?: string;
  /** כתובת שרת ה-WebSocket (ברירת מחדל: אותו מקור) */
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
