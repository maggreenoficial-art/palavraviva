import { Platform } from 'react-native';
import { paymentsBaseUrl } from './paymentsUrl';
import { useUserStore } from '../store/useUserStore';

export function sessionMediaId(sessionId: string) {
  return `session/${sessionId}`;
}

export function ambientMediaId(sessionId: string) {
  return `ambient/${sessionId}`;
}

export function otMediaId(otId: string) {
  return `ot/${otId}`;
}

export function bibliaMediaId(passageId: string) {
  return `biblia/${passageId}`;
}

export function isMediaId(source: unknown): source is string {
  return typeof source === 'string' && source.startsWith('media:');
}

/** Converte fonte legada `media:xyz` ou id puro. */
export function normalizeMediaId(source: string) {
  return source.startsWith('media:') ? source.slice('media:'.length) : source;
}

type TokenCache = {
  streamUrl: string;
  expiresAtMs: number;
};

const tokenCache = new Map<string, TokenCache>();

/**
 * Pede URL assinada de curta duração para streaming.
 * Em falha de rede no nativo, o caller pode cair no require local.
 */
export async function fetchSignedStreamUrl(mediaId: string): Promise<string> {
  const id = normalizeMediaId(mediaId);
  const cached = tokenCache.get(id);
  if (cached && cached.expiresAtMs > Date.now() + 15_000) {
    return cached.streamUrl;
  }

  const userId = useUserStore.getState().userId;
  const trialStartedAt = useUserStore.getState().trialStartedAt;
  if (!userId) {
    throw new Error('Faça o onboarding para ouvir o áudio.');
  }

  const base = paymentsBaseUrl();
  const response = await fetch(`${base}/api/media/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      mediaId: id,
      trialStartedAt,
    }),
  });

  const raw = await response.text();
  let data: {
    ok?: boolean;
    streamUrl?: string;
    expiresAt?: string;
    error?: string;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error('Servidor de áudio respondeu de forma inesperada.');
  }

  if (!response.ok || !data.ok || !data.streamUrl) {
    if (data.error === 'subscription_required' || data.error === 'ot_locked') {
      throw new Error('Este áudio faz parte da Missão+.');
    }
    throw new Error(data.error || 'Não foi possível liberar o áudio.');
  }

  const expiresAtMs = data.expiresAt
    ? Date.parse(data.expiresAt)
    : Date.now() + 120_000;
  tokenCache.set(id, { streamUrl: data.streamUrl, expiresAtMs });
  return data.streamUrl;
}

/**
 * Web: sempre streaming assinado.
 * Nativo: tenta streaming; se falhar, retorna null para fallback local.
 */
export async function resolveProtectedAudioSource(input: {
  mediaId: string;
  localSource?: number | string | null;
}): Promise<{ uri: string } | number> {
  const { mediaId, localSource } = input;

  try {
    const uri = await fetchSignedStreamUrl(mediaId);
    return { uri };
  } catch (error) {
    if (Platform.OS !== 'web' && typeof localSource === 'number') {
      return localSource;
    }
    throw error;
  }
}

export function clearMediaTokenCache() {
  tokenCache.clear();
}
