import { useEffect } from 'react';
import {
  bootstrapAnalytics,
  startPresenceHeartbeat,
  trackAnalytics,
} from '../services/analytics';
import {
  ensureMetaClickIds,
  initMetaPixel,
  trackMetaPageView,
} from '../services/metaPixel';
import { syncSubscriptionAccess } from '../services/wivenCheckout';
import { useUserStore } from '../store/useUserStore';
import { usePathname } from 'expo-router';

/** Inicializa analytics, Meta CAPI, presença online, pageviews e sync de assinatura. */
export function AnalyticsBootstrap() {
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const whatsapp = useUserStore((s) => s.whatsapp);
  const setSubscriptionExpiresAt = useUserStore(
    (s) => s.setSubscriptionExpiresAt,
  );
  const pathname = usePathname();

  useEffect(() => {
    void ensureMetaClickIds();
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
    void trackAnalytics({
      name: 'screen_view',
      path: pathname,
    });
  }, [pathname, userId, displayName, whatsapp]);

  return null;
}
