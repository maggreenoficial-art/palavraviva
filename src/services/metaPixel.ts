import { Platform } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { paymentsBaseUrl } from './paymentsUrl';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
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

let bootstrapped = false;
let clickIdsReady: Promise<void> | null = null;

function canUsePixel() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && Boolean(PIXEL_ID);
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
      const existingClick = existing ? existing.split('.').slice(3).join('.') : '';
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
 * Só na URL ou sessionStorage (mesma aba / SPA). NÃO usa localStorage —
 * senão um único teste deixa o browser mandando test_event_code para sempre
 * e o Ads Manager não libera objetivos de conversão.
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
        // Limpa legado que prendia o browser em modo teste
        window.localStorage.removeItem('meta_test_event_code');
      } catch {
        // ignore
      }
      return fromQuery;
    }

    // Sem param na URL: produção. Não herdar localStorage antigo.
    try {
      window.localStorage.removeItem('meta_test_event_code');
    } catch {
      // ignore
    }

    return (
      window.sessionStorage.getItem('meta_test_event_code') || ''
    ).trim();
  } catch {
    return '';
  }
}

/** @deprecated use getTestEventCodeNow — mantido para imports existentes */
export function captureMetaTestEventCode() {
  const code = getTestEventCodeNow();
  if (code) applyPixelTestEventCode(code);
  return code;
}

/** Faz o Pixel do navegador marcar eventos na aba Eventos de teste. */
function applyPixelTestEventCode(code?: string) {
  const resolved = (code || getTestEventCodeNow()).trim();
  if (!resolved || typeof window === 'undefined') return '';
  try {
    callFbq('set', 'test_event_code', resolved);
  } catch {
    // fbq pode ainda não existir
  }
  return resolved;
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
  if (!testCode && detail.stage !== 'capi_response' && detail.stage !== 'capi_error') {
    return;
  }
  console.info('[meta-checkout]', event, detail);
  if (testCode && detail.stage === 'track_start') {
    console.warn(
      '[meta-checkout] Modo TESTE ativo (' +
        testCode +
        '). Isso aparece no console e em Eventos de teste, ' +
        'mas NÃO libera objetivo no Gerenciador de Anúncios. ' +
        'Para liberar: abra o site SEM ?test_event_code= (ou com ?clear_test_event=1) e gere o Pix de novo.',
    );
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { fn: '', ln: '' };
  if (parts.length === 1) return { fn: parts[0], ln: '' };
  return { fn: parts[0], ln: parts.slice(1).join(' ') };
}

function advancedMatching() {
  const { userId, displayName, whatsapp } = useUserStore.getState();
  const { fn, ln } = splitName(displayName || '');
  const advanced: Record<string, string> = { country: 'br' };
  if (userId) advanced.external_id = userId;
  if (fn) advanced.fn = fn.toLowerCase();
  if (ln) advanced.ln = ln.toLowerCase();
  if (whatsapp) {
    const digits = whatsapp.replace(/\D/g, '');
    advanced.ph = digits.startsWith('55') ? digits : `55${digits}`;
  }
  return advanced;
}

function callFbq(...args: unknown[]) {
  const fbq = window.fbq as ((...a: unknown[]) => void) | undefined;
  if (typeof fbq === 'function') fbq(...args);
}

/**
 * Injeta o Meta Pixel uma vez (web).
 * NÃO dispara PageView aqui — evita triplicar com index.html + trackMetaPageView.
 */
export function initMetaPixel() {
  if (!canUsePixel() || bootstrapped) return;
  bootstrapped = true;
  void ensureMetaClickIds();

  const advanced = advancedMatching();

  if (typeof window.fbq === 'function') {
    // index.html já fez init — não reinicializar (resetaria test_event_code)
    applyPixelTestEventCode();
    return;
  }

  const f = window;
  const b = document;
  const e = 'script';
  const v = 'https://connect.facebook.net/en_US/fbevents.js';

  type FbqFn = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push: (...args: unknown[]) => void;
    loaded: boolean;
    version: string;
  };

  const n = function (...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod(...args);
    } else {
      n.queue.push(args);
    }
  } as FbqFn;
  if (!f._fbq) f._fbq = n;
  f.fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  const t = b.createElement(e) as HTMLScriptElement;
  t.async = true;
  t.src = v;
  const s = b.getElementsByTagName(e)[0];
  s?.parentNode?.insertBefore(t, s);

  callFbq('init', PIXEL_ID, advanced);
  const testCode = captureMetaTestEventCode();
  if (testCode) callFbq('set', 'test_event_code', testCode);
}

/** Endpoint CAPI: em web online sempre same-origin (evita localhost do bundle). */
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
  // Releia no instante do POST (URL pode ter mudado)
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
  if (Platform.OS !== 'web') return;
  persistMetaTestEventCodeInUrl();
  const testCode = getTestEventCodeNow();
  const eventId = createEventId('PageView');
  const capiId = testCode ? `${eventId}_srv` : eventId;
  if (!canUsePixel()) {
    void sendCapi('PageView', capiId);
    return;
  }
  initMetaPixel();
  if (testCode) applyPixelTestEventCode(testCode);
  callFbq('track', 'PageView', {}, { eventID: eventId });
  void sendCapi('PageView', capiId);
}

/** Params seguros para o Pixel (sem arrays). */
function toPixelParams(
  params?: Record<string, string | number | boolean | string[]>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (key === 'content_ids' && value[0] != null) {
        out.content_name = out.content_name ?? String(value[0]);
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  if (Platform.OS !== 'web') return;
  persistMetaTestEventCodeInUrl();
  // Sempre relê da URL no instante do disparo
  const testCode = getTestEventCodeNow();
  const eventId = createEventId(event);
  const capiId = testCode ? `${eventId}_srv` : eventId;
  const pixelParams = toPixelParams(params);

  debugMetaCheckout(event, {
    stage: 'track_start',
    eventId,
    capiId,
    testEventCode: testCode || null,
    href:
      typeof window !== 'undefined' ? window.location.href : null,
    pixelParams,
  });

  if (canUsePixel()) {
    initMetaPixel();
    // Obrigatório: set test_event_code imediatamente antes do track
    if (testCode) {
      callFbq('set', 'test_event_code', testCode);
    }
    callFbq('track', event, pixelParams, { eventID: eventId });
    debugMetaCheckout(event, {
      stage: 'pixel_tracked',
      eventId,
      testEventCode: testCode || null,
    });
  } else {
    debugMetaCheckout(event, { stage: 'pixel_skip', reason: 'canUsePixel_false' });
  }
  void sendCapi(event, capiId, params);
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

/**
 * Com ?test_event_code= — não dispara ViewContent (confundia com checkout).
 * Mantido só para debug manual se precisar.
 */
export function trackMetaTestCheckoutProbe() {
  if (Platform.OS !== 'web') return;
  const code = captureMetaTestEventCode();
  if (!code) return;
  try {
    if (window.sessionStorage.getItem('meta_test_probe_v3') === '1') return;
    window.sessionStorage.setItem('meta_test_probe_v3', '1');
  } catch {
    // ignore
  }
  // Probe desativado automaticamente — eventos reais vêm do paywall.
}

export function getMetaPixelId() {
  return PIXEL_ID;
}
