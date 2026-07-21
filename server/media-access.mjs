/**
 * Streaming de áudio com token HMAC de curta duração.
 * Dev: server/private-media (espelho de assets/audio)
 * Prod: S3/R2 via MEDIA_S3_* ou arquivo local se existir
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hmacSecret } from './payments-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRIVATE_MEDIA_DIR = path.join(__dirname, 'private-media');
const ASSETS_AUDIO_DIR = path.join(ROOT, 'assets', 'audio');

const TOKEN_TTL_SEC = Number(process.env.MEDIA_TOKEN_TTL_SEC || 180);
const FREE_OT_COUNT = 3;
const TRIAL_MS = 72 * 60 * 60 * 1000;

/** OT ids liberados sem Missão+ (order 1–3) */
const FREE_OT_IDS = new Set([
  'ot-salmo-23',
  'ot-salmo-51',
  'ot-salomao-templo',
]);

/** Sessões/ambientes sempre livres (SOS) */
const FREE_SESSION_IDS = new Set([
  'sos-paz',
  'sos-ansiedade-01',
  'sos-ansiedade-02',
  'sos-ansiedade-03',
  'sos-ansiedade-04',
  'sos-ansiedade-05',
  'sos-ansiedade-06',
  'sos-ansiedade-07',
]);

function allowedOrigins() {
  const raw = process.env.MEDIA_ALLOWED_ORIGINS || process.env.PAYMENTS_PUBLIC_URL || '';
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  list.push(
    'http://localhost:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8081',
    'https://oucapalavra.com.br',
    'https://www.oucapalavra.com.br',
    'https://palavraviva-omega.vercel.app',
  );
  if (process.env.VERCEL_URL) {
    list.push(`https://${process.env.VERCEL_URL.replace(/\/$/, '')}`);
  }
  return [...new Set(list)];
}

export function mediaIdToRelativePath(mediaId) {
  const id = String(mediaId || '').trim().replace(/^\/+/, '');
  if (!id || id.includes('..')) return null;

  if (id.startsWith('biblia/')) {
    const name = id.slice('biblia/'.length);
    return `biblia-samples/${name}.mp3`;
  }
  if (id.startsWith('ot/')) {
    const name = id.slice('ot/'.length);
    return `ot/${name}.mp3`;
  }
  if (id.startsWith('ambient/')) {
    const name = id.slice('ambient/'.length);
    return `ambient/${name}.mp3`;
  }
  if (id.startsWith('session/')) {
    const name = id.slice('session/'.length);
    return `${name}.mp3`;
  }
  // aceita id nu = session
  if (!id.includes('/')) {
    return `${id}.mp3`;
  }
  return null;
}

function resolveLocalFile(relativePath) {
  const candidates = [
    path.join(PRIVATE_MEDIA_DIR, relativePath),
    path.join(ASSETS_AUDIO_DIR, relativePath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

export function signMediaToken({ mediaId, userId, exp }) {
  const body = `${mediaId}|${userId}|${exp}`;
  const sig = crypto.createHmac('sha256', hmacSecret()).update(body).digest('base64url');
  const payload = Buffer.from(
    JSON.stringify({ m: mediaId, u: userId, e: exp }),
  ).toString('base64url');
  return `${payload}.${sig}`;
}

export function verifyMediaToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, error: 'token_invalido' };
  }
  const [payloadB64, sig] = token.split('.');
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, error: 'token_invalido' };
  }
  const mediaId = String(payload.m || '');
  const userId = String(payload.u || '');
  const exp = Number(payload.e || 0);
  if (!mediaId || !userId || !exp) {
    return { ok: false, error: 'token_invalido' };
  }
  if (Date.now() / 1000 > exp) {
    return { ok: false, error: 'token_expirado' };
  }
  const expected = signMediaToken({ mediaId, userId, exp });
  const expectedSig = expected.split('.')[1];
  try {
    const a = Buffer.from(String(sig));
    const b = Buffer.from(String(expectedSig));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: 'token_assinatura' };
    }
  } catch {
    return { ok: false, error: 'token_assinatura' };
  }
  return { ok: true, mediaId, userId, exp };
}

