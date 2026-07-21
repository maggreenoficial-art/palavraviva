import { useEffect } from 'react';
import {
  bootstrapAnalytics,
  startPresenceHeartbeat,
  trackAnalytics,
} from '../services/analytics';
import {
  captureMetaTestEventCode,
  initMetaPixel,
  trackMetaPageView,
  trackMetaTestCheckoutProbe,
} from '../services/metaPixel';
import { syncSubscriptionAccess } from '../services/wivenCheckout';
import { useUserStore } from '../store/useUserStore';
import { usePathname } from 'expo-router';

/** Inicializa analytics, Pixel Meta, presença online, pageviews e sync de assinatura. */
export function AnalyticsBootstrap() {
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const whatsapp = useUserStore((s) => s.whatsapp);
  const setSubscriptionExpiresAt = useUserStore(
    (s) => s.setSubscriptionExpiresAt,
  );
  const pathname = usePathname();

  useEffect(() => {
    captureMetaTestEventCode();
    useUserStore.getState().ensureGuestAccess();
    initMetaPixel();
    void bootstrapAnalytics();
    return startPresenceHeartbeat();
  }, [userId, displayName, whatsapp]);

  useEffect(() => {
    if (!userId) return;
    void syncSubscriptionAccess(userId, setSubscriptionExpiresAt);
  }, [userId, setSubscriptionExpiresAt]);

  useEffect(() => {
    if (!pathname) return;
    trackMetaPageView();
    // Atrasa 1.5s para o fbq carregar e a aba de teste capturar
    const timer = setTimeout(() => {
      trackMetaTestCheckoutProbe();
    }, 1500);
    void trackAnalytics({
      name: 'screen_view',
      path: pathname,
    });
    return () => clearTimeout(timer);
  }, [pathname, userId, displayName, whatsapp]);

  return null;
}
