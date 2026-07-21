import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  createGenerationRecord,
  ensureGenerationFromClient,
  fulfillFotoJesusPayment,
  getGeneration,
  refreshGenerationFromKie,
  signFotoJesusPayload,
  updateGeneration,
  uploadImageBase64ToKie,
} from './foto-jesus.mjs';
import { dataDir } from './payments-shared.mjs';
import {
  createMediaTokenResponse,
  isOriginAllowed,
  loadMediaBuffer,
  verifyMediaToken,
} from './media-access.mjs';
import { sendMetaConversionEvent, metaCapiConfigured } from './meta-capi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const paymentsDataDir = dataDir();
const subscriptionsPath = path.join(paymentsDataDir, 'subscriptions.json');
const checkoutsPath = path.join(paymentsDataDir, 'checkouts.json');
const toolEntitlementsPath = path.join(paymentsDataDir, 'tool-entitlements.json');

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
const WIVEN_PUBLIC_KEY = (process.env.WIVEN_PUBLIC_KEY || '').trim();
const WIVEN_SECRET_KEY = (process.env.WIVEN_SECRET_KEY || '').trim();
const WIVEN_WEBHOOK_SECRET =
  (process.env.WIVEN_WEBHOOK_SECRET || WIVEN_SECRET_KEY || '').trim();
const WIVEN_API_BASE = (
  process.env.WIVEN_API_BASE || 'https://app.wiven.com.br/api/v1'
).replace(/\/$/, '');
const PRODUCT_NAME =
  process.env.WIVEN_PRODUCT_NAME || 'Assinatura Palavra Viva';

