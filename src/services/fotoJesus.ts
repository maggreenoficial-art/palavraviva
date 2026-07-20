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

export type FotoJesusStatusResult = {
  ok: true;
  generationId: string;
  status: FotoJesusStatus;
  resultUrl: string | null;
  kieTaskId: string | null;
  error: string | null;
};

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
  const data = (await response.json()) as FotoJesusPrepareResult & {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || !data.ok) {
    const raw = data.error || '';
    if (raw === 'not_found' || response.status === 404) {
      throw new Error(
        'API de pagamentos indisponível. Faça o deploy das rotas /api no Vercel com as chaves Wiven e Kie.',
      );
    }
    throw new Error(raw || 'Não foi possível enviar a foto.');
  }
  return data;
}

export async function fetchFotoJesusStatus(input: {
  generationId: string;
  userId: string;
  inputUrl?: string | null;
  token?: string | null;
  kieTaskId?: string | null;
}): Promise<FotoJesusStatusResult | null> {
  try {
    const base = paymentsBaseUrl();
    const params = new URLSearchParams({
      generationId: input.generationId,
      userId: input.userId,
    });
    if (input.inputUrl) params.set('inputUrl', input.inputUrl);
    if (input.token) params.set('token', input.token);
    if (input.kieTaskId) params.set('kieTaskId', input.kieTaskId);

    const response = await fetch(
      `${base}/api/foto-jesus/status?${params.toString()}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as FotoJesusStatusResult & {
      ok?: boolean;
    };
    if (!data.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export async function pollFotoJesusResult(
  input: {
    generationId: string;
    userId: string;
    inputUrl?: string | null;
    token?: string | null;
    kieTaskId?: string | null;
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

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.cancelled) return null;
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.cancelled) return null;

    const status = await fetchFotoJesusStatus({
      ...input,
      kieTaskId,
    });
    if (!status) continue;
    if (status.kieTaskId) kieTaskId = status.kieTaskId;
    options?.onUpdate?.(status);

    if (status.status === 'success' || status.status === 'fail') {
      return status;
    }

    delay = Math.min(delay + 500, 8_000);
  }

  return null;
}
