/**
 * Comprime foto para caber no limite de body da Vercel (~4,5 MB).
 * No web usa canvas; em native devolve o base64 se já estiver ok.
 */

const TARGET_MAX_BASE64 = 2_500_000; // ~1,8 MB binário
const MAX_EDGE = 1280;

function stripDataUrl(base64: string): string {
  const raw = String(base64 || '').trim();
  const idx = raw.indexOf('base64,');
  return idx >= 0 ? raw.slice(idx + 7) : raw;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    img.src = src;
  });
}

async function canvasToJpegBase64(
  img: HTMLImageElement,
  edge: number,
  quality: number,
): Promise<string> {
  const scale = Math.min(1, edge / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return stripDataUrl(dataUrl);
}

export async function compressImageForUpload(
  base64: string,
  mimeType = 'image/jpeg',
): Promise<{ base64: string; mimeType: string }> {
  const input = stripDataUrl(base64);
  if (!input || input.length < 100) {
    throw new Error('Envie uma foto válida.');
  }

  const canUseCanvas =
    typeof document !== 'undefined' && typeof Image !== 'undefined';

  if (!canUseCanvas) {
    if (input.length > TARGET_MAX_BASE64) {
      throw new Error(
        'Foto muito grande para enviar. Escolha outra ou recorte mais perto.',
      );
    }
    return { base64: input, mimeType: mimeType || 'image/jpeg' };
  }

  if (input.length <= TARGET_MAX_BASE64 && (mimeType || '').includes('jpeg')) {
    return { base64: input, mimeType: 'image/jpeg' };
  }

  const src = `data:${mimeType || 'image/jpeg'};base64,${input}`;
  const img = await loadImage(src);

  let edge = MAX_EDGE;
  let quality = 0.72;
  let out = await canvasToJpegBase64(img, edge, quality);

  for (let i = 0; i < 6 && out.length > TARGET_MAX_BASE64; i += 1) {
    quality = Math.max(0.4, quality - 0.08);
    if (i >= 2) edge = Math.max(640, Math.round(edge * 0.85));
    out = await canvasToJpegBase64(img, edge, quality);
  }

  if (out.length > TARGET_MAX_BASE64) {
    throw new Error(
      'Foto ainda grande demais após compactar. Escolha outra imagem.',
    );
  }

  return { base64: out, mimeType: 'image/jpeg' };
}