function hasActiveSubscription(userId, readSubscriptions) {
  if (!userId || typeof readSubscriptions !== 'function') return false;
  try {
    const subs = readSubscriptions();
    const sub = subs[userId];
    if (!sub?.expiresAt) return false;
    return Date.parse(sub.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

function hasActiveTrial(_trialStartedAt) {
  // Trial de Missão+ desativado — conteúdo free vs pago sem janela de teste.
  return false;
}

/**
 * Regras freemium espelhadas (simplificadas) de contentAccess.ts
 */
export function canAccessMedia(mediaId, { userId, trialStartedAt, readSubscriptions }) {
  const id = String(mediaId || '');
  if (!id) return { ok: false, reason: 'mediaId_ausente' };

  if (id.startsWith('biblia/')) {
    return { ok: true, reason: 'biblical_free' };
  }

  if (id.startsWith('ot/')) {
    const otId = id.slice('ot/'.length);
    if (FREE_OT_IDS.has(otId)) return { ok: true, reason: 'ot_free' };
    if (
      hasActiveSubscription(userId, readSubscriptions) ||
      hasActiveTrial(trialStartedAt)
    ) {
      return { ok: true, reason: 'entitled' };
    }
    return { ok: false, reason: 'ot_locked' };
  }

  const sessionKey = id.startsWith('session/')
    ? id.slice('session/'.length)
    : id.startsWith('ambient/')
      ? id.slice('ambient/'.length)
      : id;

  if (FREE_SESSION_IDS.has(sessionKey)) {
    return { ok: true, reason: 'sos_free' };
  }

  // Jornada 7 dias (gratuita; progresso dia a dia no client)
  const JOURNEY_FREE = new Set([
    'ansiedade-01',
    'ansiedade-02',
    'ansiedade-03',
    'sobrecarga-01',
    'medo-01',
    'noite-ansiedade-01',
    'manha-esperanca-01',
  ]);
  if (JOURNEY_FREE.has(sessionKey)) {
    return { ok: true, reason: 'jornada_free' };
  }

  // Séries eco / premium: teaser dia 1 livre (+ ambient compartilhado das teasers)
  if (/^eco-/.test(sessionKey) && /-01$/.test(sessionKey)) {
    return { ok: true, reason: 'serie_teaser' };
  }
  if (/^prem-/.test(sessionKey) && /-01$/.test(sessionKey)) {
    return { ok: true, reason: 'serie_teaser' };
  }
  // Ambients reutilizados pelas teasers (não têm arquivo ambient/{serie}-01.mp3)
  const FREE_AMBIENT_KEYS = new Set([
    'ansiedade-01',
    'medo-01',
    'manha-esperanca-01',
    'amor-acalma-01',
    'noite-ansiedade-01',
  ]);
  if (id.startsWith('ambient/') && FREE_AMBIENT_KEYS.has(sessionKey)) {
    return { ok: true, reason: 'ambient_teaser' };
  }

  if (
    hasActiveSubscription(userId, readSubscriptions) ||
    hasActiveTrial(trialStartedAt)
  ) {
    return { ok: true, reason: 'entitled' };
  }

  return { ok: false, reason: 'subscription_required' };
}

export function createMediaTokenResponse({
  mediaId,
  userId,
  trialStartedAt,
  publicBaseUrl,
  readSubscriptions,
}) {
  const relativePath = mediaIdToRelativePath(mediaId);
  if (!relativePath) {
    return { status: 400, body: { ok: false, error: 'mediaId_invalido' } };
  }

  const local = resolveLocalFile(relativePath);
  const s3Configured = Boolean(
    process.env.MEDIA_S3_BUCKET && process.env.MEDIA_S3_ACCESS_KEY_ID,
  );
  if (!local && !s3Configured) {
    return { status: 404, body: { ok: false, error: 'media_nao_encontrada' } };
  }

  const access = canAccessMedia(mediaId, {
    userId,
    trialStartedAt,
    readSubscriptions,
  });
  if (!access.ok) {
    return {
      status: 403,
      body: { ok: false, error: access.reason || 'acesso_negado' },
    };
  }

  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const token = signMediaToken({ mediaId, userId, exp });
  const base = String(publicBaseUrl || '').replace(/\/$/, '') || '';
  const streamUrl = `${base}/api/media/stream?token=${encodeURIComponent(token)}`;

  return {
    status: 200,
    body: {
      ok: true,
      mediaId,
      streamUrl,
      expiresAt: new Date(exp * 1000).toISOString(),
      ttlSec: TOKEN_TTL_SEC,
    },
  };
}

export function isOriginAllowed(req) {
  const origins = allowedOrigins();
  const origin = String(req.headers.origin || '').replace(/\/$/, '');
  const referer = String(req.headers.referer || '');
  if (!origin && !referer) {
    // players nativos / alguns browsers não mandam Origin no GET de áudio
    return true;
  }
  if (origin && origins.some((o) => origin === o || origin.startsWith(o))) {
    return true;
  }
  if (referer && origins.some((o) => referer.startsWith(o))) {
    return true;
  }
  // Em dev, liberar localhost
  if (
    /localhost|127\.0\.0\.1/.test(origin) ||
    /localhost|127\.0\.0\.1/.test(referer)
  ) {
    return true;
  }
  return false;
}

async function readS3Object(relativePath) {
  const bucket = process.env.MEDIA_S3_BUCKET;
  const endpoint = process.env.MEDIA_S3_ENDPOINT; // R2: https://ACCOUNT.r2.cloudflarestorage.com
  const region = process.env.MEDIA_S3_REGION || 'auto';
  const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.MEDIA_S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId, secretAccessKey },
    });
    const key = `${(process.env.MEDIA_S3_PREFIX || 'audio').replace(/\/$/, '')}/${relativePath}`;
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    console.error('[media] s3_get_failed', relativePath, error?.message || error);
    return null;
  }
}

export async function loadMediaBuffer(mediaId) {
  const relativePath = mediaIdToRelativePath(mediaId);
  if (!relativePath) return null;
  const local = resolveLocalFile(relativePath);
  if (local) {
    return fs.readFileSync(local);
  }
  return readS3Object(relativePath);
}

export function privateMediaDir() {
  return PRIVATE_MEDIA_DIR;
}

export function assetsAudioDir() {
  return ASSETS_AUDIO_DIR;
}
