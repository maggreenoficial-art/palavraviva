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

/** Código da aba Eventos de teste (?test_event_code=TEST94275). */
export function captureMetaTestEventCode() {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery =
      params.get('test_event_code') || params.get('testEventCode');
    if (fromQuery?.trim()) {
      const code = fromQuery.trim();
      window.sessionStorage.setItem('meta_test_event_code', code);
      try {
        window.localStorage.setItem('meta_test_event_code', code);
      } catch {
        // ignore
      }
      applyPixelTestEventCode(code);
      return code;
    }
    const fromSession = (
      window.sessionStorage.getItem('meta_test_event_code') || ''
    ).trim();
    const fromLocal = (
      window.localStorage.getItem('meta_test_event_code') || ''
    ).trim();
    const code = fromSession || fromLocal;
    if (code) {
      window.sessionStorage.setItem('meta_test_event_code', code);
      applyPixelTestEventCode(code);
    }
    return code;
  } catch {
    return '';
  }
}

/** Faz o Pixel do navegador marcar eventos na aba Eventos de teste. */
function applyPixelTestEventCode(code?: string) {
  const resolved = (code || captureMetaTestEventCode()).trim();
  if (!resolved || typeof window === 'undefined') return '';
  try {
    callFbq('set', 'test_event_code', resolved);
  } catch {
    // fbq pode ainda não existir — initMetaPixel reaplica
  }
  return resolved;
}

/** Mantém ?test_event_code= na URL ao navegar (SPA), senão a aba de teste perde o vínculo. */
export function persistMetaTestEventCodeInUrl() {
  if (typeof window === 'undefined') return;
  const code = captureMetaTestEventCode();
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

function readMetaTestEventCode() {
  return captureMetaTestEventCode();
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

async function sendCapi(
  eventName: string,
  eventId: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  const base = paymentsBaseUrl();
  if (!base) return;

  try {
    await ensureMetaClickIds();
  } catch {
    // segue sem Parameter Builder
  }

  const { fbp, fbc } = getMetaClickIds();
  const { userId, displayName, whatsapp } = useUserStore.getState();
  const testEventCode = readMetaTestEventCode() || undefined;
  try {
    const res = await fetch(`${base}/api/meta/capi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });
    if (testEventCode && typeof console !== 'undefined' && !res.ok) {
      console.warn('[meta-capi]', eventName, res.status, await res.text());
    }
  } catch (err) {
    if (testEventCode && typeof console !== 'undefined') {
      console.warn('[meta-capi]', eventName, err);
    }
  }
}

export function trackMetaPageView() {
  if (Platform.OS !== 'web') return;
  captureMetaTestEventCode();
  persistMetaTestEventCodeInUrl();
  void ensureMetaClickIds();
  const eventId = createEventId('PageView');
  const testCode = readMetaTestEventCode();
  // Em teste: event_id diferente no CAPI para a aba mostrar Servidor (não só Desduplicado)
  const capiId = testCode ? `${eventId}_srv` : eventId;
  void sendCapi('PageView', capiId);
  if (!canUsePixel()) return;
  initMetaPixel();
  applyPixelTestEventCode();
  callFbq('track', 'PageView', {}, { eventID: eventId });
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean | string[]>,
) {
  if (Platform.OS !== 'web') return;
  captureMetaTestEventCode();
  persistMetaTestEventCodeInUrl();
  void ensureMetaClickIds();
  const eventId = createEventId(event);
  const testCode = readMetaTestEventCode();
  // Produção: mesmo event_id (dedup). Teste: sufixo _srv para aparecer como Servidor.
  const capiId = testCode ? `${eventId}_srv` : eventId;
  void sendCapi(event, capiId, params);
  if (!canUsePixel()) return;
  initMetaPixel();
  applyPixelTestEventCode();
  const pixelParams: Record<string, unknown> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (key === 'content_ids' && Array.isArray(value)) {
        pixelParams[key] = value.map(String);
      } else {
        pixelParams[key] = value;
      }
    }
  }
  if (Object.keys(pixelParams).length) {
    callFbq('track', event, pixelParams, { eventID: eventId });
  } else {
    callFbq('track', event, {}, { eventID: eventId });
  }
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
