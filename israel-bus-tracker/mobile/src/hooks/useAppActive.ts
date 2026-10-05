import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** true כשהאפליקציה בחזית - משמש להשהיית polling/סוקט ברקע וחיסכון בסוללה */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
