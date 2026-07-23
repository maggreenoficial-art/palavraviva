import { paymentsBaseUrl } from './paymentsUrl';

export type FotoJesusPrepareResult = {
  ok: true;
  generationId: string;
  inputUrl: string;
  token: string;
};

export type FotoJesusStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'generating'
  | 'success'
  | 'fail';

export type FotoJesusPaymentCheck = {
  transactionId?: string;
  wivenStatus?: string | null;
  paid?: boolean;
  payedAt?: string | null;
  error?: string;
  hint?: string;
};

export type FotoJesusStatusResult = {
  ok: true;
  generationId: string;
  status: FotoJesusStatus;
  resultUrl: string | null;
  kieTaskId: string | null;
  error: string | null;
  paymentCheck?: FotoJesusPaymentCheck | null;
};

/** Evita várias criações Kie em paralelo (reload / Já paguei / poll). */
const startLocks = new Map<string, Promise<FotoJesusStatusResult | null>>();

export async function prepareFotoJesus(input: {
  userId: string;
  imageBase64: string;
  mimeType?: string;
}): Promise<FotoJesusPrepareResult> {
  const base = paymentsBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/api/foto-jesus/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: input.userId,
        imageBase64: input.imageBase64,
        mimeType: input.mimeType || 'image/jpeg',
      }),
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. No site online, confirme se as rotas /api estão no ar.',
    );
  }

  const rawText = await response.text();
  let data: FotoJesusPrepareResult & { ok?: boolean; error?: string };
  try {
    data = JSON.parse(rawText) as FotoJesusPrepareResult & {
      ok?: boolean;
      error?: string;
    };
  } catch {
    if (response.status === 413) {
      throw new Error(
        'Foto muito grande para o servidor. Escolha outra ou recorte mais perto e tente de novo.',
      );
    }
    throw new Error(
      response.status === 404
        ? 'Rota de geração indisponível no servidor. Aguarde o deploy e tente de novo.'
        : `Servidor respondeu de forma inesperada (${response.status}). Tente novamente em instantes.`,
    );
  }

  if (!response.ok || !data.ok) {
    if (response.status === 413) {
      throw new Error(
        'Foto muito grande para o servidor. Escolha outra ou recorte mais perto e tente de novo.',
      );
    }
    const raw = data.error || '';
    if (raw === 'not_found' || response.status === 404) {
      throw new Error(
        'API de pagamentos indisponível. Confira o deploy das rotas /api no Vercel com as chaves Wiven e Kie.',
      );
    }
    throw new Error(raw || 'Não foi possível enviar a foto.');
  }
  return data;
}

function collectTransactionIds(
  transactionId?: string | null,
  transactionIds?: string[] | null,
): string[] {
  return [
    ...(Array.isArray(transactionIds) ? transactionIds : []),
    ...(transactionId ? [transactionId] : []),
  ].filter((id, i, arr) => Boolean(id) && arr.indexOf(id) === i);
}

