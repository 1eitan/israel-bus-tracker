import { onlineManager } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';

import { USE_MOCK_PROVIDERS } from '../lib/config';
import { asyncStorageKV } from '../lib/storage';
import { createServices, type AppServices } from './factory';

/** שירותי האפליקציה (singleton). נוצרים פעם אחת; mocks רק בפיתוח עם דגל מפורש (lib/config.ts). */
export const appServices: AppServices = createServices({
  useMocks: USE_MOCK_PROVIDERS,
  kv: asyncStorageKV,
  isOnline: () => onlineManager.isOnline()
});

const ServicesContext = createContext<AppServices>(appServices);

export function ServicesProvider({ children, value = appServices }: { children: ReactNode; value?: AppServices }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export const useServices = (): AppServices => useContext(ServicesContext);
