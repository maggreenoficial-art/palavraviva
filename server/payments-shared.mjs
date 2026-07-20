/**
 * Helpers compartilhados para API de pagamentos (Node local + Vercel).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function isVercel() {
  return Boolean(process.env.VERCEL || process.env.NOW_REGION);
}

export function dataDir() {
  if (isVercel()) {
    const dir = '/tmp/palavraviva-data';
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  const dir = path.join(__dirname, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function hmacSecret() {
  return (
    process.env.PAYMENTS_HMAC_SECRET ||
    process.env.WIVEN_WEBHOOK_SECRET ||
    process.env.WIVEN_SECRET_KEY ||
    process.env.KIE_API_KEY ||
    'palavraviva-dev-secret'
  ).trim();
}

export function signFotoJesusPayload({
  userId,
  generationId,
  inputUrl,
}) {
  const body = `${userId}|${generationId}|${inputUrl}`;
  return crypto.createHmac('sha256', hmacSecret()).update(body).digest('hex');
}

export function verifyFotoJesusPayload({
  userId,
  generationId,
  inputUrl,
  token,
}) {
  if (!userId || !generationId || !inputUrl || !token) return false;
  const expected = signFotoJesusPayload({ userId, generationId, inputUrl });
  try {
    return crypto.timingSafeEqual(
      Buffer.from(String(token)),
      Buffer.from(String(expected)),
    );
  } catch {
    return false;
  }
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, x-admin-password, x-wiven-secret, x-wiven-signature',
  };
}

export function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders(),
  });
  res.end(JSON.stringify(body));
}

/** Adapter Vercel (req/res estilo Node) */
export function vercelSend(res, status, body) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders(),
  };
  if (typeof res.setHeader === 'function') {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.statusCode = status;
    res.end(JSON.stringify(body));
    return;
  }
  // fallback
  res.status?.(status);
  res.json?.(body);
}
