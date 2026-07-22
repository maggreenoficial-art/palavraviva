import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
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
  const params = useLocalSearchParams<Record<string, string | string[]>>();

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

  // Expo Router: params que não são da rota viram query string no destino
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    queryParams[key] = Array.isArray(value) ? String(value[0]) : String(value);
  }

  return (
    <Redirect
      href={{
        pathname: '/(tabs)/home',
        params: queryParams,
      }}
    />
  );
}
