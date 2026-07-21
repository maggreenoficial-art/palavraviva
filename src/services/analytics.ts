import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useUserStore } from '../store/useUserStore';

export type AnalyticsEventName =
  | 'app_open'
  | 'screen_view'
  | 'listen_start'
  | 'listen_progress'
  | 'read_open'
  | 'presence'
  | 'signup'
  | 'subscription_start'
  | 'subscription_activated'
  | 'tool_purchase_start'
  | 'tool_purchase_activated'
  | 'foto_jesus_prepare'
  | 'foto_jesus_success';

export type ContentKind =
  | 'session'
  | 'jornada'
  | 'serie'
  | 'meditacao'
  | 'ot'
  | 'oracao'
  | 'sos'
  | 'other';

type Attribution = {
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
};

type TrackPayload = {
  name: AnalyticsEventName;
  path?: string;
  contentId?: string;
  contentTitle?: string;
  contentKind?: ContentKind;
  meta?: Record<string, string | number | boolean | null>;
};

const SESSION_KEY = 'pv_analytics_session';
const ATTR_KEY = 'pv_analytics_attribution';
const GEO_KEY = 'pv_analytics_client_geo';

type ClientGeo = {
  city: string;
  region: string;
  country: string;
  lat: number | null;
  lon: number | null;
};

let memoryClientGeo: ClientGeo | null | undefined;

function analyticsBaseUrl() {
  const fromExtra = (
    Constants.expoConfig?.extra as { analyticsUrl?: string } | undefined
  )?.analyticsUrl;
  return (
    process.env.EXPO_PUBLIC_ANALYTICS_URL ||
    fromExtra ||
    'http://localhost:8787'
  ).replace(/\/$/, '');
}

function createSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function detectSourceFromWeb(): Attribution {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {
      source: Platform.OS,
      medium: 'app',
      campaign: '',
      referrer: '',
    };
  }

  const params = new URLSearchParams(window.location.search);
  const utmSource = (params.get('utm_source') || '').toLowerCase();
  const utmMedium = (params.get('utm_medium') || '').toLowerCase();
  const utmCampaign = params.get('utm_campaign') || '';
  const referrer = document.referrer || '';
  const refHost = (() => {
    try {
      return referrer ? new URL(referrer).hostname : '';
    } catch {
      return '';
    }
  })();

  let source = utmSource;
  let medium = utmMedium;

  if (!source) {
    if (params.get('fbclid') || refHost.includes('facebook') || refHost.includes('fb.')) {
      source = 'facebook';
      medium = medium || 'social';
    } else if (
      params.get('igshid') ||
      refHost.includes('instagram') ||
      refHost.includes('l.instagram')
    ) {
      source = 'instagram';
      medium = medium || 'social';
    } else if (refHost.includes('youtube') || refHost.includes('youtu.be')) {
      source = 'youtube';
      medium = medium || 'social';
    } else if (refHost.includes('google')) {
      source = 'google';
      medium = medium || 'organic';
    } else if (refHost) {
      source = refHost.replace(/^www\./, '');
      medium = medium || 'referral';
    } else {
      source = 'direto';
      medium = medium || 'none';
    }
  }

  return {
    source: source || 'direto',
    medium: medium || 'none',
    campaign: utmCampaign,
    referrer,
  };
}

let memorySessionId: string | null = null;
let memoryAttribution: Attribution | null = null;
let bootstrapped = false;

async function getSessionId() {
  if (memorySessionId) return memorySessionId;
  try {
    const existing = await AsyncStorage.getItem(SESSION_KEY);
    if (existing) {
      memorySessionId = existing;
      return existing;
    }
  } catch {
    // ignore
  }
  const next = createSessionId();
  memorySessionId = next;
  try {
    await AsyncStorage.setItem(SESSION_KEY, next);
  } catch {
    // ignore
  }
  return next;
}

async function getAttribution() {
  if (memoryAttribution) return memoryAttribution;
  try {
    const raw = await AsyncStorage.getItem(ATTR_KEY);
    if (raw) {
      memoryAttribution = JSON.parse(raw) as Attribution;
      return memoryAttribution;
    }
  } catch {
    // ignore
  }
  const detected = detectSourceFromWeb();
  memoryAttribution = detected;
  try {
    await AsyncStorage.setItem(ATTR_KEY, JSON.stringify(detected));
  } catch {
    // ignore
  }
  return detected;
}

function currentUserProfile() {
  const { userId, displayName, whatsapp } = useUserStore.getState();
  return {
    userId: userId ?? null,
    displayName: displayName ?? null,
    whatsapp: whatsapp ?? null,
  };
}

/** Geo pelo IP público do aparelho (não pelo servidor localhost). */
async function getClientGeo(): Promise<ClientGeo | null> {
  if (memoryClientGeo !== undefined) return memoryClientGeo;

  try {
    const cached = await AsyncStorage.getItem(GEO_KEY);
    if (cached) {
      memoryClientGeo = JSON.parse(cached) as ClientGeo;
      return memoryClientGeo;
    }
  } catch {
    // ignore
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch('https://ipwho.is/', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = (await response.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country_code?: string;
      latitude?: number;
      longitude?: number;
    };
    if (!data?.success || !data.city) {
      memoryClientGeo = null;
      return null;
    }
    const geo: ClientGeo = {
      city: data.city,
      region: data.region || '',
      country: data.country_code || '',
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lon: typeof data.longitude === 'number' ? data.longitude : null,
    };
    memoryClientGeo = geo;
    try {
      await AsyncStorage.setItem(GEO_KEY, JSON.stringify(geo));
    } catch {
      // ignore
    }
    return geo;
  } catch {
    memoryClientGeo = null;
    return null;
  }
}

export async function trackAnalytics(payload: TrackPayload) {
  const base = analyticsBaseUrl();
  if (!base) return;

  try {
    const [sessionId, attribution, clientGeo] = await Promise.all([
      getSessionId(),
      getAttribution(),
      getClientGeo(),
    ]);
    const profile = currentUserProfile();

    await fetch(`${base}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        ...profile,
        sessionId,
        platform: Platform.OS,
        attribution,
        clientGeo,
        occurredAt: new Date().toISOString(),
      }),
    });
  } catch {
    // Analytics nunca deve quebrar o app
  }
}

export async function bootstrapAnalytics() {
  if (bootstrapped) {
    void trackAnalytics({ name: 'presence' });
    return;
  }
  bootstrapped = true;
  await Promise.all([getAttribution(), getClientGeo()]);
  const path =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location?.pathname
      : 'app';
  await trackAnalytics({
    name: 'app_open',
    path,
  });
  void trackAnalytics({ name: 'presence' });
}

export function startPresenceHeartbeat() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const timer = window.setInterval(() => {
      void trackAnalytics({ name: 'presence' });
    }, 45_000);
    return () => window.clearInterval(timer);
  }

  const timer = setInterval(() => {
    void trackAnalytics({ name: 'presence' });
  }, 45_000);
  return () => clearInterval(timer);
}
