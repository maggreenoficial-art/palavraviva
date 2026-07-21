import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { trackAnalytics } from '../src/services/analytics';
import { trackMetaEvent } from '../src/services/metaPixel';
import { useUserStore } from '../src/store/useUserStore';

/**
 * Entrada direta no app — sem telas de nome/WhatsApp/humor.
 * Garante userId local e dispara Lead na primeira visita.
 */
export default function Index() {
  const [hydrated, setHydrated] = useState(() =>
    useUserStore.persist.hasHydrated(),
  );
  const ensureGuestAccess = useUserStore((s) => s.ensureGuestAccess);
  const hasTrackedFirstOpen = useUserStore((s) => s.hasTrackedFirstOpen);
  const markFirstOpenTracked = useUserStore((s) => s.markFirstOpenTracked);

  useEffect(() => {
    const unsub = useUserStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useUserStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { userId, isNew } = ensureGuestAccess();
    if (!userId) return;
    if (isNew || !hasTrackedFirstOpen) {
      markFirstOpenTracked();
      void trackAnalytics({ name: 'signup', path: '/' });
      // Lead = primeiro acesso (substitui CompleteRegistration do onboarding)
      trackMetaEvent('Lead', {
        content_name: 'app_open',
        content_category: 'guest_access',
      });
    }
  }, [
    hydrated,
    ensureGuestAccess,
    hasTrackedFirstOpen,
    markFirstOpenTracked,
  ]);

  if (!hydrated) return null;

  return <Redirect href="/(tabs)/home" />;
}