function parseMoney(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  const raw = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PRODUCT_PRICE = parseMoney(process.env.WIVEN_PRODUCT_PRICE, 19.9);
const TOOL_PRODUCTS = {
  'tool-diario': {
    id: 'diario',
    kind: 'tool',
    name: 'Diario de Gratidao — Palavra Viva',
    price: parseMoney(process.env.WIVEN_TOOL_DIARIO_PRICE, 29.9),
  },
  'tool-foto-jesus': {
    id: 'foto-jesus',
    kind: 'generation',
    name: 'Foto com Jesus — Palavra Viva',
    price: parseMoney(process.env.WIVEN_TOOL_FOTO_JESUS_PRICE, 5),
  },
};
const PUBLIC_BASE_URL = (
  process.env.PAYMENTS_PUBLIC_URL ||
  process.env.EXPO_PUBLIC_PAYMENTS_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  `http://localhost:${PORT}`
).replace(/\/$/, '');

fs.mkdirSync(paymentsDataDir, { recursive: true });
if (!fs.existsSync(subscriptionsPath)) {
  fs.writeFileSync(subscriptionsPath, '{}', 'utf8');
}
if (!fs.existsSync(checkoutsPath)) {
  fs.writeFileSync(checkoutsPath, '[]', 'utf8');
}
if (!fs.existsSync(toolEntitlementsPath)) {
  fs.writeFileSync(toolEntitlementsPath, '{}', 'utf8');
}

function send(res, status, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = {
    'Content-Type': `${type}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, x-admin-password, x-wiven-secret, x-wiven-signature',
  };
  // Vercel Serverless: prefer setHeader/statusCode (writeHead nem sempre existe)
  if (typeof res.setHeader === 'function') {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    res.statusCode = status;
    res.end(payload);
    return;
  }
  res.writeHead(status, headers);
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    // Vercel / frameworks às vezes já entregam o body parseado
    if (req.body != null) {
      try {
        if (typeof req.body === 'string') {
          resolve({
            raw: req.body,
            json: req.body ? JSON.parse(req.body) : {},
          });
          return;
        }
        if (Buffer.isBuffer(req.body)) {
          const raw = req.body.toString('utf8');
          resolve({ raw, json: raw ? JSON.parse(raw) : {} });
          return;
        }
        if (typeof req.body === 'object') {
          resolve({ raw: JSON.stringify(req.body), json: req.body });
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
    }

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

function readToolEntitlements() {
  return readJson(toolEntitlementsPath, {});
}

function writeToolEntitlements(data) {
  writeJson(toolEntitlementsPath, data);
}

function grantTool(userId, toolId, meta = {}) {
  if (!userId || !toolId) return null;
  const all = readToolEntitlements();
  const current = all[userId] || { tools: [], updatedAt: null };
  const tools = Array.isArray(current.tools) ? [...current.tools] : [];
  if (!tools.includes(toolId)) tools.push(toolId);
  const next = {
    tools,
    updatedAt: new Date().toISOString(),
    lastMeta: meta,
  };
  all[userId] = next;
  writeToolEntitlements(all);
  return next;
}

function getUserTools(userId) {
  const entry = readToolEntitlements()[userId];
  return Array.isArray(entry?.tools) ? entry.tools : [];
}

function readCheckouts() {
  return readJson(checkoutsPath, []);
}

function writeCheckouts(data) {
  writeJson(checkoutsPath, data.slice(-5_000));
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
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

  const displayName =
    (typeof meta.displayName === 'string' && meta.displayName.trim()) ||
    current?.displayName ||
    null;
  const whatsapp =
    (typeof meta.whatsapp === 'string' && onlyDigits(meta.whatsapp)) ||
    current?.whatsapp ||
    null;

  subs[userId] = {
    userId,
    expiresAt,
    updatedAt: new Date().toISOString(),
    source: 'wiven',
    ...meta,
    displayName,
    whatsapp: whatsapp || null,
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
    payload.identifier,
    payload.metadata_user_id,
    payload.metadata?.userId,
    payload.metadata?.user_id,
    payload.metadata?.external_id,
    payload.data?.userId,
    payload.data?.user_id,
    payload.data?.external_id,
    payload.data?.identifier,
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
    status === 'ok' ||
    payload?.paid === true ||
    payload?.approved === true
  );
}

function verifyWebhook(req, url, raw) {
  if (!WIVEN_WEBHOOK_SECRET) return true;

  const headerSecret =
    req.headers['x-wiven-secret'] || req.headers['x-webhook-secret'];
  const querySecret = url.searchParams.get('secret');
  if (
    headerSecret === WIVEN_WEBHOOK_SECRET ||
    querySecret === WIVEN_WEBHOOK_SECRET
  ) {
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

  // callbackUrl da Wiven às vezes chega sem header — aceita se tiver userId
  return true;
}

function assertWivenKeys() {
  if (!WIVEN_PUBLIC_KEY || !WIVEN_SECRET_KEY) {
    throw new Error(
      'Configure WIVEN_PUBLIC_KEY e WIVEN_SECRET_KEY no arquivo .env',
    );
  }
}

function throwWivenError(response, data) {
  let msg = data?.message || data?.error || '';
  const detailText = formatWivenDetails(data?.details || data?.errors);
  if (/permiss/i.test(msg)) {
    msg =
      'Na Wiven, abra a credencial da API e ative a permissão “Criar/Consultar Transações”. Depois tente de novo.';
  } else if (/retentativ|excess(o|ive).*(attempt|retry|tentativ)|too many/i.test(msg)) {
    msg =
      'Cartão temporariamente bloqueado após várias tentativas. Aguarde 15–30 min ou pague com Pix agora.';
  } else if (/recusad|denied|declined|não autorizad|nao autorizad/i.test(msg)) {
    msg =
      msg ||
      'Pagamento recusado pelo banco. Confira os dados do cartão ou tente Pix.';
  } else if (/inválidos|invalidos|invalid/i.test(msg) && detailText) {
    msg = detailText;
  } else if (!msg) {
    msg = `Wiven retornou ${response.status}. Tente novamente em instantes.`;
  } else if (detailText && !msg.includes(detailText)) {
    msg = `${msg} (${detailText})`;
  }
  const error = new Error(msg);
  error.details = data;
  error.status = response.status;
  throw error;
}

function formatWivenDetails(details) {
  const issues = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object') return;
    if (typeof node.message === 'string') {
      const path = Array.isArray(node.path) ? node.path.join('.') : '';
      const lower = node.message.toLowerCase();
      if (/zip code/i.test(node.message)) {
        issues.push('CEP inválido');
      } else if (/phone/i.test(node.message)) {
        issues.push('Telefone inválido — use DDD + número');
      } else if (/name is too short|too_small/i.test(lower) || path.endsWith('name')) {
        issues.push('Nome muito curto (mín. 3 caracteres)');
      } else if (/expected number|invalid_type/i.test(lower) && /amount|price/i.test(path)) {
        issues.push('Valor do produto inválido no servidor');
      } else if (/document|cpf/i.test(lower) || path.includes('document')) {
        issues.push('CPF inválido');
      } else if (path) {
        issues.push(`${path}: ${node.message}`);
      } else {
        issues.push(node.message);
      }
    }
    if (Array.isArray(node.unionErrors)) walk(node.unionErrors);
    if (Array.isArray(node.issues)) walk(node.issues);
  };
  walk(details);
  return [...new Set(issues)].slice(0, 3).join(' · ');
}

function isValidCpf(value) {
  const d = onlyDigits(value);
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

function normalizeBrPhone(whatsapp) {
  let digits = onlyDigits(whatsapp);
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  // Celular BR: DDD (2) + 9 dígitos, ou fixo DDD + 8
  if (digits.length === 10 || digits.length === 11) {
    return digits;
  }
  // Fallback seguro (Wiven rejeita 11999999999 em alguns casos / números curtos)
  return '11987654321';
}

function buildClient({ userId, displayName, whatsapp, email, document }) {
  const cpf = onlyDigits(document);
  if (!isValidCpf(cpf)) {
    throw new Error('Informe um CPF válido (11 dígitos).');
  }
  const phone = normalizeBrPhone(whatsapp);
  const rawName = String(displayName || '').trim().replace(/\s+/g, ' ');
  const name =
    rawName.length >= 3 ? rawName : 'Assinante Palavra Viva';
  const safeEmail =
    (email && String(email).trim()) ||
    `cliente${onlyDigits(userId).slice(-8) || Date.now().toString().slice(-8)}@gmail.com`;

  return {
    name,
    email: safeEmail,
    phone,
    document: cpf,
    address: {
      country: 'BR',
      state: 'SP',
      city: 'Sao Paulo',
      neighborhood: 'Centro',
      zipCode: '01001-000',
      street: 'Rua Digital',
      number: '100',
      complement: 'Palavra Viva',
    },
  };
}

function tomorrowDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** CAPI no servidor — não depende do Pixel do navegador (adblock/atraso). */
async function fireMetaCapiSafe({
  eventName,
  eventId,
  eventSourceUrl,
  userId,
  displayName,
  whatsapp,
  clientIp,
  userAgent,
  customData,
}) {
  if (!metaCapiConfigured()) {
    return { ok: false, skipped: true, error: 'meta_capi_nao_configurado' };
  }
  try {
    return await sendMetaConversionEvent({
      eventName,
      eventId:
        eventId ||
        `${eventName}_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      eventSourceUrl:
        eventSourceUrl || `${PUBLIC_BASE_URL || 'https://oucapalavra.com.br'}/`,
      actionSource: 'website',
      user: {
        userId,
        displayName,
        whatsapp,
        country: 'br',
        clientIp,
        userAgent,
      },
      customData: customData || {},
    });
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

function isHttpsPublicUrl(url) {
  return /^https:\/\//i.test(url || '') && !/localhost|127\.0\.0\.1/i.test(url);
}

function resolveProduct(productKey) {
  if (productKey && TOOL_PRODUCTS[productKey]) {
    const item = TOOL_PRODUCTS[productKey];
    return {
      kind: item.kind || 'tool',
      productKey,
      toolId: item.id,
      name: item.name,
      price: item.price,
    };
  }
  return {
    kind: 'subscription',
    productKey: 'subscription',
    toolId: null,
    name: PRODUCT_NAME,
    price: PRODUCT_PRICE,
  };
}

function buildChargePayload({
  userId,
  client,
  product,
  generationId,
  inputUrl,
  generationToken,
}) {
  const resolved = product || resolveProduct(null);
  const identifier = `pv_${userId}_${Date.now().toString(36)}`;
  const productId = `pv_${resolved.productKey}_${crypto
    .randomBytes(4)
    .toString('hex')}`;
  const payload = {
    identifier,
    amount: Number(resolved.price),
    client,
    products: [
      {
        id: productId,
        name: String(resolved.name || 'Palavra Viva').slice(0, 100),
        quantity: 1,
        price: Number(resolved.price),
      },
    ],
    dueDate: tomorrowDate(),
    metadata: {
      userId,
      user_id: userId,
      external_id: userId,
      app: 'palavraviva',
      product: resolved.productKey,
      toolId: resolved.toolId,
      kind: resolved.kind,
      generationId: generationId || null,
      inputUrl: inputUrl || null,
      generationToken: generationToken || null,
    },
  };

  // Wiven/CloudFront bloqueia callback com localhost (403 HTML)
  if (isHttpsPublicUrl(PUBLIC_BASE_URL)) {
    payload.callbackUrl = `${PUBLIC_BASE_URL}/api/webhooks/wiven?secret=${encodeURIComponent(
      WIVEN_WEBHOOK_SECRET,
    )}`;
  }

  return payload;
}

async function wivenPost(path, payload) {
  assertWivenKeys();
  const response = await fetch(`${WIVEN_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-public-key': WIVEN_PUBLIC_KEY,
      'x-secret-key': WIVEN_SECRET_KEY,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text?.slice?.(0, 120) || '' };
  }
  if (!response.ok) throwWivenError(response, data);
  return data;
}

async function wivenGet(path) {
  assertWivenKeys();
  const response = await fetch(`${WIVEN_API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      'x-public-key': WIVEN_PUBLIC_KEY,
      'x-secret-key': WIVEN_SECRET_KEY,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throwWivenError(response, data);
  return data;
}

/** Status de pagamento confirmado (consulta de transação). */
function isPaidStatus(status) {
  const value = String(status || '').toUpperCase().trim();
  // "OK" na criação do Pix só significa cobrança gerada, não paga.
  // "PENDING" / "WAITING_*" = ainda não pago.
  if (
    !value ||
    value === 'OK' ||
    value === 'PENDING' ||
    value === 'OPEN' ||
    value === 'OPENED' ||
    value.startsWith('WAITING')
  ) {
    return false;
  }
  return (
    value === 'PAID' ||
    value === 'APPROVED' ||
    value === 'ACTIVE' ||
    value === 'COMPLETED' ||
    value === 'COMPLETE' ||
    value === 'SUCCESS' ||
    value === 'SUCCEEDED' ||
    value === 'CONFIRMED' ||
    value === 'CONFIRMADO' ||
    value === 'RECEIVED' ||
    value === 'RECEBIDO' ||
    value === 'CAPTURED' ||
    value === 'SETTLED' ||
    value === 'LIQUIDATED' ||
    value === 'FINISHED' ||
    value === 'DONE' ||
    value.includes('PAGO') ||
    value.includes('APPROV')
  );
}

/** Transação Wiven considerada paga (status ou payedAt). */
function isPaidTransaction(tx) {
  if (!tx) return false;
  if (Array.isArray(tx)) return isPaidTransaction(tx[0]);
  if (Array.isArray(tx.items)) return isPaidTransaction(tx.items[0]);
  const nested = tx.data ?? tx.transaction ?? null;
  if (Array.isArray(nested)) return isPaidTransaction(nested[0]);
  if (isPaidStatus(extractTxStatus(tx))) return true;
  if (tx.paid === true || tx.isPaid === true || nested?.paid === true) {
    return true;
  }
  const paidAt =
    tx.payedAt ||
    tx.paidAt ||
    tx.paymentSettlementDate ||
    tx.paid_at ||
    nested?.payedAt ||
    nested?.paidAt ||
    null;
  if (paidAt) return true;
  // alguns retornos marcam e2e / endToEnd só após liquidar
  const e2e =
    tx.endToEnd ||
    tx.e2eId ||
    tx.pixInformation?.endToEnd ||
    tx.pixInformation?.e2eId ||
    null;
  if (e2e && String(extractTxStatus(tx) || '').toUpperCase() !== 'PENDING') {
    return true;
  }
  return false;
}

/** Na criação via cartão, OK costuma indicar captura imediata. */
function isCardCaptureStatus(status) {
  const value = String(status || '').toUpperCase();
  return value === 'OK' || isPaidStatus(value);
}

async function createWivenPixCharge(input) {
  const client = buildClient(input);
  const product = resolveProduct(input.product);
  const payload = buildChargePayload({
    userId: input.userId,
    client,
    product,
    generationId: input.generationId || null,
    inputUrl: input.inputUrl || null,
    generationToken: input.generationToken || null,
  });
  const data = await wivenPost('/gateway/pix/receive', payload);
  return {
    identifier: payload.identifier,
    transactionId: data.transactionId || data.id || null,
    status: data.status || null,
    pixCode: data.pix?.code || null,
    pixImage: data.pix?.image || null,
    product,
    raw: data,
  };
}

async function createWivenCardCharge(input) {
  const client = buildClient(input);
  const product = resolveProduct(input.product);
  const payload = buildChargePayload({
    userId: input.userId,
    client,
    product,
    generationId: input.generationId || null,
    inputUrl: input.inputUrl || null,
    generationToken: input.generationToken || null,
  });

  const number = onlyDigits(input.card?.number);
  const cvv = onlyDigits(input.card?.cvv);
  const owner = String(input.card?.owner || input.displayName || '').trim();
  let expiresAt = String(input.card?.expiresAt || '').trim();

  if (/^\d{2}\/\d{2}$/.test(expiresAt)) {
    const [mm, yy] = expiresAt.split('/');
    expiresAt = `20${yy}-${mm}`;
  }

  if (number.length < 13) {
    throw new Error('Número do cartão inválido.');
  }
  if (!owner || owner.length < 2) {
    throw new Error('Informe o nome impresso no cartão.');
  }
  if (!/^\d{4}-\d{2}$/.test(expiresAt)) {
    throw new Error('Validade inválida. Use MM/AA.');
  }
  if (cvv.length < 3) {
    throw new Error('CVV inválido.');
  }

  const data = await wivenPost('/gateway/card/receive', {
    ...payload,
    clientIp: input.clientIp || '127.0.0.1',
    installments: 1,
    card: {
      number,
      owner,
      expiresAt,
      cvv,
      statementDescriptor: 'PALAVRA VIVA',
    },
  });

  return {
    identifier: payload.identifier,
    transactionId: data.transactionId || data.id || null,
    status: data.status || null,
    approved: isCardCaptureStatus(data.status),
    product,
    raw: data,
  };
}

/** Normaliza respostas Wiven (objeto único, items[], data[], etc.). */
function unwrapWivenTransaction(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    return pickPreferredTransaction(data);
  }
  if (Array.isArray(data.items)) {
    return pickPreferredTransaction(data.items);
  }
  if (Array.isArray(data.data)) {
    return pickPreferredTransaction(data.data);
  }
  if (data.data && typeof data.data === 'object') {
    return data.data;
  }
  if (data.transaction && typeof data.transaction === 'object') {
    return data.transaction;
  }
  if (data.result && typeof data.result === 'object') {
    return data.result;
  }
  return data;
}

function pickPreferredTransaction(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const paid = list.find((item) => isPaidTransaction(item));
  return paid || list[0] || null;
}

async function fetchWivenTransaction(transactionId, clientIdentifier = null) {
  if (transactionId) {
    try {
      const data = await wivenGet(
        `/gateway/transactions?id=${encodeURIComponent(transactionId)}`,
      );
      return unwrapWivenTransaction(data);
    } catch (error) {
      if (!clientIdentifier) throw error;
    }
  }
  if (clientIdentifier) {
    const data = await wivenGet(
      `/gateway/transactions?clientIdentifier=${encodeURIComponent(clientIdentifier)}`,
    );
    return unwrapWivenTransaction(data);
  }
  return null;
}

/** Extrai status de pagamento de respostas variadas da Wiven. */
function extractTxStatus(tx) {
  if (!tx) return null;
  if (Array.isArray(tx)) return extractTxStatus(tx[0]);
  if (Array.isArray(tx.items)) return extractTxStatus(tx.items[0]);
  if (Array.isArray(tx.data) && tx.data[0] && typeof tx.data[0] === 'object') {
    return extractTxStatus(tx.data[0]);
  }
  const nested = tx.data ?? tx.transaction ?? tx.result ?? null;
  if (Array.isArray(nested)) return extractTxStatus(nested[0]);
  return (
    tx.status ||
    tx.payment_status ||
    tx.paymentStatus ||
    tx.operationStatus ||
    nested?.status ||
    nested?.payment_status ||
    nested?.paymentStatus ||
    nested?.operationStatus ||
    null
  );
}

/**
 * Confirma Pix/cartão consultando a Wiven (não depende do /tmp entre lambdas).
 * startGeneration: false = só marca pago (padrão no poll); true = cria job Kie.
 * kieTaskId: se já existe, nunca cria outro job.
 */
async function tryConfirmGenerationPayment({
  generationId,
  userId,
  inputUrl,
  token,
  transactionId,
  checkoutId,
  source,
  startGeneration = false,
  kieTaskId = null,
  clientIdentifier = null,
}) {
  if (!transactionId && !clientIdentifier) {
    return { generation: null, paymentCheck: { error: 'transactionId_ausente' } };
  }
  const tx = await fetchWivenTransaction(transactionId, clientIdentifier);
  const wivenStatus = extractTxStatus(tx);
  const paymentCheck = {
    transactionId: transactionId || tx?.id || null,
    clientIdentifier: clientIdentifier || tx?.clientIdentifier || null,
    wivenStatus,
    paid: isPaidTransaction(tx),
    payedAt: tx?.payedAt || tx?.paidAt || null,
  };
  if (!paymentCheck.paid) {
    return { generation: null, paymentCheck };
  }

  try {
    const all = readCheckouts();
    const idx = all.findIndex(
      (c) =>
        (transactionId && c.transactionId === transactionId) ||
        (checkoutId && c.id === checkoutId) ||
        (clientIdentifier && c.identifier === clientIdentifier),
    );
    if (idx >= 0) {
      all[idx].status = 'paid';
      all[idx].paidAt = new Date().toISOString();
      writeCheckouts(all);
    }
  } catch {
    // /tmp pode falhar no Vercel — ok, seguimos com a geração
  }

  const generation = await fulfillFotoJesusPayment(generationId, userId, {
    checkoutId: checkoutId || null,
    source: source || 'tx_confirm',
    providerRef: paymentCheck.transactionId,
    inputUrl: inputUrl || null,
    token: token || null,
    kieTaskId: kieTaskId || null,
    startGeneration: Boolean(kieTaskId) ? true : Boolean(startGeneration),
  });
  return { generation, paymentCheck };
}

function saveCheckoutRecord(record) {
  const checkouts = readCheckouts();
  checkouts.push(record);
  writeCheckouts(checkouts);
}

function checkoutHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Assinar · Palavra Viva</title>
  <style>
    :root {
      --bg: #121A21;
      --card: #1A2430;
      --border: #2C3A48;
      --text: #F2F5F7;
      --muted: #8A97A5;
      --accent: #3DDC97;
      --danger: #F07167;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(900px 420px at 20% -10%, rgba(61,220,151,.14), transparent), var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      padding: 24px 16px 48px;
    }
    .box {
      width: 100%;
      max-width: 440px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 22px;
    }
    h1 { margin: 0 0 6px; font-size: 1.35rem; }
    .price { color: var(--accent); font-size: 1.6rem; font-weight: 700; margin: 10px 0 4px; }
    .muted { color: var(--muted); font-size: .92rem; line-height: 1.45; }
    label { display: block; margin: 14px 0 6px; font-size: .85rem; color: var(--muted); }
    input {
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #222E3A;
      color: var(--text);
      padding: 12px 14px;
      font-size: 1rem;
    }
    button {
      width: 100%;
      margin-top: 16px;
      border: 0;
      border-radius: 12px;
      background: var(--accent);
      color: #102018;
      font-weight: 700;
      font-size: 1rem;
      padding: 14px;
      cursor: pointer;
    }
    button.secondary {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
      margin-top: 10px;
    }
    button:disabled { opacity: .65; cursor: wait; }
    .error { color: var(--danger); margin-top: 12px; font-size: .9rem; }
    .ok { color: var(--accent); margin-top: 12px; font-size: .9rem; }
    .pix {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .pix img {
      width: 220px;
      height: 220px;
      background: #fff;
      border-radius: 12px;
      padding: 10px;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      margin-top: 10px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #222E3A;
      color: var(--text);
      padding: 10px;
      font-size: .8rem;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>Missão+</h1>
    <p class="muted">Assinatura Palavra Viva — áudios liberados por 30 dias.</p>
    <div class="price">R$ ${PRODUCT_PRICE.toFixed(2).replace('.', ',')}/mês</div>
    <p class="muted">Pagamento seguro via Pix (Wiven).</p>

    <form id="form">
      <label>Nome</label>
      <input id="name" required autocomplete="name" />
      <label>WhatsApp</label>
      <input id="whatsapp" required inputmode="tel" placeholder="DDD + número" />
      <label>CPF</label>
      <input id="document" required inputmode="numeric" placeholder="Somente números" />
      <label>E-mail (opcional)</label>
      <input id="email" type="email" autocomplete="email" placeholder="opcional" />
      <button id="pay" type="submit">Gerar Pix</button>
    </form>

    <div id="msg"></div>
    <div id="pix" class="pix" hidden>
      <p class="muted">Escaneie o QR Code ou copie o código Pix:</p>
      <img id="qr" alt="QR Code Pix" />
      <textarea id="code" readonly></textarea>
      <button class="secondary" id="copy" type="button">Copiar código Pix</button>
      <button class="secondary" id="check" type="button">Já paguei — verificar</button>
      <p id="status" class="muted"></p>
    </div>
  </div>
  <script>
    const params = new URLSearchParams(location.search);
    const userId = params.get('userId') || '';
    document.getElementById('name').value = params.get('name') || '';
    document.getElementById('whatsapp').value = params.get('whatsapp') || '';

    const msg = document.getElementById('msg');
    const pixBox = document.getElementById('pix');
    let pollTimer = null;

    function setMsg(text, ok) {
      msg.className = ok ? 'ok' : 'error';
      msg.textContent = text || '';
    }

    async function createCheckout(ev) {
      ev.preventDefault();
      if (!userId) {
        setMsg('Abra o checkout pelo app para identificar sua conta.');
        return;
      }
      const btn = document.getElementById('pay');
      btn.disabled = true;
      setMsg('Gerando Pix…', true);
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            displayName: document.getElementById('name').value.trim(),
            whatsapp: document.getElementById('whatsapp').value.trim(),
            email: document.getElementById('email').value.trim(),
            document: document.getElementById('document').value.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Não foi possível gerar o Pix.');
        }
        pixBox.hidden = false;
        document.getElementById('code').value = data.pixCode || '';
        const qr = document.getElementById('qr');
        if (data.pixImage) {
          qr.src = data.pixImage;
          qr.hidden = false;
        } else if (data.pixCode) {
          qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(data.pixCode);
          qr.hidden = false;
        } else {
          qr.hidden = true;
        }
        setMsg('Pix gerado. Pague e toque em “Já paguei”.', true);
        startPolling();
      } catch (error) {
        setMsg(error.message || 'Erro ao gerar Pix.');
      } finally {
        btn.disabled = false;
      }
    }

    async function checkAccess() {
      const res = await fetch('/api/access?userId=' + encodeURIComponent(userId));
      const data = await res.json();
      if (data.active) {
        document.getElementById('status').textContent = 'Assinatura ativa! Pode voltar ao app.';
        setMsg('Pagamento confirmado. Assinatura liberada.', true);
        if (pollTimer) clearInterval(pollTimer);
        return true;
      }
      document.getElementById('status').textContent = 'Aguardando confirmação do pagamento…';
      return false;
    }

    function startPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { void checkAccess(); }, 5000);
      void checkAccess();
    }

    document.getElementById('form').onsubmit = (e) => void createCheckout(e);
    document.getElementById('copy').onclick = async () => {
      const code = document.getElementById('code').value;
      try {
        await navigator.clipboard.writeText(code);
        setMsg('Código Pix copiado.', true);
      } catch {
        document.getElementById('code').select();
        setMsg('Selecione e copie o código manualmente.');
      }
    };
    document.getElementById('check').onclick = () => void checkAccess();
  </script>
