import { Platform } from 'react-native';
import { useUserStore } from '../store/useUserStore';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID =
  (process.env.EXPO_PUBLIC_META_PIXEL_ID || '4474411989514975').trim();

let bootstrapped = false;

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
      return code;
    }
    return (window.sessionStorage.getItem('meta_test_event_code') || '').trim();
  } catch {
    return '';
  }
}

function readMetaTestEventCode() {
  return captureMetaTestEventCode();
}

function paymentsBaseUrl() {
  const fromEnv = (process.env.EXPO_PUBLIC_PAYMENTS_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
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
 * Browser + CAPI usam o mesmo event_id em trackMetaPageView / trackMetaEvent.
 */
export function initMetaPixel() {
  if (!canUsePixel() || bootstrapped) return;
  bootstrapped = true;

  const advanced = advancedMatching();

  if (typeof window.fbq === 'function') {
    callFbq('init', PIXEL_ID, advanced);
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
}

async function sendCapi(
  eventName: string,
  eventId: string,
  params?: Record<string, string | number | boolean>,
) {
  const base = paymentsBaseUrl();
  if (!base) return;

  const { userId, displayName, whatsapp } = useUserStore.getState();
  try {
    await fetch(`${base}/api/meta/capi`, {
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
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
        userAgent:
          typeof navigator !== 'undefined'
            ? navigator.userAgent
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        testEventCode: readMetaTestEventCode() || undefined,
        customData: params || {},
      }),
      keepalive: true,
    });
  } catch {
    // CAPI nunca deve quebrar o app
  }
}

export function trackMetaPageView() {
  if (Platform.OS !== 'web') return;
  captureMetaTestEventCode();
  const eventId = createEventId('PageView');
  void sendCapi('PageView', eventId);
  if (!canUsePixel()) return;
  initMetaPixel();
  // eventID compartilhado com CAPI = deduplicação no Events Manager
  callFbq('track', 'PageView', {}, { eventID: eventId });
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean>,
) {
  if (Platform.OS !== 'web') return;
  captureMetaTestEventCode();
  const eventId = createEventId(event);
  // CAPI primeiro (adblock não bloqueia nosso /api) — essencial na aba de teste
  void sendCapi(event, eventId, params);
  if (!canUsePixel()) return;
  initMetaPixel();
  if (params) {
    callFbq('track', event, params, { eventID: eventId });
  } else {
    callFbq('track', event, {}, { eventID: eventId });
  }
}

/**
 * Com ?test_event_code= na URL, dispara conversões pelo Pixel do navegador
 * (mesmo caminho do PageView que já aparece na aba Eventos de teste).
 * Assim dá para validar o Pixel sem depender do token CAPI.
 */
export function trackMetaTestCheckoutProbe() {
  if (Platform.OS !== 'web') return;
  const code = captureMetaTestEventCode();
  if (!code) return;
  try {
    if (window.sessionStorage.getItem('meta_test_probe_done') === '1') return;
    window.sessionStorage.setItem('meta_test_probe_done', '1');
  } catch {
    // segue mesmo se sessionStorage falhar
  }
  const params = {
    content_name: 'missao_plus',
    content_category: 'subscription',
    currency: 'BRL',
    value: 19.9,
    num_items: 1,
  };
  trackMetaEvent('ViewContent', params);
  trackMetaEvent('InitiateCheckout', params);
  trackMetaEvent('AddPaymentInfo', {
    ...params,
    payment_type: 'pix',
  });
}

export function getMetaPixelId() {
  return PIXEL_ID;
}
