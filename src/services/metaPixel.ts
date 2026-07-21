import { Platform } from 'react-native';

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

/** Injeta o Meta Pixel uma vez (web). */
export function initMetaPixel() {
  if (!canUsePixel() || bootstrapped) return;
  bootstrapped = true;

  if (typeof window.fbq === 'function') {
    window.fbq('init', PIXEL_ID);
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

  window.fbq?.('init', PIXEL_ID);
  window.fbq?.('track', 'PageView');
}

export function trackMetaPageView() {
  if (!canUsePixel()) return;
  initMetaPixel();
  window.fbq?.('track', 'PageView');
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, string | number | boolean>,
) {
  if (!canUsePixel()) return;
  initMetaPixel();
  if (params) {
    window.fbq?.('track', event, params);
  } else {
    window.fbq?.('track', event);
  }
}

export function getMetaPixelId() {
  return PIXEL_ID;
}
