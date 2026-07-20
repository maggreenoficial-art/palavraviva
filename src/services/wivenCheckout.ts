import { Platform } from 'react-native';
import { paymentsBaseUrl } from './paymentsUrl';

export type CardCheckoutInput = {
  userId: string;
  displayName?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document: string;
  /** Ex.: tool-diario | tool-foto-jesus — omite = assinatura Missão+ */
  product?: string | null;
  /** Obrigatório para tool-foto-jesus */
  generationId?: string | null;
  inputUrl?: string | null;
  generationToken?: string | null;
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
  generationId?: string | null;
  inputUrl?: string | null;
  generationToken?: string | null;
};

export type CardCheckoutResult = {
  ok: true;
  approved: boolean;
  status: string | null;
  checkoutId: string;
  subscriptionExpiresAt: string | null;
  unlockedTools?: string[];
  generationId?: string | null;
  generationStatus?: string | null;
  kieTaskId?: string | null;
  resultUrl?: string | null;
};

export type PixCheckoutResult = {
  ok: true;
  checkoutId: string;
  transactionId?: string | null;
  identifier?: string | null;
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
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor de pagamentos. Verifique sua conexão e tente de novo.',
    );
  }

  const rawText = await response.text();
  let data: T & { ok?: boolean; error?: string };
  try {
    data = JSON.parse(rawText) as T & { ok?: boolean; error?: string };
  } catch {
    throw new Error(
      response.status === 404
        ? 'Rota de pagamento indisponível no servidor. Aguarde o deploy e tente de novo.'
        : `Servidor de pagamento respondeu de forma inesperada (${response.status}). Tente novamente.`,
    );
  }

  if (!response.ok || !data.ok) {
    const raw = (data as { error?: string }).error || '';
    if (raw === 'not_found' || response.status === 404) {
      throw new Error(
        'API de pagamentos indisponível neste ambiente. Confira o deploy das rotas /api no Vercel.',
      );
    }
    throw new Error(raw || 'Não foi possível processar o pagamento.');
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
    generationId: input.generationId ?? null,
    inputUrl: input.inputUrl ?? null,
    generationToken: input.generationToken ?? null,
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
    generationId: input.generationId ?? null,
    inputUrl: input.inputUrl ?? null,
    generationToken: input.generationToken ?? null,
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