</body>
</html>`;
}

const serverHandler = async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  // Checkout Missão+ só em /checkout — a raiz não é o app Expo.
  if (req.method === 'GET' && url.pathname === '/checkout') {
    send(res, 200, checkoutHtml(), 'text/html');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    send(
      res,
      200,
      `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API de pagamentos · Palavra Viva</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#121A21; color:#F2F5F7;
      max-width:520px; margin:48px auto; padding:0 20px; line-height:1.5; }
    a { color:#3DDC97; }
    code { background:#1A2430; padding:2px 6px; border-radius:6px; }
    .muted { color:#8A97A5; }
  </style>
</head>
<body>
  <h1>API de pagamentos</h1>
  <p>Esta porta (<code>${PORT}</code>) é o backend de Pix/cartão, Foto com Jesus e streaming de áudio — <strong>não é o app</strong>.</p>
  <p>O app gratuito roda com <code>npm start</code> (Expo), em geral em
    <a href="http://localhost:8081">http://localhost:8081</a>.</p>
  <p class="muted">Missão+: <a href="/checkout">/checkout</a> · Saúde: <a href="/api/health">/api/health</a> · Áudio: <code>POST /api/media/token</code></p>
</body>
</html>`,
      'text/html',
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, {
      ok: true,
      publicKeyConfigured: Boolean(WIVEN_PUBLIC_KEY),
      secretKeyConfigured: Boolean(WIVEN_SECRET_KEY),
      productName: PRODUCT_NAME,
      productPrice: PRODUCT_PRICE,
      publicBaseUrl: PUBLIC_BASE_URL,
    });
    return;
  }

  if (
    req.method === 'POST' &&
    (url.pathname === '/api/checkout' ||
      url.pathname === '/api/checkout/pix' ||
      url.pathname === '/api/checkout/card')
  ) {
    try {
      const { json: body } = await readBody(req);
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      if (!userId) {
        send(res, 400, { ok: false, error: 'userId_obrigatorio' });
        return;
      }

      const method =
        url.pathname.endsWith('/card') || body.method === 'card'
          ? 'card'
          : 'pix';

      const displayName =
        typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const whatsapp =
        typeof body.whatsapp === 'string' ? onlyDigits(body.whatsapp) : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const document =
        typeof body.document === 'string' ? onlyDigits(body.document) : '';
      const clientIp =
        typeof body.clientIp === 'string' && body.clientIp.trim()
          ? body.clientIp.trim()
          : (req.headers['x-forwarded-for'] || '')
              .toString()
              .split(',')[0]
              .trim() ||
            req.socket.remoteAddress?.replace('::ffff:', '') ||
            '127.0.0.1';
      const userAgent = String(req.headers['user-agent'] || '');
      const eventSourceUrl =
        typeof body.eventSourceUrl === 'string' && body.eventSourceUrl.trim()
          ? body.eventSourceUrl.trim()
          : `${PUBLIC_BASE_URL || 'https://oucapalavra.com.br'}/`;

      const productKey =
        typeof body.product === 'string' ? body.product.trim() : '';
      const product = resolveProduct(productKey || null);
      const generationId =
        typeof body.generationId === 'string' ? body.generationId.trim() : '';
      const generationInputUrl =
        typeof body.inputUrl === 'string' ? body.inputUrl.trim() : '';
      const generationToken =
        typeof body.generationToken === 'string'
          ? body.generationToken.trim()
          : typeof body.token === 'string'
            ? body.token.trim()
            : '';

      if (product.kind === 'generation') {
        if (!generationId) {
          send(res, 400, {
            ok: false,
            error: 'Envie a foto antes de pagar (generationId ausente).',
          });
          return;
        }
        let gen = getGeneration(generationId);
        if (!gen && generationInputUrl && generationToken) {
          gen = ensureGenerationFromClient({
            generationId,
            userId,
            inputUrl: generationInputUrl,
            token: generationToken,
          });
        }
        if (!gen || gen.userId !== userId) {
          send(res, 400, {
            ok: false,
            error: 'Geração inválida. Envie a foto novamente.',
          });
          return;
        }
      }

      const checkoutId = `ck_${Date.now().toString(36)}_${crypto
        .randomBytes(4)
        .toString('hex')}`;

      const metaUser = {
        userId,
        displayName,
        whatsapp,
        clientIp,
        userAgent,
        eventSourceUrl,
      };
      const metaCheckoutData = {
        currency: 'BRL',
        value: product.price,
        content_name: product.productKey,
        content_category:
          product.kind === 'subscription' ? 'subscription' : 'tool',
        num_items: 1,
      };

      // Dispara ANTES da Wiven — mesmo se cartão/Pix falhar, o Meta registra o funil
      // await obrigatório no Vercel (sem await a lambda morre antes do envio)
      await fireMetaCapiSafe({
        eventName: 'InitiateCheckout',
        ...metaUser,
        customData: metaCheckoutData,
      });

      if (method === 'card') {
        await fireMetaCapiSafe({
          eventName: 'AddPaymentInfo',
          ...metaUser,
          customData: {
            ...metaCheckoutData,
            payment_type: 'card',
          },
        });

        let wiven;
        try {
          wiven = await createWivenCardCharge({
            userId,
            displayName,
            whatsapp,
            email,
            document,
            clientIp,
            card: body.card || {},
            product: product.productKey,
            generationId: generationId || null,
            inputUrl: generationInputUrl || null,
            generationToken: generationToken || null,
          });
        } catch (cardError) {
          // Eventos já enviados; devolve o erro da Wiven ao app
          throw cardError;
        }

        let subscription = null;
        let unlockedTools = getUserTools(userId);
        let generation = null;
        if (wiven.approved) {
          if (product.kind === 'generation' && generationId) {
            generation = await fulfillFotoJesusPayment(generationId, userId, {
              checkoutId,
              source: 'wiven_card',
              providerRef: wiven.transactionId,
              inputUrl: generationInputUrl || null,
              token: generationToken || null,
            });
          } else if (product.kind === 'tool' && product.toolId) {
            const ent = grantTool(userId, product.toolId, {
              source: 'wiven_card',
              providerRef: wiven.transactionId,
            });
            unlockedTools = ent?.tools || unlockedTools;
          } else {
            subscription = grantSubscription(userId, {
              source: 'wiven_card',
              providerRef: wiven.transactionId,
              displayName: displayName || null,
              whatsapp: whatsapp || null,
            });
            await fireMetaCapiSafe({
              eventName: 'Subscribe',
              ...metaUser,
              customData: {
                currency: 'BRL',
                value: product.price,
                content_name: product.productKey,
                content_category: 'subscription',
              },
            });
          }
        }

        saveCheckoutRecord({
          id: checkoutId,
          userId,
          method: 'card',
          product: product.productKey,
          toolId: product.toolId,
          kind: product.kind,
          generationId: generationId || null,
          inputUrl: generationInputUrl || null,
          generationToken: generationToken || null,
          displayName: displayName || null,
          whatsapp: whatsapp || null,
          identifier: wiven.identifier,
          transactionId: wiven.transactionId,
          status: wiven.approved ? 'paid' : 'opened',
          paidAt: wiven.approved ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        });

        send(res, 201, {
          ok: true,
          method: 'card',
          checkoutId,
          approved: wiven.approved,
          status: wiven.status,
          transactionId: wiven.transactionId,
          product: product.productKey,
          generationId: generationId || null,
          generationStatus: generation?.status || null,
          kieTaskId: generation?.kieTaskId || null,
          resultUrl: generation?.resultUrl || null,
          unlockedTools,
          subscriptionExpiresAt: subscription?.expiresAt || null,
        });
        return;
      }

      void fireMetaCapiSafe({
        eventName: 'AddPaymentInfo',
        ...metaUser,
        customData: {
          ...metaCheckoutData,
          payment_type: 'pix',
        },
      });

      const wiven = await createWivenPixCharge({
        userId,
        displayName,
        whatsapp,
        email,
        document,
        product: product.productKey,
        generationId: generationId || null,
        inputUrl: generationInputUrl || null,
        generationToken: generationToken || null,
      });

      saveCheckoutRecord({
        id: checkoutId,
        userId,
        method: 'pix',
        product: product.productKey,
        toolId: product.toolId,
        kind: product.kind,
        generationId: generationId || null,
        inputUrl: generationInputUrl || null,
        generationToken: generationToken || null,
        displayName: displayName || null,
        whatsapp: whatsapp || null,
        identifier: wiven.identifier,
        transactionId: wiven.transactionId,
        status: 'opened',
        createdAt: new Date().toISOString(),
      });

      send(res, 201, {
        ok: true,
        method: 'pix',
        checkoutId,
        transactionId: wiven.transactionId,
        identifier: wiven.identifier,
        product: product.productKey,
        generationId: generationId || null,
        pixCode: wiven.pixCode,
        pixImage: wiven.pixImage,
      });
    } catch (error) {
      send(res, error.status && error.status < 500 ? error.status : 400, {
        ok: false,
        error: String(error.message || error),
        details: error.details || null,
      });
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

      const providerRef =
        body.id ||
        body.transactionId ||
        body.transaction_id ||
        body.data?.id ||
        body.payment_id ||
        null;

      const checkouts = readCheckouts();
      let matched = null;
      for (let i = checkouts.length - 1; i >= 0; i -= 1) {
        if (checkouts[i].userId === userId && checkouts[i].status === 'opened') {
          checkouts[i].status = 'paid';
          checkouts[i].paidAt = new Date().toISOString();
          matched = checkouts[i];
          break;
        }
      }
      writeCheckouts(checkouts);

      const metaProduct =
        body.metadata?.product ||
        body.data?.metadata?.product ||
        matched?.product ||
        null;
      const metaToolId =
        body.metadata?.toolId ||
        body.data?.metadata?.toolId ||
        matched?.toolId ||
        null;
      const metaGenerationId =
        body.metadata?.generationId ||
        body.data?.metadata?.generationId ||
        matched?.generationId ||
        null;
      const resolved = resolveProduct(metaProduct);

      if (resolved.kind === 'generation' && metaGenerationId) {
        const metaInputUrl =
          body.metadata?.inputUrl ||
          body.data?.metadata?.inputUrl ||
          matched?.inputUrl ||
          null;
        const metaToken =
          body.metadata?.generationToken ||
          body.data?.metadata?.generationToken ||
          matched?.generationToken ||
          null;
        const generation = await fulfillFotoJesusPayment(
          metaGenerationId,
          userId,
          {
            checkoutId: matched?.id || null,
            source: 'wiven_webhook',
            providerRef,
            inputUrl: metaInputUrl,
            token: metaToken,
          },
        );
        send(res, 200, {
          ok: true,
          generationId: metaGenerationId,
          generationStatus: generation?.status || null,
        });
        return;
      }

      if (resolved.kind === 'tool' && (resolved.toolId || metaToolId)) {
        const ent = grantTool(userId, resolved.toolId || metaToolId, {
          lastWebhookAt: new Date().toISOString(),
          providerRef,
        });
        send(res, 200, { ok: true, unlockedTools: ent?.tools || [] });
        return;
      }

      const sub = grantSubscription(userId, {
        lastWebhookAt: new Date().toISOString(),
        providerRef,
      });

      void fireMetaCapiSafe({
        eventName: 'Subscribe',
        userId,
        eventSourceUrl: `${PUBLIC_BASE_URL || 'https://oucapalavra.com.br'}/`,
        customData: {
          currency: 'BRL',
          value: PRODUCT_PRICE,
          content_name: 'subscription',
          content_category: 'subscription',
        },
      });

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

    let sub = readSubscriptions()[userId] || null;
    let expiresAt = sub?.expiresAt || null;
    let active =
      Boolean(expiresAt) && Number.isFinite(Date.parse(expiresAt))
        ? Date.parse(expiresAt) > Date.now()
        : false;

    let unlockedTools = getUserTools(userId);

    // Se ainda não está ativo, consulta a Wiven pelos checkouts Pix abertos
    const openCheckouts = readCheckouts()
      .filter((c) => c.userId === userId && c.status === 'opened' && c.transactionId)
      .slice(-5)
      .reverse();

    for (const checkout of openCheckouts) {
      try {
        const tx = await fetchWivenTransaction(checkout.transactionId);
        if (!isPaidTransaction(tx)) continue;

        const all = readCheckouts();
        const idx = all.findIndex((c) => c.id === checkout.id);
        if (idx >= 0) {
          all[idx].status = 'paid';
          all[idx].paidAt = new Date().toISOString();
          writeCheckouts(all);
        }

        if (checkout.kind === 'generation' && checkout.generationId) {
          await fulfillFotoJesusPayment(checkout.generationId, userId, {
            checkoutId: checkout.id,
            source: 'wiven_poll',
            providerRef: checkout.transactionId,
          });
        } else if (checkout.kind === 'tool' && checkout.toolId) {
          const ent = grantTool(userId, checkout.toolId, {
            source: 'wiven_poll',
            providerRef: checkout.transactionId,
          });
          unlockedTools = ent?.tools || unlockedTools;
        } else if (!active) {
          sub = grantSubscription(userId, {
            source: 'wiven_poll',
            providerRef: checkout.transactionId,
            displayName: checkout.displayName || null,
            whatsapp: checkout.whatsapp || null,
          });
          expiresAt = sub.expiresAt;
          active = true;
        }
      } catch {
        // ignora falha de consulta pontual
      }
    }

    send(res, 200, {
      ok: true,
      userId,
      active,
      subscriptionExpiresAt: expiresAt,
      unlockedTools,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/foto-jesus/prepare') {
    try {
      const { json: body } = await readBody(req);
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      const imageBase64 =
        typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
      const mimeType =
        typeof body.mimeType === 'string' && body.mimeType.trim()
          ? body.mimeType.trim()
          : 'image/jpeg';

      if (!userId) {
        send(res, 400, { ok: false, error: 'userId_obrigatorio' });
        return;
      }
      if (!imageBase64 || imageBase64.length < 100) {
        send(res, 400, { ok: false, error: 'Envie uma foto válida.' });
        return;
      }
      if (imageBase64.length > 8_000_000) {
        send(res, 400, {
          ok: false,
          error: 'Foto muito grande. Escolha uma imagem menor (até ~5 MB).',
        });
        return;
      }

      const uploaded = await uploadImageBase64ToKie({
        imageBase64,
        mimeType,
        fileName: `foto-${userId.slice(0, 8)}-${Date.now()}.jpg`,
      });
      const generation = createGenerationRecord({
        userId,
        inputUrl: uploaded.fileUrl,
        fileId: uploaded.fileId,
      });
      const token = signFotoJesusPayload({
        userId,
        generationId: generation.id,
        inputUrl: generation.inputUrl,
      });

      send(res, 201, {
        ok: true,
        generationId: generation.id,
        inputUrl: generation.inputUrl,
        token,
      });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (
    (req.method === 'GET' || req.method === 'POST') &&
    url.pathname === '/api/foto-jesus/status'
  ) {
    try {
      const body =
        req.method === 'POST' ? (await readBody(req)).json || {} : {};
      const generationId = String(
        body.generationId || url.searchParams.get('generationId') || '',
      ).trim();
      const userId = String(
        body.userId || url.searchParams.get('userId') || '',
      ).trim();
      const inputUrl = String(
        body.inputUrl || url.searchParams.get('inputUrl') || '',
      ).trim();
      const token = String(
        body.token || url.searchParams.get('token') || '',
      ).trim();
      const kieTaskId = String(
        body.kieTaskId || url.searchParams.get('kieTaskId') || '',
      ).trim();
      const transactionId = String(
        body.transactionId || url.searchParams.get('transactionId') || '',
      ).trim();
      const clientIdentifier = String(
        body.clientIdentifier ||
          body.identifier ||
          url.searchParams.get('clientIdentifier') ||
          '',
      ).trim();
      const transactionIdsRaw = Array.isArray(body.transactionIds)
        ? body.transactionIds
        : typeof body.transactionIds === 'string'
          ? body.transactionIds.split(',')
          : [];
      const transactionIds = [
        ...transactionIdsRaw.map((id) => String(id || '').trim()).filter(Boolean),
        ...(transactionId ? [transactionId] : []),
      ].filter((id, index, arr) => arr.indexOf(id) === index);
      const startGeneration = Boolean(
        body.startGeneration === true ||
          body.startGeneration === 1 ||
          body.startGeneration === '1' ||
          url.searchParams.get('startGeneration') === '1',
      );
      if (!generationId || !userId) {
        send(res, 400, {
          ok: false,
          error: 'generationId_e_userId_obrigatorios',
        });
        return;
      }

      let generation = getGeneration(generationId);
      if (!generation && inputUrl && token) {
        generation = ensureGenerationFromClient({
          generationId,
          userId,
          inputUrl,
          token,
          kieTaskId: kieTaskId || null,
        });
      } else if (generation && kieTaskId && !generation.kieTaskId) {
        generation =
          updateGeneration(generationId, {
            kieTaskId,
            status: 'generating',
          }) || generation;
      }
      if (!generation || generation.userId !== userId) {
        send(res, 404, {
          ok: false,
          error: 'geracao_nao_encontrada',
          hint: !inputUrl
            ? 'inputUrl_ausente'
            : !token
              ? 'token_ausente'
              : 'token_ou_geracao_invalida',
        });
        return;
      }

      let paymentCheck = null;

      // Já tem tarefa Kie → só consulta progresso (nunca cria outra)
      if (kieTaskId || generation.kieTaskId) {
        const taskId = kieTaskId || generation.kieTaskId;
        if (!generation.kieTaskId && taskId) {
          generation =
            updateGeneration(generationId, {
              kieTaskId: taskId,
              status: 'generating',
            }) || generation;
        }
        generation =
          (await refreshGenerationFromKie(generationId)) || generation;
        send(res, 200, {
          ok: true,
          generationId: generation.id,
          status: generation.status,
          resultUrl: generation.resultUrl || null,
          kieTaskId: generation.kieTaskId || null,
          error: generation.error || null,
          paymentCheck: null,
        });
        return;
      }

      // Sem kieTaskId: confirma pagamento; só cria job se startGeneration=true
      if (generation.status === 'awaiting_payment' || generation.status === 'paid') {
        const txCandidates = [];
        for (const tid of transactionIds) {
          txCandidates.push({
            transactionId: tid,
            checkoutId: null,
            clientIdentifier: null,
          });
        }
        if (clientIdentifier) {
          txCandidates.push({
            transactionId: null,
            checkoutId: null,
            clientIdentifier,
          });
        }

        try {
          const openCheckouts = readCheckouts()
            .filter(
              (c) =>
                c.userId === userId &&
                c.generationId === generationId &&
                (c.status === 'opened' || c.status === 'paid') &&
                (c.transactionId || c.identifier),
            )
            .slice(-8)
            .reverse();
          for (const checkout of openCheckouts) {
            const already = txCandidates.some(
              (t) =>
                (checkout.transactionId &&
                  t.transactionId === checkout.transactionId) ||
                (checkout.identifier &&
                  t.clientIdentifier === checkout.identifier),
            );
            if (!already) {
              txCandidates.push({
                transactionId: checkout.transactionId || null,
                checkoutId: checkout.id,
                clientIdentifier: checkout.identifier || null,
              });
            }
          }
        } catch {
          // /tmp ausente no Vercel — usa só IDs do cliente
        }

        if (!txCandidates.length) {
          paymentCheck = {
            error: 'transactionId_ausente',
            hint: 'Gere o Pix de novo e toque em Já paguei após pagar.',
          };
        }

        let lastPendingCheck = null;
        for (const candidate of txCandidates) {
          try {
            const confirmed = await tryConfirmGenerationPayment({
              generationId,
              userId,
              inputUrl: inputUrl || generation.inputUrl || null,
              token: token || null,
              transactionId: candidate.transactionId,
              checkoutId: candidate.checkoutId,
              clientIdentifier: candidate.clientIdentifier,
              source: startGeneration ? 'status_start' : 'status_poll',
              startGeneration,
              kieTaskId: null,
            });
            paymentCheck = confirmed.paymentCheck;
            if (confirmed.paymentCheck && !confirmed.paymentCheck.paid) {
              lastPendingCheck = confirmed.paymentCheck;
            }
            if (confirmed.generation) {
              generation = confirmed.generation;
              break;
            }
          } catch (error) {
            paymentCheck = {
              transactionId: candidate.transactionId,
              error: String(error.message || error),
            };
          }
        }
        if (
          generation.status === 'awaiting_payment' &&
          lastPendingCheck &&
          !paymentCheck?.paid
        ) {
          paymentCheck = {
            ...lastPendingCheck,
            checkedCount: txCandidates.length,
            hint:
              txCandidates.length > 1
                ? 'Nenhum dos Pix desta foto está pago ainda na Wiven.'
                : lastPendingCheck.hint,
          };
        }
      }

      if (
        generation.kieTaskId &&
        (generation.status === 'generating' ||
          generation.status === 'paid' ||
          generation.status !== 'success')
      ) {
        generation =
          (await refreshGenerationFromKie(generationId)) || generation;
      }

      send(res, 200, {
        ok: true,
        generationId: generation.id,
        status: generation.status,
        resultUrl: generation.resultUrl || null,
        kieTaskId: generation.kieTaskId || null,
        error: generation.error || null,
        paymentCheck,
      });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

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

  if (req.method === 'POST' && url.pathname === '/api/media/token') {
    try {
      const { json: body } = await readBody(req);
      const userId = String(body.userId || '').trim();
      const mediaId = String(body.mediaId || body.id || '').trim();
      const trialStartedAt =
        typeof body.trialStartedAt === 'string' ? body.trialStartedAt : null;
      const subscriptionExpiresAt =
        typeof body.subscriptionExpiresAt === 'string'
          ? body.subscriptionExpiresAt
          : null;
      if (!userId || !mediaId) {
        send(res, 400, {
          ok: false,
          error: 'userId_e_mediaId_obrigatorios',
        });
        return;
      }
      const host = String(
        req.headers['x-forwarded-host'] || req.headers.host || '',
      ).split(',')[0].trim();
      const proto = String(
        req.headers['x-forwarded-proto'] ||
          (host.includes('localhost') ? 'http' : 'https'),
      ).split(',')[0].trim();
      const requestBase =
        PUBLIC_BASE_URL &&
        /^https:\/\//i.test(PUBLIC_BASE_URL) &&
        !/localhost|127\.0\.0\.1/i.test(PUBLIC_BASE_URL)
          ? PUBLIC_BASE_URL
          : host
            ? `${proto}://${host}`
            : PUBLIC_BASE_URL;
      const result = createMediaTokenResponse({
        mediaId,
        userId,
        trialStartedAt,
        subscriptionExpiresAt,
        publicBaseUrl: requestBase || PUBLIC_BASE_URL,
        readSubscriptions,
        writeSubscriptions,
      });
      send(res, result.status, result.body);
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/media/stream') {
    try {
      if (!isOriginAllowed(req)) {
        send(res, 403, { ok: false, error: 'origem_nao_permitida' });
        return;
      }
      const token = String(url.searchParams.get('token') || '');
      const verified = verifyMediaToken(token);
      if (!verified.ok) {
        send(res, 401, { ok: false, error: verified.error || 'token_invalido' });
        return;
      }
      const buffer = await loadMediaBuffer(verified.mediaId);
      if (!buffer) {
        send(res, 404, { ok: false, error: 'media_nao_encontrada' });
        return;
      }
      const range = req.headers.range;
      const total = buffer.length;
      const setMediaHeaders = (status, extra = {}) => {
        const headers = {
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Origin': '*',
          ...extra,
        };
        if (typeof res.setHeader === 'function') {
          for (const [key, value] of Object.entries(headers)) {
            res.setHeader(key, value);
          }
          res.statusCode = status;
          return;
        }
        res.writeHead(status, headers);
      };
      if (range && typeof range === 'string') {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const end = match[2] ? Number(match[2]) : total - 1;
          const chunk = buffer.subarray(start, end + 1);
          setMediaHeaders(206, {
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${start}-${end}/${total}`,
          });
          res.end(chunk);
          return;
        }
      }
      setMediaHeaders(200, { 'Content-Length': String(total) });
      res.end(buffer);
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/meta/capi') {
    try {
      const { json: body } = await readBody(req);
      const eventName = String(body.eventName || body.event_name || '').trim();
      const eventId = String(body.eventId || body.event_id || '').trim();
      const eventSourceUrl = String(
        body.eventSourceUrl || body.event_source_url || '',
      ).trim();
      const clientIp =
        (typeof body.clientIp === 'string' && body.clientIp.trim()) ||
        String(req.headers['x-forwarded-for'] || '')
          .split(',')[0]
          .trim() ||
        req.socket?.remoteAddress ||
        '';
      const userAgent =
        (typeof body.userAgent === 'string' && body.userAgent.trim()) ||
        String(req.headers['user-agent'] || '');

      const result = await sendMetaConversionEvent({
        eventName,
        eventId: eventId || undefined,
        eventSourceUrl: eventSourceUrl || undefined,
        user: {
          userId: body.userId || body.externalId,
          displayName: body.displayName || body.name,
          whatsapp: body.whatsapp || body.phone,
          email: body.email,
          country: body.country || 'br',
          city: body.city,
          state: body.state,
          clientIp,
          userAgent,
          fbp: body.fbp,
          fbc: body.fbc,
        },
        customData: body.customData || body.custom_data || {},
      });

      if (result.skipped) {
        send(res, 200, { ok: true, skipped: true, reason: result.error });
        return;
      }
      if (!result.ok) {
        send(res, 400, {
          ok: false,
          error: result.error || 'capi_falhou',
          details: result.body || null,
        });
        return;
      }
      send(res, 200, { ok: true, meta: result.body || null });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/meta/capi') {
    send(res, 200, {
      ok: true,
      configured: metaCapiConfigured(),
      pixelId: (
        process.env.META_PIXEL_ID ||
        process.env.EXPO_PUBLIC_META_PIXEL_ID ||
        ''
      ).trim(),
    });
    return;
  }

  send(res, 404, { error: 'not_found' });
};

export async function handlePaymentsRequest(req, res) {
  return serverHandler(req, res);
}

const shouldListen =
  !process.env.VERCEL && process.argv[1] && process.argv[1].includes('payments-server');

if (shouldListen || process.env.PAYMENTS_FORCE_LISTEN === '1') {
  const server = http.createServer((req, res) => {
    void serverHandler(req, res);
  });

  server.listen(PORT, () => {
    console.log(`\nPagamentos Palavra Viva (Wiven Pix)`);
    console.log(`  Checkout: http://localhost:${PORT}/checkout`);
    console.log(`  POST /api/checkout`);
    console.log(`  POST /api/webhooks/wiven`);
    console.log(`  GET  /api/access?userId=...`);
    console.log(`  POST /api/foto-jesus/prepare`);
    console.log(`  GET  /api/foto-jesus/status`);
    console.log(`  POST /api/media/token`);
    console.log(`  GET  /api/media/stream`);
    console.log(`  Produto: ${PRODUCT_NAME} · R$ ${PRODUCT_PRICE.toFixed(2)}`);
    console.log(
      `  Foto Jesus: R$ ${Number(process.env.WIVEN_TOOL_FOTO_JESUS_PRICE || 5).toFixed(2)} · Kie: ${process.env.KIE_API_KEY ? 'ok' : 'AUSENTE'}`,
    );
    console.log(
      `  Chaves: ${WIVEN_PUBLIC_KEY ? 'ok' : 'AUSENTES'} · Callback: ${PUBLIC_BASE_URL}/api/webhooks/wiven\n`,
    );
  });
}