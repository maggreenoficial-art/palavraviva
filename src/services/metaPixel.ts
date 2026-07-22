import { Platform } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { paymentsBaseUrl } from './paymentsUrl';

declare global {
  interface Window {
    fbq?: (
      action: string,
      event: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string },
    ) => void;
    clientParamBuilder?: {
      processAndCollectAllParams?: (
        url?: string,
        getIpFn?: () => Promise<string>,
      ) => Promise<Record<string, string>>;
      getFbc?: () => string | null;
      getFbp?: () => string | null;
      getClientIpAddress?: () => string | null;
    };
  }
}

const PIXEL_ID =
  (process.env.EXPO_PUBLIC_META_PIXEL_ID || '4474411989514975').trim();

const PRODUCTION_ORIGIN = 'https://www.oucapalavra.com.br';

let bootstrapped = false;
let clickIdsReady: Promise<void> | null = null;

function canUseWebMeta() {
  return (
    Platform.OS === 'web' && typeof window !== 'undefined' && Boolean(PIXEL_ID)
  );
}

function createEventId(event: string) {
  return `${event}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function cookieDomainSuffix() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname || '';
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return '';
  }
  const parts = host.split('.');
  if (parts.length >= 2) return `;domain=.${parts.slice(-2).join('.')}`;
  return '';
}

function writeCookie(name: string, value: string, days = 90) {
  if (typeof document === 'undefined' || !value) return;
  const maxAge = Math.floor(days * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)};path=/${cookieDomainSuffix()};max-age=${maxAge};SameSite=Lax`;
}

function subdomainIndex() {
  if (typeof window === 'undefined') return 1;
  const host = window.location.hostname || '';
  if (!host || host === 'localhost') return 1;
  return host.split('.').length >= 3 ? 2 : 1;
}

