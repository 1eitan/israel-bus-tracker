import { useCallback, useEffect, useState } from 'react';

import type { Outcome } from '../core/outcome';
import { useServices } from '../providers/context';
import type { Session } from '../profile/types';

/** סשן נוכחי. null = אורח. */
export function useAuthSession() {
  const { auth } = useServices();
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const result: Outcome<Session | null> = await auth.getSession();
    setSession(result.kind === 'ok' ? result.data : null);
    setLoaded(true);
  }, [auth]);

  useEffect(() => {
    void reload();
    return auth.subscribe(() => void reload());
  }, [auth, reload]);

  return { session, loaded, auth };
}
