import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const subscriptionsPath = path.join(dataDir, 'subscriptions.json');
const checkoutsPath = path.join(dataDir, 'checkouts.json');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const PORT = Number(process.env.PAYMENTS_PORT || 8788);
const SUBSCRIPTION_DAYS = Number(process.env.SUBSCRIPTION_DAYS || 30);
const WIVEN_PUBLIC_KEY = process.env.WIVEN_PUBLIC_KEY || '';
const WIVEN_SECRET_KEY = process.env.WIVEN_SECRET_KEY || '';
const WIVEN_CHECKOUT_URL = (process.env.WIVEN_CHECKOUT_URL || '').trim();
const WIVEN_WEBHOOK_SECRET =
  process.env.WIVEN_WEBHOOK_SECRET || WIVEN_SECRET_KEY || '';

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(subscriptionsPath)) {
  fs.writeFileSync(subscriptionsPath, '{}', 'utf8');
}
if (!fs.existsSync(checkoutsPath)) {
  fs.writeFileSync(checkoutsPath, '[]', 'utf8');
}

function send(res, status, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, x-admin-password, x-wiven-secret, x-wiven-signature',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ raw, json: raw ? JSON.parse(raw) : {} });
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readSubscriptions() {
  return readJson(subscriptionsPath, {});
}

function writeSubscriptions(data) {
  writeJson(subscriptionsPath, data);
}

function readCheckouts() {
  return readJson(checkoutsPath, []);
}

function writeCheckouts(data) {
  writeJson(checkoutsPath, data.slice(-5_000));
}

function buildCheckoutUrl({ userId, displayName, whatsapp, checkoutId }) {
  if (!WIVEN_CHECKOUT_URL) {
    throw new Error(
      'WIVEN_CHECKOUT_URL não configurada. Cole o link do produto no .env',
    );
  }

  const url = new URL(WIVEN_CHECKOUT_URL);
  url.searchParams.set('external_id', userId);
  url.searchParams.set('user_id', userId);
  url.searchParams.set('checkout_id', checkoutId);
  url.searchParams.set('metadata_user_id', userId);
  if (displayName) url.searchParams.set('name', displayName);
  if (whatsapp) url.searchParams.set('phone', whatsapp);
  if (WIVEN_PUBLIC_KEY) url.searchParams.set('public_key', WIVEN_PUBLIC_KEY);
  return url.toString();
}

function grantSubscription(userId, meta = {}) {
  if (!userId) return null;
  const subs = readSubscriptions();
  const now = Date.now();
  const current = subs[userId];
  const currentExpires = current?.expiresAt ? Date.parse(current.expiresAt) : 0;
  const base = currentExpires > now ? currentExpires : now;
  const expiresAt = new Date(
    base + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  subs[userId] = {
    userId,
    expiresAt,
    updatedAt: new Date().toISOString(),
    source: 'wiven',
    ...meta,
  };
  writeSubscriptions(subs);
  return subs[userId];
}

function extractUserId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.userId,
    payload.user_id,
    payload.external_id,
    payload.externalId,
    payload.metadata_user_id,
    payload.metadata?.userId,
    payload.metadata?.user_id,
    payload.metadata?.external_id,
    payload.data?.userId,
    payload.data?.user_id,
    payload.data?.external_id,
    payload.data?.metadata?.userId,
    payload.data?.metadata?.user_id,
    payload.customer?.external_id,
    payload.order?.external_id,
    payload.transaction?.external_id,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function isApprovedEvent(payload) {
  const status = String(
    payload?.status ||
      payload?.event ||
      payload?.type ||
      payload?.data?.status ||
      payload?.payment_status ||
      '',
  ).toLowerCase();

  return (
    status.includes('approved') ||
    status.includes('paid') ||
    status.includes('pago') ||
    status.includes('aprovad') ||
    status.includes('completed') ||
    status.includes('success') ||
    payload?.paid === true ||
    payload?.approved === true
  );
}

function verifyWebhook(req, url, raw) {
  if (!WIVEN_WEBHOOK_SECRET) return true;

  const headerSecret =
    req.headers['x-wiven-secret'] || req.headers['x-webhook-secret'];
  const querySecret = url.searchParams.get('secret');
  if (headerSecret === WIVEN_WEBHOOK_SECRET || querySecret === WIVEN_WEBHOOK_SECRET) {
    return true;
  }

  const signature =
    req.headers['x-wiven-signature'] || req.headers['x-signature'];
  if (typeof signature === 'string' && signature) {
    const digest = crypto
      .createHmac('sha256', WIVEN_WEBHOOK_SECRET)
      .update(raw)
      .digest('hex');
    if (signature === digest || signature === `sha256=${digest}`) return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, {
      ok: true,
      checkoutConfigured: Boolean(WIVEN_CHECKOUT_URL),
      publicKeyConfigured: Boolean(WIVEN_PUBLIC_KEY),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/checkout') {
    try {
      const { json: body } = await readBody(req);
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      if (!userId) {
        send(res, 400, { ok: false, error: 'userId_obrigatorio' });
        return;
      }

      const displayName =
        typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const whatsapp =
        typeof body.whatsapp === 'string'
          ? body.whatsapp.replace(/\D/g, '')
          : '';

      const checkoutId = `ck_${Date.now().toString(36)}_${crypto
        .randomBytes(4)
        .toString('hex')}`;

      const checkoutUrl = buildCheckoutUrl({
        userId,
        displayName,
        whatsapp,
        checkoutId,
      });

      const checkouts = readCheckouts();
      checkouts.push({
        id: checkoutId,
        userId,
        displayName: displayName || null,
        whatsapp: whatsapp || null,
        checkoutUrl,
        status: 'opened',
        createdAt: new Date().toISOString(),
      });
      writeCheckouts(checkouts);

      send(res, 201, {
        ok: true,
        checkoutId,
        checkoutUrl,
        publicKey: WIVEN_PUBLIC_KEY || null,
      });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/webhooks/wiven') {
    try {
      const { raw, json: body } = await readBody(req);
      if (!verifyWebhook(req, url, raw)) {
        send(res, 401, { ok: false, error: 'unauthorized' });
        return;
      }

      const userId = extractUserId(body);
      const approved = isApprovedEvent(body);

      if (!userId) {
        send(res, 202, {
          ok: true,
          ignored: true,
          reason: 'userId_nao_encontrado',
        });
        return;
      }

      if (!approved) {
        send(res, 202, {
          ok: true,
          ignored: true,
          reason: 'evento_nao_aprovado',
          userId,
        });
        return;
      }

      const sub = grantSubscription(userId, {
        lastWebhookAt: new Date().toISOString(),
        providerRef:
          body.id ||
          body.transaction_id ||
          body.data?.id ||
          body.payment_id ||
          null,
      });

      const checkouts = readCheckouts();
      for (let i = checkouts.length - 1; i >= 0; i -= 1) {
        if (checkouts[i].userId === userId && checkouts[i].status === 'opened') {
          checkouts[i].status = 'paid';
          checkouts[i].paidAt = new Date().toISOString();
          break;
        }
      }
      writeCheckouts(checkouts);

      send(res, 200, { ok: true, subscription: sub });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/access') {
    const userId = (url.searchParams.get('userId') || '').trim();
    if (!userId) {
      send(res, 400, { ok: false, error: 'userId_obrigatorio' });
      return;
    }

    const sub = readSubscriptions()[userId] || null;
    const expiresAt = sub?.expiresAt || null;
    const active =
      Boolean(expiresAt) && Number.isFinite(Date.parse(expiresAt))
        ? Date.parse(expiresAt) > Date.now()
        : false;

    send(res, 200, {
      ok: true,
      userId,
      active,
      subscriptionExpiresAt: expiresAt,
    });
    return;
  }

  // Liberação manual (dev/admin) — útil enquanto o webhook Wiven é configurado
  if (req.method === 'POST' && url.pathname === '/api/access/grant') {
    try {
      const { json: body } = await readBody(req);
      const secret = req.headers['x-wiven-secret'] || body.secret;
      if (WIVEN_WEBHOOK_SECRET && secret !== WIVEN_WEBHOOK_SECRET) {
        send(res, 401, { ok: false, error: 'unauthorized' });
        return;
      }
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      if (!userId) {
        send(res, 400, { ok: false, error: 'userId_obrigatorio' });
        return;
      }
      const sub = grantSubscription(userId, { source: 'manual_grant' });
      send(res, 200, { ok: true, subscription: sub });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  send(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`\nPagamentos Palavra Viva (Wiven)`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  POST /api/checkout`);
  console.log(`  POST /api/webhooks/wiven`);
  console.log(`  GET  /api/access?userId=...`);
  console.log(
    `  Checkout URL: ${WIVEN_CHECKOUT_URL ? 'configurada' : 'AUSENTE — defina WIVEN_CHECKOUT_URL'}\n`,
  );
});
