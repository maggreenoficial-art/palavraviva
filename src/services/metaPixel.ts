import { Platform } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { paymentsBaseUrl } from './paymentsUrl';

declare global {
  interface Window {
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

/** Pixel do navegador desativado — só Conversions API. */
const META_BROWSER_PIXEL_ENABLED = false;

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

/** Garante _fbp (browser id) o mais cedo possível. */
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

/**
 * Captura fbclid da URL e grava _fbc no formato Meta.
 * Case-sensitive — não alterar o fbclid.
 * @see https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc
 */
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
        window.sessionStorage.setItem('meta_fbclid', fbclid);
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

/** Lê fbp/fbc para CAPI (cookie → param builder → sessionStorage). */
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

/**
 * Processa fbclid/fbp com o Parameter Builder da Meta (quando carregado)
 * e fallback manual. Chamar no boot da landing.
 */
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
      // fallback manual abaixo
    }
    ensureFbpCookie();
    ensureFbcCookie();
  })();
  return clickIdsReady;
}

/**
 * Código da aba Eventos de teste.
 * Só na URL ou sessionStorage (mesma aba / SPA). NÃO usa localStorage.
 */
export function getTestEventCodeNow(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const clearFlag = (
      params.get('clear_test_event') ||
      params.get('clearTestEvent') ||
      ''
    ).trim();
    if (clearFlag === '1' || clearFlag.toLowerCase() === 'true') {
      try {
        window.sessionStorage.removeItem('meta_test_event_code');
        window.localStorage.removeItem('meta_test_event_code');
      } catch {
        // ignore
      }
      return '';
    }

    const fromQuery = (
      params.get('test_event_code') ||
      params.get('testEventCode') ||
      ''
    ).trim();
    if (fromQuery) {
      try {
        window.sessionStorage.setItem('meta_test_event_code', fromQuery);
        window.localStorage.removeItem('meta_test_event_code');
      } catch {
        // ignore
      }
      return fromQuery;
    }

    try {
      window.localStorage.removeItem('meta_test_event_code');
    } catch {
      // ignore
    }

    return (window.sessionStorage.getItem('meta_test_event_code') || '').trim();
  } catch {
    return '';
  }
}

/** @deprecated use getTestEventCodeNow — mantido para imports existentes */
export function captureMetaTestEventCode() {
  return getTestEventCodeNow();
}

/** Mantém ?test_event_code= na URL ao navegar (SPA). */
export function persistMetaTestEventCodeInUrl() {
  if (typeof window === 'undefined') return;
  const code = getTestEventCodeNow();
  if (!code) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('test_event_code') === code) return;
    url.searchParams.set('test_event_code', code);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // ignore
  }
}

function debugMetaCheckout(event: string, detail: Record<string, unknown>) {
  if (typeof console === 'undefined') return;
  if (event !== 'InitiateCheckout' && event !== 'AddPaymentInfo') return;
  const testCode = getTestEventCodeNow();
  if (
    !testCode &&
    detail.stage !== 'capi_response' &&
    detail.stage !== 'capi_error'
  ) {
    return;
  }
  console.info('[meta-checkout]', event, detail);
  if (testCode && detail.stage === 'track_start') {
    console.warn(
      '[meta-checkout] Modo TESTE ativo (' +
        testCode +
        '). Eventos vão para Eventos de teste via CAPI; ' +
        'para Ads use o site SEM ?test_event_code=.',
    );
  }
}

/**
 * Bootstrap Meta (CAPI only) — cookies fbp/fbc para matching; sem fbq.
 */
export function initMetaPixel() {
  if (!canUseWebMeta() || bootstrapped) return;
  bootstrapped = true;
  void ensureMetaClickIds();
}

/** Endpoint CAPI: em web online sempre same-origin. */
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

async function sendCapi(
  eventName: string,
  eventId: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  const url = metaCapiUrl();
  if (!url) {
    debugMetaCheckout(eventName, { stage: 'capi_skip', reason: 'no_capi_url' });
    return;
  }

  try {
    await ensureMetaClickIds();
  } catch {
    // segue sem Parameter Builder
  }

  const { fbp, fbc } = getMetaClickIds();
  const { userId, displayName, whatsapp } = useUserStore.getState();
  const testEventCode = getTestEventCodeNow() || undefined;
  const body = {
    eventName,
    eventId,
    eventSourceUrl:
      typeof window !== 'undefined'
        ? window.location.href.startsWith('http')
          ? window.location.href
          : 'https://www.oucapalavra.com.br/'
        : 'https://www.oucapalavra.com.br/',
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
    testEventCode,
    customData: params || {},
  };
  debugMetaCheckout(eventName, {
    stage: 'capi_post',
    eventId,
    testEventCode: testEventCode || null,
    url,
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    debugMetaCheckout(eventName, {
      stage: 'capi_response',
      status: res.status,
      ok: res.ok,
      body: parsed,
    });
  } catch (err) {
    debugMetaCheckout(eventName, {
      stage: 'capi_error',
      error: String(err),
    });
  }
}

export function trackMetaPageView() {
  if (!canUseWebMeta()) return;
  persistMetaTestEventCodeInUrl();
  initMetaPixel();
  void sendCapi('PageView', createEventId('PageView'));
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  if (!canUseWebMeta()) return;
  persistMetaTestEventCodeInUrl();
  const eventId = createEventId(event);

  debugMetaCheckout(event, {
    stage: 'track_start',
    eventId,
    testEventCode: getTestEventCodeNow() || null,
    href: typeof window !== 'undefined' ? window.location.href : null,
    browserPixel: META_BROWSER_PIXEL_ENABLED,
    params: params || {},
  });

  initMetaPixel();
  void sendCapi(event, eventId, params);
}

/** Atalhos do funil Missão+ — use nos cliques (abrir paywall / pagar). */
export function trackMissaoInitiateCheckout() {
  trackMetaEvent('InitiateCheckout', {
    content_name: 'missao_plus',
    content_category: 'subscription',
    currency: 'BRL',
    value: 19.9,
    num_items: 1,
  });
}

export function trackMissaoAddPaymentInfo(paymentType: 'pix' | 'card') {
  trackMetaEvent('AddPaymentInfo', {
    content_name: 'missao_plus',
    content_category: 'subscription',
    currency: 'BRL',
    value: 19.9,
    payment_type: paymentType,
    num_items: 1,
  });
}

/** Probe desativado — eventos reais vêm do paywall / CAPI. */
export function trackMetaTestCheckoutProbe() {
  // no-op
}

export function getMetaPixelId() {
  return PIXEL_ID;
}
