import { useEffect, useSyncExternalStore } from 'react';

import { setHapticsEnabled } from '../lib/haptics';
import { useServices } from '../providers/context';

/** מצב הפרופיל (שם, הגדרות, התראות, פרטיות) - ריאקטיבי, נשמר במכשיר. */
export function useProfile() {
  const { profile, auth } = useServices();
  useEffect(() => {
    void profile.load();
  }, [profile]);
  const snapshot = useSyncExternalStore(profile.subscribe, profile.peek, profile.peek);
  return { snapshot, profile, auth };
}

/** מחיל את הגדרות הפרופיל שמשפיעות על כל האפליקציה (רטט). נקרא פעם אחת מ-App. */
export function useApplyProfileEffects(): void {
  const { snapshot } = useProfile();
  useEffect(() => {
    setHapticsEnabled(snapshot.settings.haptics);
  }, [snapshot.settings.haptics]);
}