export async function fetchFotoJesusStatus(input: {
  generationId: string;
  userId: string;
  inputUrl?: string | null;
  token?: string | null;
  kieTaskId?: string | null;
  transactionId?: string | null;
  transactionIds?: string[] | null;
  clientIdentifier?: string | null;
  /** true = pode criar 1 job Kie se pago e ainda não houver kieTaskId */
  startGeneration?: boolean;
}): Promise<FotoJesusStatusResult | null> {
  try {
    const base = paymentsBaseUrl();
    const ids = collectTransactionIds(
      input.transactionId,
      input.transactionIds,
    );
    const response = await fetch(`${base}/api/foto-jesus/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationId: input.generationId,
        userId: input.userId,
        inputUrl: input.inputUrl || null,
        token: input.token || null,
        kieTaskId: input.kieTaskId || null,
        transactionId: input.transactionId || ids[0] || null,
        transactionIds: ids,
        clientIdentifier: input.clientIdentifier || null,
        startGeneration: Boolean(input.startGeneration) && !input.kieTaskId,
      }),
    });
    const rawText = await response.text();
    let data: FotoJesusStatusResult & { ok?: boolean; error?: string };
    try {
      data = JSON.parse(rawText) as FotoJesusStatusResult & {
        ok?: boolean;
        error?: string;
      };
    } catch {
      return null;
    }
    if (!response.ok || !data.ok) {
      if (typeof console !== 'undefined' && data?.error) {
        console.warn('[foto-jesus/status]', data.error, data);
      }
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Confirma pagamento e inicia geração Kie (botão "Já paguei").
 */
export async function confirmFotoJesusPayment(input: {
  generationId: string;
  userId: string;
  inputUrl?: string | null;
  token?: string | null;
  transactionId?: string | null;
  transactionIds?: string[] | null;
  clientIdentifier?: string | null;
  kieTaskId?: string | null;
}): Promise<FotoJesusStatusResult | null> {
  return fetchFotoJesusStatus({
    ...input,
    startGeneration: true,
  });
}

/**
 * Confirma pagamento SEM criar job na Kie.
 */
export async function checkFotoJesusPayment(input: {
  generationId: string;
  userId: string;
  inputUrl?: string | null;
  token?: string | null;
  transactionId?: string | null;
  transactionIds?: string[] | null;
  clientIdentifier?: string | null;
  kieTaskId?: string | null;
}): Promise<FotoJesusStatusResult | null> {
  return fetchFotoJesusStatus({
    ...input,
    startGeneration: false,
  });
}

/**
 * Inicia a geração Kie no máximo 1 vez por generationId (mutex no cliente).
 * Se já houver kieTaskId, só consulta o status.
 */
export async function startFotoJesusGenerationOnce(input: {
  generationId: string;
  userId: string;
  inputUrl?: string | null;
  token?: string | null;
  transactionId?: string | null;
  transactionIds?: string[] | null;
  clientIdentifier?: string | null;
  kieTaskId?: string | null;
}): Promise<FotoJesusStatusResult | null> {
  if (input.kieTaskId) {
    return fetchFotoJesusStatus({
      ...input,
      startGeneration: false,
    });
  }

  const key = input.generationId;
  const existing = startLocks.get(key);
  if (existing) return existing;

  const promise = fetchFotoJesusStatus({
    ...input,
    startGeneration: true,
  }).finally(() => {
    startLocks.delete(key);
  });
  startLocks.set(key, promise);
  return promise;
}

export async function pollFotoJesusResult(
  input: {
    generationId: string;
    userId: string;
    inputUrl?: string | null;
    token?: string | null;
    kieTaskId?: string | null;
    transactionId?: string | null;
    transactionIds?: string[] | null;
    clientIdentifier?: string | null;
  },
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    signal?: { cancelled: boolean };
    onUpdate?: (status: FotoJesusStatusResult) => void;
  },
): Promise<FotoJesusStatusResult | null> {
  const maxAttempts = options?.maxAttempts ?? 60;
  const signal = options?.signal;
  let delay = options?.initialDelayMs ?? 3000;
  let kieTaskId = input.kieTaskId ?? null;
  let last: FotoJesusStatusResult | null = null;

  if (!kieTaskId) {
    const started = await startFotoJesusGenerationOnce(input);
    if (started) {
      last = started;
      options?.onUpdate?.(started);
      if (started.kieTaskId) kieTaskId = started.kieTaskId;
      if (started.status === 'success' || started.status === 'fail') {
        return started;
      }
      if (started.status === 'awaiting_payment') {
        return started;
      }
    }
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.cancelled) return last;
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.cancelled) return last;

    const status = await fetchFotoJesusStatus({
      ...input,
      kieTaskId,
      startGeneration: false,
    });
    if (!status) {
      delay = Math.min(delay + 500, 8_000);
      continue;
    }
    if (status.kieTaskId) kieTaskId = status.kieTaskId;
    last = status;
    options?.onUpdate?.(status);

    if (status.status === 'success' || status.status === 'fail') {
      return status;
    }

    delay = Math.min(delay + 500, 8_000);
  }

  return last;
}
