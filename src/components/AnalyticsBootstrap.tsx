import { useEffect } from 'react';
import {
  bootstrapAnalytics,
  startPresenceHeartbeat,
  trackAnalytics,
} from '../services/analytics';
import { useUserStore } from '../store/useUserStore';
import { usePathname } from 'expo-router';

/** Inicializa analytics, presença online e pageviews. */
export function AnalyticsBootstrap() {
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const pathname = usePathname();

  useEffect(() => {
    void bootstrapAnalytics();
    return startPresenceHeartbeat();
  }, [userId, displayName]);

  useEffect(() => {
    if (!pathname) return;
    void trackAnalytics({
      name: 'screen_view',
      path: pathname,
    });
  }, [pathname, userId, displayName]);

  return null;
}
