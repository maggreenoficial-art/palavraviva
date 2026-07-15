import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

function paymentsBaseUrl() {
  const fromExtra = (
    Constants.expoConfig?.extra as { paymentsUrl?: string } | undefined
  )?.paymentsUrl;
  return (
    process.env.EXPO_PUBLIC_PAYMENTS_URL ||
    fromExtra ||
    'http://localhost:8788'
  ).replace(/\/$/, '');
}

export type CheckoutSession = {
  checkoutId: string;
  checkoutUrl: string;
};

export type AccessStatus = {
  active: boolean;
  subscriptionExpiresAt: string | null;
};

export async function createWivenCheckout(input: {
  userId: string;
  displayName?: string | null;
  whatsapp?: string | null;
}): Promise<CheckoutSession> {
  const base = paymentsBaseUrl();
  const response = await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: input.userId,
      displayName: input.displayName ?? null,
      whatsapp: input.whatsapp ?? null,
    }),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    checkoutId?: string;
    checkoutUrl?: string;
    error?: string;
  };

  if (!response.ok || !data.ok || !data.checkoutUrl || !data.checkoutId) {
    throw new Error(data.error || 'Não foi possível iniciar o checkout.');
  }

  return {
    checkoutId: data.checkoutId,
    checkoutUrl: data.checkoutUrl,
  };
}

export async function openWivenCheckout(checkoutUrl: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }
    return { type: 'opened' as const };
  }

  try {
    const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
      enableDefaultShareMenuItem: false,
      showTitle: true,
    });
    return result;
  } catch {
    await Linking.openURL(checkoutUrl);
    return { type: 'opened' as const };
  }
}

export async function fetchAccessStatus(
  userId: string,
): Promise<AccessStatus | null> {
  try {
    const base = paymentsBaseUrl();
    const response = await fetch(
      `${base}/api/access?userId=${encodeURIComponent(userId)}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      active?: boolean;
      subscriptionExpiresAt?: string | null;
    };
    return {
      active: Boolean(data.active),
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
    };
  } catch {
    return null;
  }
}

/** Sincroniza a assinatura local com o servidor (após checkout/webhook). */
export async function syncSubscriptionAccess(
  userId: string,
  applyExpiresAt: (expiresAt: string) => void,
): Promise<boolean> {
  const status = await fetchAccessStatus(userId);
  if (!status?.active || !status.subscriptionExpiresAt) return false;
  applyExpiresAt(status.subscriptionExpiresAt);
  return true;
}
