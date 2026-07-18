import { Platform } from 'react-native';
import Constants from 'expo-constants';

function paymentsBaseUrl() {
  const fromExtra = (
    Constants.expoConfig?.extra as { paymentsUrl?: string } | undefined
  )?.paymentsUrl;
  const base = (
    process.env.EXPO_PUBLIC_PAYMENTS_URL ||
    fromExtra ||
    'http://localhost:8788'
  ).replace(/\/$/, '');

  // Em builds de produção web, preferir HTTPS (webhook Wiven exige URL pública).
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

export type CardCheckoutInput = {
  userId: string;
  displayName?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document: string;
  /** Ex.: tool-diario — omite = assinatura Missão+ */
  product?: string | null;
  card: {
    number: string;
    owner: string;
    expiresAt: string;
    cvv: string;
  };
};

export type PixCheckoutInput = {
  userId: string;
  displayName?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document: string;
  product?: string | null;
};

export type CardCheckoutResult = {
  ok: true;
  approved: boolean;
  status: string | null;
  checkoutId: string;
  subscriptionExpiresAt: string | null;
  unlockedTools?: string[];
};

export type PixCheckoutResult = {
  ok: true;
  checkoutId: string;
  pixCode: string | null;
  pixImage: string | null;
};

export type AccessStatus = {
  active: boolean;
  subscriptionExpiresAt: string | null;
  unlockedTools: string[];
};

async function postCheckout<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const base = paymentsBaseUrl();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || !data.ok) {
    throw new Error(
      (data as { error?: string }).error ||
        'Não foi possível processar o pagamento.',
    );
  }
  return data;
}

export async function payWithCard(
  input: CardCheckoutInput,
): Promise<CardCheckoutResult> {
  return postCheckout<CardCheckoutResult>('/api/checkout/card', {
    method: 'card',
    userId: input.userId,
    displayName: input.displayName ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    document: input.document,
    product: input.product ?? null,
    card: input.card,
    clientIp: Platform.OS === 'web' ? undefined : '127.0.0.1',
  });
}

export async function payWithPix(
  input: PixCheckoutInput,
): Promise<PixCheckoutResult> {
  return postCheckout<PixCheckoutResult>('/api/checkout/pix', {
    method: 'pix',
    userId: input.userId,
    displayName: input.displayName ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    document: input.document,
    product: input.product ?? null,
  });
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
      unlockedTools?: string[];
    };
    return {
      active: Boolean(data.active),
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      unlockedTools: Array.isArray(data.unlockedTools)
        ? data.unlockedTools.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export async function syncToolAccess(
  userId: string,
  toolId: string,
  applyTools: (tools: string[]) => void,
): Promise<boolean> {
  const status = await fetchAccessStatus(userId);
  if (!status) return false;
  if (status.unlockedTools.length) {
    applyTools(status.unlockedTools);
  }
  return status.unlockedTools.includes(toolId);
}

export async function pollToolAccess(
  userId: string,
  toolId: string,
  applyTools: (tools: string[]) => void,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    signal?: { cancelled: boolean };
  },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? 48;
  const signal = options?.signal;
  let delay = options?.initialDelayMs ?? 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.cancelled) return false;
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.cancelled) return false;

    const unlocked = await syncToolAccess(userId, toolId, applyTools);
    if (unlocked) return true;

    delay = Math.min(delay + 500, 10_000);
  }

  return false;
}

export async function syncSubscriptionAccess(
  userId: string,
  applyExpiresAt: (expiresAt: string) => void,
): Promise<boolean> {
  const status = await fetchAccessStatus(userId);
  if (!status?.active || !status.subscriptionExpiresAt) return false;
  applyExpiresAt(status.subscriptionExpiresAt);
  return true;
}

/**
 * Polling de Pix com backoff leve (não martela o servidor).
 * Retorna true quando a assinatura ficar ativa.
 */
export async function pollSubscriptionAccess(
  userId: string,
  applyExpiresAt: (expiresAt: string) => void,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    signal?: { cancelled: boolean };
  },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? 48; // ~4–6 min
  const signal = options?.signal;
  let delay = options?.initialDelayMs ?? 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.cancelled) return false;
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.cancelled) return false;

    const unlocked = await syncSubscriptionAccess(userId, applyExpiresAt);
    if (unlocked) return true;

    delay = Math.min(delay + 500, 10_000);
  }

  return false;
}

export function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
