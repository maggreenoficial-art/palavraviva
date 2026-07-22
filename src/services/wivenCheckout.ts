import { Platform } from 'react-native';
import { getTestEventCodeNow } from './metaPixel';
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
  meta?: {
    testEventCode?: string | null;
    initiateCheckout?: { ok?: boolean; skipped?: boolean; error?: string | null };
    addPaymentInfo?: { ok?: boolean; skipped?: boolean; error?: string | null };
  };
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
    const details = (data as { details?: unknown }).details;
    if (raw === 'not_found' || response.status === 404) {
      throw new Error(
        'API de pagamentos indisponível neste ambiente. Confira o deploy das rotas /api no Vercel.',
      );
    }
    if (/retentativ|excess(o|ive).*(attempt|retry|tentativ)|too many/i.test(raw)) {
      throw new Error(
        'Cartão temporariamente bloqueado após várias tentativas. Aguarde 15–30 min ou pague com Pix agora.',
      );
    }
    if (details && /inválidos|invalidos/i.test(raw)) {
      const hint = summarizeCheckoutDetails(details);
      throw new Error(hint || raw);
    }
    throw new Error(raw || 'Não foi possível processar o pagamento.');
  }
  return data;
}

function summarizeCheckoutDetails(details: unknown): string {
  const messages: string[] = [];
  const walk = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object') return;
    const item = node as { message?: string; path?: string[] };
    if (typeof item.message === 'string') {
      if (/phone/i.test(item.message)) messages.push('Telefone inválido');
      else if (/zip/i.test(item.message)) messages.push('CEP inválido');
      else if (/name/i.test(item.message)) messages.push('Nome inválido');
      else if (/number|amount|price/i.test(item.message))
        messages.push('Valor inválido');
      else messages.push(item.message);
    }
    walk((node as { issues?: unknown }).issues);
    walk((node as { unionErrors?: unknown }).unionErrors);
  };
  walk(details);
  return [...new Set(messages)].slice(0, 2).join(' · ');
}

function readMetaClickIds() {
  if (typeof window === 'undefined') return { fbp: '', fbc: '' };
  try {
    const read = (name: string) => {
      const match = document.cookie.match(
        new RegExp(`(?:^|; )${name}=([^;]*)`),
      );
      return match ? decodeURIComponent(match[1]) : '';
    };
    let fbp = read('_fbp');
    let fbc = read('_fbc');
    if (!fbc) fbc = (window.sessionStorage.getItem('meta_fbc') || '').trim();
    const builder = (
      window as Window & {
        clientParamBuilder?: { getFbc?: () => string | null; getFbp?: () => string | null };
      }
    ).clientParamBuilder;
    if (builder?.getFbp?.()) fbp = builder.getFbp() || fbp;
    if (builder?.getFbc?.()) fbc = builder.getFbc() || fbc;
    return { fbp, fbc };
  } catch {
    return { fbp: '', fbc: '' };
  }
}

/** Mesma fonte do metaPixel (URL + sessionStorage na mesma aba). */
function readMetaTestEventCode() {
  return getTestEventCodeNow();
}

/** URL limpa para CAPI de produção (sem ?test_event_code=). */
function metaEventSourceUrl() {
  if (typeof window === 'undefined') return undefined;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('test_event_code');
    url.searchParams.delete('testEventCode');
    url.searchParams.delete('clear_test_event');
    url.searchParams.delete('clearTestEvent');
    return url.toString();
  } catch {
    return window.location.href;
  }
}

export async function payWithCard(
  input: CardCheckoutInput,
): Promise<CardCheckoutResult> {
  const clickIds = readMetaClickIds();
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
    eventSourceUrl: metaEventSourceUrl(),
    testEventCode: readMetaTestEventCode() || undefined,
    fbp: clickIds.fbp || undefined,
    fbc: clickIds.fbc || undefined,
  });
}

export async function payWithPix(
  input: PixCheckoutInput,
): Promise<PixCheckoutResult> {
  const clickIds = readMetaClickIds();
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
    eventSourceUrl: metaEventSourceUrl(),
    testEventCode: readMetaTestEventCode() || undefined,
    fbp: clickIds.fbp || undefined,
    fbc: clickIds.fbc || undefined,
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

export function isValidCpf(value: string) {
  const d = value.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(d[i]) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== Number(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(d[i]) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === Number(d[10]);
}
