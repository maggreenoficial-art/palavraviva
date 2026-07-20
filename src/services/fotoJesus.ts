import Constants from 'expo-constants';

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

export type FotoJesusPrepareResult = {
  ok: true;
  generationId: string;
  inputUrl: string;
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
  error: string | null;
};

export async function prepareFotoJesus(input: {
  userId: string;
  imageBase64: string;
  mimeType?: string;
}): Promise<FotoJesusPrepareResult> {
  const base = paymentsBaseUrl();
  const response = await fetch(`${base}/api/foto-jesus/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: input.userId,
      imageBase64: input.imageBase64,
      mimeType: input.mimeType || 'image/jpeg',
    }),
  });
  const data = (await response.json()) as FotoJesusPrepareResult & {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Não foi possível enviar a foto.');
  }
  return data;
}

export async function fetchFotoJesusStatus(
  generationId: string,
  userId: string,
): Promise<FotoJesusStatusResult | null> {
  try {
    const base = paymentsBaseUrl();
    const response = await fetch(
      `${base}/api/foto-jesus/status?generationId=${encodeURIComponent(generationId)}&userId=${encodeURIComponent(userId)}`,
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
  generationId: string,
  userId: string,
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

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.cancelled) return null;
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.cancelled) return null;

    const status = await fetchFotoJesusStatus(generationId, userId);
    if (!status) continue;
    options?.onUpdate?.(status);

    if (status.status === 'success' || status.status === 'fail') {
      return status;
    }
    if (status.status === 'awaiting_payment') {
      // pagamento ainda não confirmado — continua um pouco
    }

    delay = Math.min(delay + 500, 8_000);
  }

  return null;
}
