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

/** Injeta o Meta Pixel uma vez (web). */
export function initMetaPixel() {
  if (!canUsePixel() || bootstrapped) return;
  bootstrapped = true;

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

  if (typeof window.fbq === 'function') {
    window.fbq('init', PIXEL_ID, advanced);
    window.fbq('track', 'PageView');
    return;
  }

  const f = window;
  const b = document;
  const e = 'script';
  const v = 'https://connect.facebook.net/en_US/fbevents.js';

  const n: ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push: unknown;
    loaded: boolean;
    version: string;
  } = function (...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod(...args);
    } else {
      n.queue.push(args);
    }
  } as typeof n;
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

  window.fbq?.('init', PIXEL_ID, advanced);
  window.fbq?.('track', 'PageView');
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
          typeof window !== 'undefined' ? window.location.href : undefined,
        userId,
        displayName,
        whatsapp,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
        customData: params || {},
      }),
      keepalive: true,
    });
  } catch {
    // CAPI nunca deve quebrar o app
  }
}

export function trackMetaPageView() {
  if (!canUsePixel()) return;
  initMetaPixel();
  const eventId = createEventId('PageView');
  window.fbq?.('track', 'PageView', {}, { eventID: eventId });
  void sendCapi('PageView', eventId);
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean>,
) {
  if (!canUsePixel()) return;
  initMetaPixel();
  const eventId = createEventId(event);
  if (params) {
    window.fbq?.('track', event, params, { eventID: eventId });
  } else {
    window.fbq?.('track', event, {}, { eventID: eventId });
  }
  void sendCapi(event, eventId, params);
}

export function getMetaPixelId() {
  return PIXEL_ID;
}
