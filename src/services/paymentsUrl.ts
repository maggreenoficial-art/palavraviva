import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolve a base URL do servidor de pagamentos.
 * - Dev local: EXPO_PUBLIC_PAYMENTS_URL ou localhost:8788
 * - Web online (Vercel): mesmo domínio (/api/...), evita Failed to fetch em localhost
 */
export function paymentsBaseUrl() {
  const fromExtra = (
    Constants.expoConfig?.extra as { paymentsUrl?: string } | undefined
  )?.paymentsUrl;
  const fromEnv = (process.env.EXPO_PUBLIC_PAYMENTS_URL || '').trim();

  // Em web de produção, preferir same-origin (API no Vercel).
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host === '';
    if (!isLocal) {
      // Se env aponta explicitamente para HTTPS remoto, respeita.
      if (fromEnv && /^https:\/\//i.test(fromEnv) && !/localhost/i.test(fromEnv)) {
        return fromEnv.replace(/\/$/, '');
      }
      return window.location.origin.replace(/\/$/, '');
    }
  }

  const base = (
    fromEnv ||
    fromExtra ||
    'http://localhost:8788'
  ).replace(/\/$/, '');

  if (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    base.startsWith('http://') &&
    !/localhost|127\.0\.0\.1/i.test(base)
  ) {
    console.warn(
      '[pagamentos] EXPO_PUBLIC_PAYMENTS_URL deveria usar HTTPS em produção.',
    );
  }

  return base;
}