function ensureFbpCookie() {
  const fromBuilder = window.clientParamBuilder?.getFbp?.();
  if (fromBuilder && fromBuilder.startsWith('fb.')) {
    writeCookie('_fbp', fromBuilder);
    return fromBuilder;
  }
  const existing = readCookie('_fbp');
  if (existing.startsWith('fb.')) return existing;
  const value = `fb.${subdomainIndex()}.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
  writeCookie('_fbp', value);
  return value;
}

function ensureFbcCookie() {
  const fromBuilder = window.clientParamBuilder?.getFbc?.();
  if (fromBuilder && fromBuilder.startsWith('fb.')) {
    writeCookie('_fbc', fromBuilder);
    try {
      window.sessionStorage.setItem('meta_fbc', fromBuilder);
    } catch {
      // ignore
    }
    return fromBuilder;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (fbclid) {
      const existing = readCookie('_fbc');
      const existingClick = existing
        ? existing.split('.').slice(3).join('.')
        : '';
      if (!(existing && existingClick === fbclid)) {
        const value = `fb.${subdomainIndex()}.${Date.now()}.${fbclid}`;
        writeCookie('_fbc', value);
        window.sessionStorage.setItem('meta_fbc', value);
        return value;
      }
      return existing;
    }
  } catch {
    // ignore
  }

  const cookie = readCookie('_fbc');
  if (cookie.startsWith('fb.')) return cookie;
  try {
    return (window.sessionStorage.getItem('meta_fbc') || '').trim();
  } catch {
    return '';
  }
}

export function getMetaClickIds() {
  if (typeof window === 'undefined') return { fbp: '', fbc: '' };
  ensureFbpCookie();
  ensureFbcCookie();
  let fbp = readCookie('_fbp');
  let fbc = readCookie('_fbc');
  try {
    if (!fbc) fbc = (window.sessionStorage.getItem('meta_fbc') || '').trim();
  } catch {
    // ignore
  }
  const builderFbp = window.clientParamBuilder?.getFbp?.();
  const builderFbc = window.clientParamBuilder?.getFbc?.();
  if (builderFbp) fbp = builderFbp;
  if (builderFbc) fbc = builderFbc;
  return { fbp: fbp || '', fbc: fbc || '' };
}

export function ensureMetaClickIds() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (clickIdsReady) return clickIdsReady;
  clickIdsReady = (async () => {
    try {
      const builder = window.clientParamBuilder;
      if (builder?.processAndCollectAllParams) {
        await Promise.race([
          builder.processAndCollectAllParams(window.location.href),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch {
      // fallback manual
    }
    ensureFbpCookie();
    ensureFbcCookie();
  })();
  return clickIdsReady;
}

/** URL canônica para CAPI (www + sem query). */
export function metaEventSourceUrl() {
  if (typeof window === 'undefined') return `${PRODUCTION_ORIGIN}/home`;
  try {
    const url = new URL(window.location.href);
    url.protocol = 'https:';
    if (/oucapalavra\.com\.br$/i.test(url.hostname)) {
      url.hostname = 'www.oucapalavra.com.br';
    }
    for (const key of [
      'test_event_code',
      'testEventCode',
      'clear_test_event',
      'clearTestEvent',
      'meta_debug',
      'fbclid',
    ]) {
      url.searchParams.delete(key);
    }
    url.hash = '';
    return `${url.origin}${url.pathname || '/home'}`;
  } catch {
    return `${PRODUCTION_ORIGIN}/home`;
  }
}

function metaCapiUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host === '';
    if (!isLocal) {
      return `${window.location.origin.replace(/\/$/, '')}/api/meta/capi`;
    }
  }
  const base = paymentsBaseUrl();
  return base ? `${base.replace(/\/$/, '')}/api/meta/capi` : '';
}

function trackBrowserPixel(
  eventName: string,
  eventId: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    const pixelParams: Record<string, unknown> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) pixelParams[key] = value;
      }
    }
    window.fbq('track', eventName, pixelParams, { eventID: eventId });
  } catch {
    // Pixel opcional — CAPI segue
  }
}

async function sendCapi(
  eventName: string,
  eventId: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  const url = metaCapiUrl();
  if (!url) return;

  try {
    await ensureMetaClickIds();
  } catch {
    // segue sem Parameter Builder
  }

  trackBrowserPixel(eventName, eventId, params);

  const { fbp, fbc } = getMetaClickIds();
  const { userId, displayName, whatsapp } = useUserStore.getState();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: metaEventSourceUrl(),
        userId,
        displayName,
        whatsapp,
        country: 'br',
        fbp: fbp || undefined,
        fbc: fbc || undefined,
        userAgent:
          typeof navigator !== 'undefined'
            ? navigator.userAgent
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        customData: params || {},
      }),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      if (typeof console !== 'undefined') {
        console.warn('[meta-capi]', eventName, res.status, parsed);
      }
      return;
    }
    if (
      typeof console !== 'undefined' &&
      ['Lead', 'InitiateCheckout', 'AddPaymentInfo', 'Subscribe', 'Purchase', 'ViewContent'].includes(
        eventName,
      )
    ) {
      const received =
        parsed &&
        typeof parsed === 'object' &&
        'meta' in parsed &&
        parsed.meta &&
        typeof parsed.meta === 'object' &&
        'events_received' in parsed.meta
          ? (parsed.meta as { events_received?: number }).events_received
          : null;
      console.info('[meta-capi]', eventName, 'enviado', { events_received: received });
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[meta-capi]', eventName, String(err));
    }
  }
}

/** Bootstrap Pixel + CAPI — cookies fbp/fbc e deduplicação por eventID. */
export function initMetaPixel() {
  if (!canUseWebMeta() || bootstrapped) return;
  bootstrapped = true;
  void ensureMetaClickIds();
}

export function trackMetaPageView() {
  if (!canUseWebMeta()) return;
  initMetaPixel();
  void sendCapi('PageView', createEventId('PageView'));
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  if (!canUseWebMeta()) return;
  initMetaPixel();
  void sendCapi(event, createEventId(event), params);
}

export function trackMissaoInitiateCheckout() {
  trackMetaEvent('InitiateCheckout', {
    content_name: 'missao_plus',
    content_ids: ['missao_plus'],
    content_category: 'subscription',
    currency: 'BRL',
    value: 19.9,
    num_items: 1,
  });
}

export function trackMissaoAddPaymentInfo(paymentType: 'pix' | 'card') {
  trackMetaEvent('AddPaymentInfo', {
    content_name: 'missao_plus',
    content_ids: ['missao_plus'],
    content_category: 'subscription',
    currency: 'BRL',
    value: 19.9,
    payment_type: paymentType,
    num_items: 1,
  });
}

export function trackMissaoSubscribe() {
  trackMetaEvent('Subscribe', {
    content_name: 'missao_plus',
    content_ids: ['missao_plus'],
    content_category: 'subscription',
    currency: 'BRL',
    value: 19.9,
    predicted_ltv: 19.9,
    num_items: 1,
  });
}

export function trackMetaViewContent(contentName: string, category = 'content') {
  trackMetaEvent('ViewContent', {
    content_name: contentName,
    content_ids: [contentName],
    content_category: category,
    currency: 'BRL',
    value: 0,
  });
}

export function getMetaPixelId() {
  return PIXEL_ID;
}
