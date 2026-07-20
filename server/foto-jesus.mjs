/**
 * Geração "Foto com Jesus" via Kie.ai GPT Image 2 (image-to-image).
 * Docs: https://docs.kie.ai/market/gpt/gpt-image-2-image-to-image
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const generationsPath = path.join(dataDir, 'foto-jesus-generations.json');

const KIE_API_BASE = 'https://api.kie.ai';
const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co';

export const FOTO_JESUS_PROMPT = `Create a warm, respectful photorealistic image of the person from the reference photo standing gently beside Jesus Christ. Preserve the person's face, age, skin tone, hair, and identity with high accuracy. Jesus should appear kind, peaceful, and approachable, with soft warm natural light, serene atmosphere, tasteful Christian art style, high photographic quality. No text, no watermark, no logos, no dramatic horror elements.`;

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function readGenerations() {
  return readJson(generationsPath, {});
}

export function writeGenerations(data) {
  writeJson(generationsPath, data);
}

function assertKieKey() {
  const key = (process.env.KIE_API_KEY || '').trim();
  if (!key) {
    throw new Error('Configure KIE_API_KEY no arquivo .env');
  }
  return key;
}

export async function uploadImageBase64ToKie({
  imageBase64,
  mimeType = 'image/jpeg',
  fileName,
}) {
  const key = assertKieKey();
  let base64Data = String(imageBase64 || '').trim();
  if (!base64Data.startsWith('data:')) {
    base64Data = `data:${mimeType};base64,${base64Data}`;
  }

  const response = await fetch(`${KIE_UPLOAD_BASE}/api/file-base64-upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data,
      uploadPath: 'palavraviva/foto-jesus',
      fileName: fileName || `foto-${Date.now()}.jpg`,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false || data.code >= 400) {
    throw new Error(
      data.msg || data.message || `Falha no upload Kie (${response.status})`,
    );
  }

  const fileUrl = data?.data?.fileUrl || data?.data?.downloadUrl;
  if (!fileUrl) {
    throw new Error('Upload Kie sem URL de arquivo.');
  }
  return {
    fileUrl,
    fileId: data?.data?.fileId || null,
    raw: data,
  };
}

export async function createKieImageToImageTask({ inputUrl, prompt }) {
  const key = assertKieKey();
  const response = await fetch(`${KIE_API_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-2-image-to-image',
      input: {
        prompt: prompt || FOTO_JESUS_PROMPT,
        input_urls: [inputUrl],
        aspect_ratio: '1:1',
        resolution: '1K',
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== 200 || !data?.data?.taskId) {
    throw new Error(
      data.msg || data.message || `Falha ao criar tarefa Kie (${response.status})`,
    );
  }
  return data.data.taskId;
}

export async function fetchKieTask(taskId) {
  const key = assertKieKey();
  const response = await fetch(
    `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.code && data.code !== 200)) {
    throw new Error(
      data.msg || data.message || `Falha ao consultar tarefa Kie (${response.status})`,
    );
  }
  return data.data || null;
}

export function extractResultUrl(taskData) {
  if (!taskData?.resultJson) return null;
  try {
    const parsed =
      typeof taskData.resultJson === 'string'
        ? JSON.parse(taskData.resultJson)
        : taskData.resultJson;
    const urls = parsed?.resultUrls;
    if (Array.isArray(urls) && typeof urls[0] === 'string') return urls[0];
  } catch {
    // ignore
  }
  return null;
}

export function createGenerationRecord({ userId, inputUrl, fileId }) {
  const generationId = `fj_${Date.now().toString(36)}_${crypto
    .randomBytes(4)
    .toString('hex')}`;
  const all = readGenerations();
  all[generationId] = {
    id: generationId,
    userId,
    inputUrl,
    fileId: fileId || null,
    status: 'awaiting_payment',
    kieTaskId: null,
    resultUrl: null,
    error: null,
    checkoutId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    paidAt: null,
  };
  writeGenerations(all);
  return all[generationId];
}

export function getGeneration(generationId) {
  return readGenerations()[generationId] || null;
}

export function updateGeneration(generationId, patch) {
  const all = readGenerations();
  const current = all[generationId];
  if (!current) return null;
  all[generationId] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeGenerations(all);
  return all[generationId];
}

/**
 * Após pagamento confirmado: inicia (ou retoma) a geração Kie.
 */
export async function fulfillFotoJesusPayment(generationId, userId, meta = {}) {
  const gen = getGeneration(generationId);
  if (!gen) {
    throw new Error('Geração não encontrada. Envie a foto novamente.');
  }
  if (gen.userId !== userId) {
    throw new Error('Geração não pertence a este usuário.');
  }

  if (gen.status === 'success' && gen.resultUrl) {
    return gen;
  }

  if (gen.kieTaskId && (gen.status === 'generating' || gen.status === 'paid')) {
    return refreshGenerationFromKie(generationId);
  }

  updateGeneration(generationId, {
    status: 'paid',
    paidAt: new Date().toISOString(),
    checkoutId: meta.checkoutId || gen.checkoutId || null,
    error: null,
  });

  try {
    const taskId = await createKieImageToImageTask({
      inputUrl: gen.inputUrl,
      prompt: FOTO_JESUS_PROMPT,
    });
    return updateGeneration(generationId, {
      status: 'generating',
      kieTaskId: taskId,
      error: null,
    });
  } catch (error) {
    return updateGeneration(generationId, {
      status: 'fail',
      error: String(error.message || error),
    });
  }
}

export async function refreshGenerationFromKie(generationId) {
  const gen = getGeneration(generationId);
  if (!gen?.kieTaskId) return gen;

  try {
    const task = await fetchKieTask(gen.kieTaskId);
    const state = String(task?.state || '').toLowerCase();

    if (state === 'success') {
      const resultUrl = extractResultUrl(task);
      return updateGeneration(generationId, {
        status: 'success',
        resultUrl,
        error: resultUrl ? null : 'Imagem gerada sem URL de resultado.',
      });
    }

    if (state === 'fail') {
      return updateGeneration(generationId, {
        status: 'fail',
        error: task?.failMsg || 'A geração falhou. Tente outra foto.',
      });
    }

    return updateGeneration(generationId, {
      status: 'generating',
      error: null,
    });
  } catch (error) {
    return updateGeneration(generationId, {
      error: String(error.message || error),
    });
  }
}
