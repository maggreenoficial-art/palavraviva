import { useEffect } from 'react';
import {
  bootstrapAnalytics,
  startPresenceHeartbeat,
  trackAnalytics,
} from '../services/analytics';
import {
  ensureMetaClickIds,
  initMetaPixel,
  trackMetaEvent,
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
  const hasTrackedFirstOpen = useUserStore((s) => s.hasTrackedFirstOpen);
  const markFirstOpenTracked = useUserStore((s) => s.markFirstOpenTracked);
  const ensureGuestAccess = useUserStore((s) => s.ensureGuestAccess);
  const setSubscriptionExpiresAt = useUserStore(
    (s) => s.setSubscriptionExpiresAt,
  );
  const pathname = usePathname();

  useEffect(() => {
    void ensureMetaClickIds();
    const { userId: uid } = ensureGuestAccess();
    initMetaPixel();
    void bootstrapAnalytics();
    if (uid && !hasTrackedFirstOpen) {
      markFirstOpenTracked();
      void trackAnalytics({ name: 'signup', path: '/' });
      trackMetaEvent('Lead', {
        content_name: 'app_open',
        content_category: 'guest_access',
      });
    }
    return startPresenceHeartbeat();
  }, [
    userId,
    displayName,
    whatsapp,
    hasTrackedFirstOpen,
    markFirstOpenTracked,
    ensureGuestAccess,
  ]);

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
