import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const eventsPath = path.join(dataDir, 'events.json');
const usersPath = path.join(dataDir, 'users.json');
const subscriptionsPath = path.join(dataDir, 'subscriptions.json');
const checkoutsPath = path.join(dataDir, 'checkouts.json');
const generationsPath = path.join(dataDir, 'foto-jesus-generations.json');
const PORT = Number(process.env.ANALYTICS_PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'palavraviva';
const SUBSCRIPTION_DAYS = Number(process.env.SUBSCRIPTION_DAYS || 30);
const PRICE_SUBSCRIPTION = Number(process.env.WIVEN_PRODUCT_PRICE || 19.9);
const PRICE_FOTO_JESUS = Number(process.env.WIVEN_TOOL_FOTO_JESUS_PRICE || 5);
const PRICE_DIARIO = Number(process.env.WIVEN_TOOL_DIARIO_PRICE || 29.9);

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(eventsPath)) {
  fs.writeFileSync(eventsPath, '[]', 'utf8');
}
if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, '{}', 'utf8');
}
if (!fs.existsSync(subscriptionsPath)) {
  fs.writeFileSync(subscriptionsPath, '{}', 'utf8');
}
if (!fs.existsSync(checkoutsPath)) {
  fs.writeFileSync(checkoutsPath, '[]', 'utf8');
}
if (!fs.existsSync(generationsPath)) {
  fs.writeFileSync(generationsPath, '{}', 'utf8');
}

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

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeEvents(events) {
  // Mantém no máximo ~50k eventos
  const trimmed = events.slice(-50_000);
  fs.writeFileSync(eventsPath, JSON.stringify(trimmed), 'utf8');
}

function readUsers() {
  try {
    const raw = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

function readSubscriptions() {
  try {
    const raw = JSON.parse(fs.readFileSync(subscriptionsPath, 'utf8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function readCheckouts() {
  try {
    const raw = JSON.parse(fs.readFileSync(checkoutsPath, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeSubscriptions(data) {
  fs.writeFileSync(subscriptionsPath, JSON.stringify(data, null, 2), 'utf8');
}

function writeCheckouts(data) {
  fs.writeFileSync(
    checkoutsPath,
    JSON.stringify(Array.isArray(data) ? data.slice(-5_000) : [], null, 2),
    'utf8',
  );
}

async function pullRemotePaymentsSnapshot() {
  const remote = (
    process.env.PAYMENTS_SNAPSHOT_URL ||
    process.env.PAYMENTS_PUBLIC_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  if (!remote || /localhost|127\.0\.0\.1/i.test(remote)) return;
  const password =
    process.env.ADMIN_PASSWORD ||
    process.env.ANALYTICS_SYNC_SECRET ||
    'palavraviva';
  try {
    const res = await fetch(`${remote}/api/admin/snapshot`, {
      headers: { 'x-admin-password': password },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.subscriptions && typeof data.subscriptions === 'object') {
      for (const sub of Object.values(data.subscriptions)) {
        upsertSubscriptionRecord(sub);
      }
    }
    if (Array.isArray(data?.checkouts)) {
      for (const checkout of data.checkouts) {
        upsertCheckoutRecord(checkout);
      }
    }
  } catch {
    // snapshot remoto é opcional
  }
}

function upsertSubscriptionRecord(sub) {
  if (!sub?.userId || !sub.expiresAt) return null;
  const id = String(sub.userId).trim();
  const subs = readSubscriptions();
  const current = subs[id] || {};
  const nextExpires = Date.parse(sub.expiresAt);
  const curExpires = current.expiresAt ? Date.parse(current.expiresAt) : 0;
  const expiresAt =
    Number.isFinite(nextExpires) && nextExpires >= curExpires
      ? new Date(nextExpires).toISOString()
      : current.expiresAt || sub.expiresAt;
  subs[id] = {
    ...current,
    ...sub,
    userId: id,
    expiresAt,
    updatedAt: sub.updatedAt || new Date().toISOString(),
    cancelledAt: null,
  };
  writeSubscriptions(subs);
  return subs[id];
}

function upsertCheckoutRecord(checkout) {
  if (!checkout || typeof checkout !== 'object') return;
  const all = readCheckouts();
  const idx = all.findIndex(
    (c) =>
      (checkout.id && c.id === checkout.id) ||
      (checkout.transactionId &&
        c.transactionId === checkout.transactionId),
  );
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...checkout };
  } else {
    all.push({
      ...checkout,
      id: checkout.id || `ck_sync_${Date.now().toString(36)}`,
      createdAt: checkout.createdAt || new Date().toISOString(),
    });
  }
  writeCheckouts(all);
}

/** Evento do app → assinatura estimada (+30 dias) no painel. */
function ingestSubscriptionFromEvent(event) {
  const userId = event.userId;
  if (!userId) return;
  if (event.name === 'subscription_start') {
    upsertCheckoutRecord({
      id: `ck_start_${event.id || Date.now().toString(36)}`,
      userId,
      method: String(event.meta?.method || '—'),
      product: 'subscription',
      kind: 'subscription',
      displayName: event.displayName || null,
      whatsapp: event.whatsapp || null,
      status: 'opened',
      createdAt: event.occurredAt || new Date().toISOString(),
    });
    return;
  }
  const when = Date.parse(event.occurredAt || event.receivedAt || Date.now());
  const base = Number.isFinite(when) ? when : Date.now();
  const expiresAt = new Date(
    base + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  upsertSubscriptionRecord({
    userId,
    expiresAt,
    updatedAt: new Date().toISOString(),
    source: 'app_activated',
    displayName: event.displayName || null,
    whatsapp: event.whatsapp || null,
    providerRef:
      typeof event.meta?.transactionId === 'string'
        ? event.meta.transactionId
        : null,
  });
  upsertCheckoutRecord({
    id: `ck_evt_${event.id || Date.now().toString(36)}`,
    userId,
    method: String(event.meta?.method || '—'),
    product: 'subscription',
    kind: 'subscription',
    displayName: event.displayName || null,
    whatsapp: event.whatsapp || null,
    status: 'paid',
    createdAt: event.occurredAt || new Date().toISOString(),
    paidAt: event.occurredAt || new Date().toISOString(),
    transactionId:
      typeof event.meta?.transactionId === 'string'
        ? event.meta.transactionId
        : null,
  });
}

function ingestCheckoutFromEvent(event) {
  const userId = event.userId;
  if (!userId) return;
  const product =
    event.meta?.toolId === 'diario' || event.meta?.product === 'tool-diario'
      ? 'tool-diario'
      : 'tool-foto-jesus';
  upsertCheckoutRecord({
    id: `ck_evt_${event.id || Date.now().toString(36)}`,
    userId,
    method: String(event.meta?.method || 'pix'),
    product,
    kind: product === 'tool-foto-jesus' ? 'generation' : 'tool',
    displayName: event.displayName || null,
    whatsapp: event.whatsapp || null,
    status: 'paid',
    createdAt: event.occurredAt || new Date().toISOString(),
    paidAt: event.occurredAt || new Date().toISOString(),
    generationId:
      typeof event.meta?.generationId === 'string'
        ? event.meta.generationId
        : null,
  });
}

function readGenerations() {
  try {
    const raw = JSON.parse(fs.readFileSync(generationsPath, 'utf8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function productMeta(checkout) {
  const product = checkout?.product || '';
  const kind = checkout?.kind || '';
  if (product === 'tool-foto-jesus' || kind === 'generation') {
    return { key: 'foto-jesus', label: 'Foto com Jesus', price: PRICE_FOTO_JESUS };
  }
  if (product === 'tool-diario' || kind === 'tool') {
    return { key: 'diario', label: 'Diário de Gratidão', price: PRICE_DIARIO };
  }
  return { key: 'subscription', label: 'Missão+', price: PRICE_SUBSCRIPTION };
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function listPayments() {
  const users = readUsers();
  return readCheckouts()
    .slice()
    .sort(
      (a, b) =>
        Date.parse(b.paidAt || b.createdAt || 0) -
        Date.parse(a.paidAt || a.createdAt || 0),
    )
    .slice(0, 150)
    .map((checkout) => {
      const meta = productMeta(checkout);
      const profile = users[checkout.userId] || {};
      const displayName =
        checkout.displayName || profile.displayName || null;
      const whatsapp = checkout.whatsapp || profile.whatsapp || null;
      return {
        id: checkout.id,
        userId: checkout.userId || null,
        displayName,
        whatsapp,
        whatsappLink: formatWhatsapp(whatsapp),
        product: meta.key,
        productLabel: meta.label,
        price: meta.price,
        priceLabel: formatMoney(meta.price),
        method: checkout.method || '—',
        status: checkout.status || '—',
        transactionId: checkout.transactionId || null,
        generationId: checkout.generationId || null,
        createdAt: checkout.createdAt || null,
        paidAt: checkout.paidAt || null,
      };
    });
}

function listFotoJesusOrders() {
  const users = readUsers();
  const generations = readGenerations();
  const checkouts = readCheckouts().filter(
    (c) => c.product === 'tool-foto-jesus' || c.kind === 'generation',
  );
  const byGeneration = new Map(
    checkouts
      .filter((c) => c.generationId)
      .map((c) => [c.generationId, c]),
  );

  return Object.values(generations)
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))
    .slice(0, 100)
    .map((gen) => {
      const checkout = byGeneration.get(gen.id) || {};
      const profile = users[gen.userId] || {};
      const displayName =
        checkout.displayName || profile.displayName || null;
      const whatsapp = checkout.whatsapp || profile.whatsapp || null;
      const paid = checkout.status === 'paid' || Boolean(gen.paidAt);
      return {
        id: gen.id,
        userId: gen.userId || null,
        displayName,
        whatsapp,
        whatsappLink: formatWhatsapp(whatsapp),
        status: gen.status || '—',
        paymentStatus: paid ? 'paid' : checkout.status || '—',
        priceLabel: formatMoney(PRICE_FOTO_JESUS),
        transactionId: checkout.transactionId || null,
        resultUrl: gen.resultUrl || null,
        createdAt: gen.createdAt || null,
        paidAt: gen.paidAt || checkout.paidAt || null,
      };
    });
}

function subscriptionCheckoutByUser() {
  const map = new Map();
  for (const checkout of readCheckouts()) {
    if (!checkout?.userId) continue;
    if (checkout.product && checkout.product !== 'subscription') continue;
    if (checkout.kind && checkout.kind !== 'subscription') continue;
    const prev = map.get(checkout.userId);
    const prevAt = Date.parse(prev?.paidAt || prev?.createdAt || 0);
    const nextAt = Date.parse(checkout.paidAt || checkout.createdAt || 0);
    if (!prev || nextAt >= prevAt) map.set(checkout.userId, checkout);
  }
  return map;
}

function mapSubscriptionRow(sub, checkoutByUser, users, now = Date.now()) {
  const profile = users[sub.userId] || {};
  const checkout = checkoutByUser.get(sub.userId) || {};
  const displayName =
    sub.displayName || profile.displayName || checkout.displayName || null;
  const whatsapp =
    sub.whatsapp || profile.whatsapp || checkout.whatsapp || null;
  const expiresMs = Date.parse(sub.expiresAt);
  const active = Number.isFinite(expiresMs) && expiresMs > now;
  return {
    userId: sub.userId,
    displayName,
    whatsapp,
    whatsappLink: formatWhatsapp(whatsapp),
    expiresAt: sub.expiresAt,
    updatedAt: sub.updatedAt || null,
    cancelledAt: sub.cancelledAt || null,
    source: sub.source || checkout.method || '—',
    providerRef: sub.providerRef || checkout.transactionId || null,
    active,
    daysLeft: active
      ? Math.max(0, Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000)))
      : 0,
  };
}

/** Assinaturas registradas (ativas e expiradas). */
function listSubscriptions() {
  const now = Date.now();
  const users = readUsers();
  const checkoutByUser = subscriptionCheckoutByUser();
  return Object.values(readSubscriptions())
    .filter(
      (sub) =>
        sub?.userId &&
        typeof sub.expiresAt === 'string' &&
        Number.isFinite(Date.parse(sub.expiresAt)),
    )
    .map((sub) => {
      const row = mapSubscriptionRow(sub, checkoutByUser, users, now);
      return { ...row, status: row.active ? 'active' : 'expired' };
    })
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return Date.parse(a.expiresAt) - Date.parse(b.expiresAt);
    });
}

/**
 * Lista para gerenciar no admin: assinaturas + contatos/checkouts
 * que ainda não têm Missão+ (ex.: Humberto só com Foto com Jesus).
 */
function listManageableSubscriptions() {
  const existing = listSubscriptions();
  const seen = new Set(existing.map((s) => s.userId));
  const extras = [];

  const pushExtra = ({ userId, displayName, whatsapp, source, updatedAt, providerRef }) => {
    if (!userId || seen.has(userId)) return;
    if (!displayName && !whatsapp) return;
    seen.add(userId);
    extras.push({
      userId,
      displayName: displayName || null,
      whatsapp: whatsapp || null,
      whatsappLink: formatWhatsapp(whatsapp),
      expiresAt: null,
      updatedAt: updatedAt || null,
      cancelledAt: null,
      source: source || '—',
      providerRef: providerRef || null,
      active: false,
      daysLeft: 0,
      status: 'none',
    });
  };

  for (const user of Object.values(readUsers())) {
    pushExtra({
      userId: user.userId,
      displayName: user.displayName,
      whatsapp: user.whatsapp,
      source: user.source,
      updatedAt: user.lastSeenAt,
    });
  }

  for (const checkout of readCheckouts()) {
    pushExtra({
      userId: checkout.userId,
      displayName: checkout.displayName,
      whatsapp: checkout.whatsapp,
      source: checkout.method,
      updatedAt: checkout.paidAt || checkout.createdAt,
      providerRef: checkout.transactionId,
    });
  }

  const rank = { active: 0, expired: 1, none: 2 };
  return [...existing, ...extras].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return String(a.displayName || a.userId || '').localeCompare(
      String(b.displayName || b.userId || ''),
      'pt-BR',
    );
  });
}

/** Assinaturas Missão+ ainda válidas (expiresAt no futuro). */
function listActiveSubscriptions() {
  return listSubscriptions().filter((s) => s.active);
}

function adminGrantSubscription(
  userId,
  { days = SUBSCRIPTION_DAYS, displayName, whatsapp, source = 'admin' } = {},
) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const daysNum = Math.max(1, Math.min(3650, Number(days) || SUBSCRIPTION_DAYS));
  const subs = readSubscriptions();
  const now = Date.now();
  const current = subs[id] || {};
  const currentExpires = current.expiresAt ? Date.parse(current.expiresAt) : 0;
  const base = currentExpires > now ? currentExpires : now;
  const expiresAt = new Date(base + daysNum * 24 * 60 * 60 * 1000).toISOString();
  const profile = readUsers()[id] || {};

  subs[id] = {
    ...current,
    userId: id,
    expiresAt,
    updatedAt: new Date().toISOString(),
    source,
    displayName:
      (typeof displayName === 'string' && displayName.trim()) ||
      current.displayName ||
      profile.displayName ||
      null,
    whatsapp:
      (typeof whatsapp === 'string' && whatsapp.replace(/\D/g, '')) ||
      current.whatsapp ||
      profile.whatsapp ||
      null,
    cancelledAt: null,
  };
  writeSubscriptions(subs);
  return subs[id];
}

function adminCancelSubscription(userId) {
  const id = String(userId || '').trim();
  const subs = readSubscriptions();
  if (!id || !subs[id]) return null;
  subs[id] = {
    ...subs[id],
    expiresAt: new Date(Date.now() - 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    cancelledAt: new Date().toISOString(),
    source: subs[id].source || 'admin',
  };
  writeSubscriptions(subs);
  return subs[id];
}

function adminSetExpires(userId, expiresAt) {
  const id = String(userId || '').trim();
  const parsed = Date.parse(expiresAt);
  const subs = readSubscriptions();
  if (!id || !Number.isFinite(parsed)) return null;
  const current = subs[id] || { userId: id };
  const profile = readUsers()[id] || {};
  subs[id] = {
    ...current,
    userId: id,
    expiresAt: new Date(parsed).toISOString(),
    updatedAt: new Date().toISOString(),
    source: current.source || 'admin',
    displayName: current.displayName || profile.displayName || null,
    whatsapp: current.whatsapp || profile.whatsapp || null,
    cancelledAt: parsed > Date.now() ? null : new Date().toISOString(),
  };
  writeSubscriptions(subs);
  return subs[id];
}

function isWeakCity(city) {
  if (!city || typeof city !== 'string') return true;
  const normalized = city.trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'local' ||
    normalized === 'desconhecida' ||
    normalized === 'unknown' ||
    normalized === '—' ||
    normalized === '-'
  );
}

/** DDD → cidade principal (Brasil). */
const DDD_CITY = {
  11: ['São Paulo', 'SP'],
  12: ['São José dos Campos', 'SP'],
  13: ['Santos', 'SP'],
  14: ['Bauru', 'SP'],
  15: ['Sorocaba', 'SP'],
  16: ['Ribeirão Preto', 'SP'],
  17: ['São José do Rio Preto', 'SP'],
  18: ['Presidente Prudente', 'SP'],
  19: ['Campinas', 'SP'],
  21: ['Rio de Janeiro', 'RJ'],
  22: ['Campos dos Goytacazes', 'RJ'],
  24: ['Volta Redonda', 'RJ'],
  27: ['Vitória', 'ES'],
  28: ['Cachoeiro de Itapemirim', 'ES'],
  31: ['Belo Horizonte', 'MG'],
  32: ['Juiz de Fora', 'MG'],
  33: ['Governador Valadares', 'MG'],
  34: ['Uberlândia', 'MG'],
  35: ['Poços de Caldas', 'MG'],
  37: ['Divinópolis', 'MG'],
  38: ['Montes Claros', 'MG'],
  41: ['Curitiba', 'PR'],
  42: ['Ponta Grossa', 'PR'],
  43: ['Londrina', 'PR'],
  44: ['Maringá', 'PR'],
  45: ['Cascavel', 'PR'],
  46: ['Francisco Beltrão', 'PR'],
  47: ['Joinville', 'SC'],
  48: ['Florianópolis', 'SC'],
  49: ['Chapecó', 'SC'],
  51: ['Porto Alegre', 'RS'],
  53: ['Pelotas', 'RS'],
  54: ['Caxias do Sul', 'RS'],
  55: ['Santa Maria', 'RS'],
  61: ['Brasília', 'DF'],
  62: ['Goiânia', 'GO'],
  63: ['Palmas', 'TO'],
  64: ['Rio Verde', 'GO'],
  65: ['Cuiabá', 'MT'],
  66: ['Rondonópolis', 'MT'],
  67: ['Campo Grande', 'MS'],
  68: ['Rio Branco', 'AC'],
  69: ['Porto Velho', 'RO'],
  71: ['Salvador', 'BA'],
  73: ['Ilhéus', 'BA'],
  74: ['Juazeiro', 'BA'],
  75: ['Feira de Santana', 'BA'],
  77: ['Barreiras', 'BA'],
  79: ['Aracaju', 'SE'],
  81: ['Recife', 'PE'],
  82: ['Maceió', 'AL'],
  83: ['João Pessoa', 'PB'],
  84: ['Natal', 'RN'],
  85: ['Fortaleza', 'CE'],
  86: ['Teresina', 'PI'],
  87: ['Petrolina', 'PE'],
  88: ['Juazeiro do Norte', 'CE'],
  89: ['Picos', 'PI'],
  91: ['Belém', 'PA'],
  92: ['Manaus', 'AM'],
  93: ['Santarém', 'PA'],
  94: ['Marabá', 'PA'],
  95: ['Boa Vista', 'RR'],
  96: ['Macapá', 'AP'],
  97: ['Coari', 'AM'],
  98: ['São Luís', 'MA'],
  99: ['Imperatriz', 'MA'],
};

function geoFromWhatsapp(whatsapp) {
  const digits = String(whatsapp || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const national = digits.startsWith('55') ? digits.slice(2) : digits;
  if (national.length < 10) return null;
  const ddd = Number(national.slice(0, 2));
  const hit = DDD_CITY[ddd];
  if (!hit) return null;
  return {
    city: hit[0],
    region: hit[1],
    country: 'BR',
    lat: null,
    lon: null,
    source: 'ddd',
  };
}

function normalizeClientGeo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const city = typeof raw.city === 'string' ? raw.city.trim() : '';
  if (isWeakCity(city)) return null;
  return {
    city,
    region: typeof raw.region === 'string' ? raw.region.trim() : '',
    country: typeof raw.country === 'string' ? raw.country.trim() : '',
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lon: typeof raw.lon === 'number' ? raw.lon : null,
    source: 'client',
  };
}

function pickBestGeo(...candidates) {
  for (const geo of candidates) {
    if (geo && !isWeakCity(geo.city)) return geo;
  }
  return candidates.find((g) => g && g.city) || {
    city: 'Desconhecida',
    region: '',
    country: '',
    lat: null,
    lon: null,
  };
}

function upsertUserProfile(event) {
  const key = event.userId || null;
  if (!key) return;

  const users = readUsers();
  const prev = users[key] || {
    userId: key,
    displayName: null,
    whatsapp: null,
    city: null,
    region: null,
    country: null,
    source: null,
    platform: null,
    firstSeenAt: event.occurredAt,
    lastSeenAt: event.occurredAt,
    events: 0,
  };

  const nextWhatsapp = event.whatsapp || prev.whatsapp;
  const fromEvent = event.geo && !isWeakCity(event.geo.city) ? event.geo : null;
  const fromPrev = !isWeakCity(prev.city)
    ? { city: prev.city, region: prev.region, country: prev.country }
    : null;
  const fromDdd = geoFromWhatsapp(nextWhatsapp);
  const best = pickBestGeo(fromEvent, fromPrev, fromDdd, event.geo);

  users[key] = {
    ...prev,
    displayName: event.displayName || prev.displayName,
    whatsapp: nextWhatsapp,
    city: best.city || prev.city,
    region: best.region || prev.region,
    country: best.country || prev.country,
    source: event.attribution?.source || prev.source,
    platform: event.platform || prev.platform,
    firstSeenAt: prev.firstSeenAt || event.occurredAt,
    lastSeenAt:
      Date.parse(event.occurredAt) >= Date.parse(prev.lastSeenAt || 0)
        ? event.occurredAt
        : prev.lastSeenAt,
    events: (prev.events || 0) + 1,
  };

  writeUsers(users);
}

function formatWhatsapp(digits) {
  if (!digits) return null;
  const clean = String(digits).replace(/\D/g, '');
  if (clean.length < 10) return clean;
  const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
  return withCountry;
}

function send(res, status, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
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
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  const candidates = [
    req.headers['cf-connecting-ip'],
    req.headers['true-client-ip'],
    req.headers['x-real-ip'],
    req.headers['x-vercel-forwarded-for'],
    req.headers['x-forwarded-for'],
  ];
  for (const value of candidates) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const first = value.split(',')[0].trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || '';
}

function isPrivateIp(ip) {
  const clean = (ip || '').replace('::ffff:', '');
  return (
    !clean ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('192.168.') ||
    clean.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean)
  );
}

async function lookupGeo(ip) {
  const clean = (ip || '').replace('::ffff:', '');
  if (isPrivateIp(clean)) {
    return {
      city: 'Local',
      region: '',
      country: 'BR',
      lat: null,
      lon: null,
      source: 'private_ip',
    };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,city,regionName,country,lat,lon`,
    );
    const data = await response.json();
    if (data.status !== 'success') {
      return { city: 'Desconhecida', region: '', country: '', lat: null, lon: null };
    }
    return {
      city: data.city || 'Desconhecida',
      region: data.regionName || '',
      country: data.country || '',
      lat: data.lat ?? null,
      lon: data.lon ?? null,
      source: 'ip',
    };
  } catch {
    return { city: 'Desconhecida', region: '', country: '', lat: null, lon: null };
  }
}

async function resolveEventGeo(req, body) {
  const ipGeo = await lookupGeo(clientIp(req));
  const clientGeo = normalizeClientGeo(body?.clientGeo);
  const dddGeo = geoFromWhatsapp(body?.whatsapp);
  return pickBestGeo(clientGeo, ipGeo, dddGeo);
}

function enrichCityLabel(city, region, whatsapp) {
  if (!isWeakCity(city)) {
    return region ? `${city}/${region}` : city;
  }
  const ddd = geoFromWhatsapp(whatsapp);
  if (ddd) return `${ddd.city}/${ddd.region}`;
  return city || '—';
}

function isAuthorized(req, url) {
  const header = req.headers['x-admin-password'];
  const queryPass = url.searchParams.get('password');
  const password = process.env.ADMIN_PASSWORD || ADMIN_PASSWORD;
  return header === password || queryPass === password;
}

function topCounts(items, keyFn, limit = 10) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const prev = map.get(key) || { key, count: 0, label: key };
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function buildStats(events) {
  // fire-and-forget: puxa assinaturas/checkouts da produção se configurado
  void pullRemotePaymentsSnapshot();

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const recent = events.filter((e) => Date.parse(e.occurredAt) >= weekAgo);
  const today = events.filter((e) => Date.parse(e.occurredAt) >= dayAgo);

  // Enriquece cadastros antigos com cidade pelo DDD quando só havia "Local"
  const usersMap = readUsers();
  let usersDirty = false;
  for (const user of Object.values(usersMap)) {
    if (!user?.whatsapp || !isWeakCity(user.city)) continue;
    const ddd = geoFromWhatsapp(user.whatsapp);
    if (!ddd) continue;
    user.city = ddd.city;
    user.region = ddd.region;
    user.country = ddd.country;
    usersDirty = true;
  }
  if (usersDirty) writeUsers(usersMap);

  const contacts = Object.values(usersMap)
    .filter((u) => u.displayName || u.whatsapp)
    .sort((a, b) => Date.parse(b.lastSeenAt || 0) - Date.parse(a.lastSeenAt || 0));

  const subscriptions = listManageableSubscriptions();
  const activeSubscriptions = subscriptions.filter((s) => s.active);
  const payments = listPayments();
  const fotoJesusOrders = listFotoJesusOrders();
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const paidSubscriptions = paidPayments.filter((p) => p.product === 'subscription');
  const paidFotoJesus = paidPayments.filter((p) => p.product === 'foto-jesus');
  const revenuePaid = paidPayments.reduce((sum, p) => sum + (p.price || 0), 0);

  const onlineWindow = now - 2 * 60 * 1000;
  const onlineMap = new Map();
  for (const event of events) {
    if (event.name !== 'presence' && event.name !== 'app_open') continue;
    const t = Date.parse(event.occurredAt);
    if (t < onlineWindow) continue;
    const key = event.userId || event.sessionId;
    if (!key) continue;
    onlineMap.set(key, event);
  }

  const listens = recent.filter((e) => e.name === 'listen_start');
  const reads = recent.filter((e) => e.name === 'read_open');
  const opens = recent.filter((e) => e.name === 'app_open');
  const screens = recent.filter((e) => e.name === 'screen_view');

  const cityEvents = recent
    .map((e) => {
      const label = enrichCityLabel(e.geo?.city, e.geo?.region, e.whatsapp);
      if (isWeakCity(label.split('/')[0])) return null;
      return { event: e, label };
    })
    .filter(Boolean);

  const cities = topCounts(cityEvents, (row) => row.label, 15).map((row) => {
    const sample = cityEvents.find((c) => c.label === row.key)?.event;
    const ddd = isWeakCity(sample?.geo?.city)
      ? geoFromWhatsapp(sample?.whatsapp)
      : null;
    return {
      ...row,
      lat: sample?.geo?.lat ?? ddd?.lat ?? null,
      lon: sample?.geo?.lon ?? ddd?.lon ?? null,
      country: sample?.geo?.country || ddd?.country || '',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      events7d: recent.length,
      opens7d: opens.length,
      listens7d: listens.length,
      reads7d: reads.length,
      opens24h: today.filter((e) => e.name === 'app_open').length,
      onlineNow: onlineMap.size,
      contacts: contacts.length,
      withWhatsapp: contacts.filter((u) => u.whatsapp).length,
      activeSubscriptions: activeSubscriptions.length,
      paidCheckouts: paidPayments.length,
      paidSubscriptions: paidSubscriptions.length,
      paidFotoJesus: paidFotoJesus.length,
      revenuePaid,
      revenuePaidLabel: formatMoney(revenuePaid),
    },
    activeSubscriptions,
    subscriptions,
    payments,
    fotoJesusOrders,
    online: [...onlineMap.values()].map((e) => {
      const profile = e.userId ? usersMap[e.userId] : null;
      return {
        userId: e.userId,
        displayName: e.displayName || profile?.displayName || null,
        whatsapp: e.whatsapp || profile?.whatsapp || null,
        whatsappLink: formatWhatsapp(e.whatsapp || profile?.whatsapp),
        sessionId: e.sessionId,
        city: enrichCityLabel(
          e.geo?.city || profile?.city,
          e.geo?.region || profile?.region,
          e.whatsapp || profile?.whatsapp,
        ),
        source: e.attribution?.source || '—',
        at: e.occurredAt,
      };
    }),
    contacts: contacts.map((u) => ({
      userId: u.userId,
      displayName: u.displayName || null,
      whatsapp: u.whatsapp || null,
      whatsappLink: formatWhatsapp(u.whatsapp),
      city: enrichCityLabel(u.city, u.region, u.whatsapp),
      source: u.source || '—',
      platform: u.platform || '—',
      firstSeenAt: u.firstSeenAt,
      lastSeenAt: u.lastSeenAt,
      events: u.events || 0,
    })),
    users: contacts.slice(0, 80),
    topListened: topCounts(
      listens,
      (e) => e.contentTitle || e.contentId || 'sem-titulo',
      12,
    ),
    topRead: topCounts(
      reads,
      (e) => e.contentTitle || e.contentId || 'sem-titulo',
      12,
    ),
    topScreens: topCounts(screens, (e) => e.path || '—', 12),
    topSources: topCounts(
      recent,
      (e) => e.attribution?.source || 'desconhecido',
      12,
    ),
    cities,
    recentEvents: recent
      .slice(-40)
      .reverse()
      .map((e) => ({
        name: e.name,
        title: e.contentTitle || e.path || '',
        displayName: e.displayName || null,
        whatsapp: e.whatsapp || null,
        whatsappLink: formatWhatsapp(e.whatsapp),
        city: enrichCityLabel(e.geo?.city, e.geo?.region, e.whatsapp),
        source: e.attribution?.source || '—',
        at: e.occurredAt,
      })),
  };
}

function backfillUsersFromEvents() {
  const users = readUsers();
  if (Object.keys(users).length > 0) return;
  const events = readEvents();
  for (const event of events) {
    if (event.userId && (event.displayName || event.whatsapp)) {
      upsertUserProfile(event);
    }
  }
}

const adminHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Painel · Palavra Viva</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root {
      --bg: #121A21;
      --elev: #1A2430;
      --soft: #222E3A;
      --border: #2C3A48;
      --text: #F2F5F7;
      --muted: #8A97A5;
      --accent: #3DDC97;
      --sos: #F07167;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(1200px 500px at 10% -10%, rgba(61,220,151,.12), transparent), var(--bg);
      color: var(--text);
    }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      position: sticky; top: 0; background: rgba(18,26,33,.92); backdrop-filter: blur(8px); z-index: 5;
    }
    h1 { margin: 0; font-size: 1.25rem; }
    h1 span { color: var(--accent); }
    .wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .login {
      max-width: 420px; margin: 80px auto; background: var(--elev);
      border: 1px solid var(--border); border-radius: 16px; padding: 24px;
    }
    input, button, select {
      width: 100%; border-radius: 10px; border: 1px solid var(--border);
      background: var(--soft); color: var(--text); padding: 12px 14px; font-size: 1rem;
    }
    button {
      background: var(--accent); color: #102018; border: none; font-weight: 700;
      cursor: pointer; margin-top: 10px;
    }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    .card {
      background: var(--elev); border: 1px solid var(--border); border-radius: 14px; padding: 16px;
    }
    .card .label { color: var(--muted); font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
    .card .value { font-size: 1.8rem; font-weight: 700; margin-top: 6px; color: var(--accent); }
    .cols { display: grid; gap: 14px; grid-template-columns: 1.2fr 1fr; margin-top: 14px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    h2 { font-size: 1rem; margin: 0 0 12px; }
    ol { margin: 0; padding-left: 18px; color: var(--muted); }
    li { margin: 6px 0; }
    li strong { color: var(--text); }
    #map { height: 340px; border-radius: 12px; border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 600; }
    .muted { color: var(--muted); }
    .pill {
      display: inline-block; padding: 2px 8px; border-radius: 999px;
      background: rgba(61,220,151,.15); color: var(--accent); font-size: .75rem;
    }
    a.wa { color: var(--accent); text-decoration: none; font-weight: 600; }
    a.wa:hover { text-decoration: underline; }
    .section-note { color: var(--muted); font-size: .85rem; margin: -4px 0 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .btn-sm {
      width: auto; margin: 0; padding: 6px 10px; font-size: .78rem; border-radius: 8px;
      background: var(--soft); color: var(--text); border: 1px solid var(--border); font-weight: 600;
    }
    .btn-sm.ok { background: rgba(61,220,151,.18); color: var(--accent); border-color: transparent; }
    .btn-sm.danger { background: rgba(240,113,103,.16); color: var(--sos); border-color: transparent; }
    .grant-row {
      display: grid; gap: 8px; grid-template-columns: 1.4fr 1fr 100px auto;
      margin-bottom: 14px; align-items: end;
    }
    @media (max-width: 900px) { .grant-row { grid-template-columns: 1fr; } }
    .grant-row label { display: block; color: var(--muted); font-size: .75rem; margin-bottom: 4px; }
    .grant-row input, .grant-row select { margin: 0; }
    .status-paid { color: var(--accent); font-weight: 600; }
    .status-opened { color: #E8C547; font-weight: 600; }
    .status-expired { color: var(--sos); }
    .status-active { color: var(--accent); }
    a.result { color: var(--accent); }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const app = document.getElementById('app');
    const saved = sessionStorage.getItem('pv_admin_password') || '';

    function renderLogin(error) {
      app.innerHTML = \`
        <div class="login">
          <h1>Painel <span>Palavra Viva</span></h1>
          <p class="muted">Acesso do administrador</p>
          <input id="password" type="password" placeholder="Senha do painel" value="\${saved}" />
          \${error ? \`<p style="color:var(--sos)">\${error}</p>\` : ''}
          <button id="enter">Entrar</button>
        </div>\`;
      document.getElementById('enter').onclick = () => {
        const password = document.getElementById('password').value.trim();
        sessionStorage.setItem('pv_admin_password', password);
        load(password);
      };
    }

    function rowList(items) {
      if (!items?.length) return '<p class="muted">Sem dados ainda.</p>';
      return '<ol>' + items.map((i) =>
        \`<li><strong>\${i.key}</strong> · \${i.count}</li>\`
      ).join('') + '</ol>';
    }

    function renderDashboard(data, password) {
      app.innerHTML = \`
        <header>
          <h1>Painel <span>Palavra Viva</span></h1>
          <div class="muted">Atualizado \${new Date(data.generatedAt).toLocaleString('pt-BR')} ·
            <button style="width:auto;margin:0;padding:8px 12px" id="refresh">Atualizar</button>
          </div>
        </header>
        <div class="wrap">
          <div class="grid">
            <div class="card"><div class="label">Online agora</div><div class="value">\${data.totals.onlineNow}</div></div>
            <div class="card"><div class="label">Assinaturas ativas</div><div class="value">\${data.totals.activeSubscriptions || 0}</div></div>
            <div class="card"><div class="label">Pagamentos ok</div><div class="value">\${data.totals.paidCheckouts || 0}</div></div>
            <div class="card"><div class="label">Receita paga</div><div class="value" style="font-size:1.35rem">\${data.totals.revenuePaidLabel || 'R$ 0,00'}</div></div>
            <div class="card"><div class="label">Foto Jesus pagas</div><div class="value">\${data.totals.paidFotoJesus || 0}</div></div>
            <div class="card"><div class="label">Cadastros</div><div class="value">\${data.totals.contacts || 0}</div></div>
            <div class="card"><div class="label">Acessos 24h</div><div class="value">\${data.totals.opens24h}</div></div>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>💎 Assinaturas Missão+ (gerenciar)</h2>
            <p class="section-note">Atualiza sozinho a cada 12s. Inclui pagamentos locais e ativações vindas do app. Mantenha <code>npm run analytics:server</code> e <code>npm run payments:server</code> ligados juntos.</p>
            <p class="section-note">Liberar, estender (+30 dias) ou cancelar acesso. Alterações valem no app na próxima sincronização.</p>
            <div class="grant-row">
              <div>
                <label>Usuário</label>
                <select id="grant-user">
                  <option value="">Selecione um usuário…</option>
                  \${(data.subscriptions || []).map(u => \`<option value="\${u.userId}">\${u.displayName || u.userId}\${u.whatsapp ? ' · ' + u.whatsapp : ''}\${u.status === 'active' ? ' · ativa' : u.status === 'none' ? ' · sem assinatura' : ' · expirada'}</option>\`).join('')}
                </select>
              </div>
              <div>
                <label>Ou userId</label>
                <input id="grant-user-id" placeholder="pv_..." />
              </div>
              <div>
                <label>Dias</label>
                <input id="grant-days" type="number" min="1" max="3650" value="30" />
              </div>
              <div>
                <label>&nbsp;</label>
                <button class="btn-sm ok" id="grant-sub" style="width:100%">Liberar</button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th>Vence em</th>
                  <th>Dias</th>
                  <th>Origem</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                \${(data.subscriptions || []).length ? data.subscriptions.map(s => \`
                  <tr>
                    <td><strong>\${s.displayName || s.userId || '—'}</strong><div class="muted" style="font-size:.75rem">\${s.userId || ''}</div></td>
                    <td>\${s.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${s.whatsappLink}" target="_blank" rel="noopener">\${s.whatsapp}</a>\`
                      : (s.whatsapp || '—')}</td>
                    <td class="\${s.status === 'active' ? 'status-active' : s.status === 'none' ? 'muted' : 'status-expired'}">\${
                      s.status === 'active' ? 'Ativa' : s.status === 'none' ? 'Sem assinatura' : 'Expirada'
                    }</td>
                    <td>\${s.expiresAt ? new Date(s.expiresAt).toLocaleString('pt-BR') : '—'}</td>
                    <td>\${s.active ? \`<span class="pill">\${s.daysLeft}d</span>\` : '—'}</td>
                    <td>\${s.source || '—'}</td>
                    <td>
                      <div class="actions">
                        \${s.status === 'none'
                          ? \`<button class="btn-sm ok" data-sub-action="grant" data-user-id="\${s.userId}" data-days="30">Liberar 30 dias</button>\`
                          : \`<button class="btn-sm ok" data-sub-action="extend" data-user-id="\${s.userId}" data-days="30">+30 dias</button>\${
                              s.active
                                ? \`<button class="btn-sm danger" data-sub-action="cancel" data-user-id="\${s.userId}">Cancelar</button>\`
                                : \`<button class="btn-sm ok" data-sub-action="extend" data-user-id="\${s.userId}" data-days="30">Reativar</button>\`
                            }\`}
                      </div>
                    </td>
                  </tr>\`).join('') : '<tr><td colspan="7" class="muted">Nenhum usuário para gerenciar ainda.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>💳 Pagamentos (Missão+ e Foto com Jesus)</h2>
            <p class="section-note">Checkouts Pix/cartão — pagos e pendentes. Valores estimados pelas tarifas atuais do produto.</p>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Nome</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Status</th>
                  <th>Transação</th>
                </tr>
              </thead>
              <tbody>
                \${(data.payments || []).length ? data.payments.map(p => \`
                  <tr>
                    <td>\${new Date(p.paidAt || p.createdAt).toLocaleString('pt-BR')}</td>
                    <td>
                      <strong>\${p.displayName || p.userId || '—'}</strong>
                      <div class="muted" style="font-size:.75rem">\${p.whatsappLink
                        ? \`<a class="wa" href="https://wa.me/\${p.whatsappLink}" target="_blank" rel="noopener">\${p.whatsapp}</a>\`
                        : (p.whatsapp || '')}</div>
                    </td>
                    <td>\${p.productLabel}</td>
                    <td>\${p.priceLabel}</td>
                    <td>\${p.method}</td>
                    <td class="\${p.status === 'paid' ? 'status-paid' : 'status-opened'}">\${p.status}</td>
                    <td class="muted" style="font-size:.75rem;max-width:140px;overflow:hidden;text-overflow:ellipsis">\${p.transactionId || '—'}</td>
                  </tr>\`).join('') : '<tr><td colspan="7" class="muted">Nenhum checkout registrado ainda.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>🖼️ Foto com Jesus</h2>
            <p class="section-note">Gerações e status de pagamento/entrega da imagem.</p>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Nome</th>
                  <th>Pagamento</th>
                  <th>Geração</th>
                  <th>Valor</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                \${(data.fotoJesusOrders || []).length ? data.fotoJesusOrders.map(f => \`
                  <tr>
                    <td>\${new Date(f.paidAt || f.createdAt).toLocaleString('pt-BR')}</td>
                    <td><strong>\${f.displayName || f.userId || '—'}</strong></td>
                    <td class="\${f.paymentStatus === 'paid' ? 'status-paid' : 'status-opened'}">\${f.paymentStatus}</td>
                    <td>\${f.status}</td>
                    <td>\${f.priceLabel}</td>
                    <td>\${f.resultUrl
                      ? \`<a class="result" href="\${f.resultUrl}" target="_blank" rel="noopener">Ver imagem</a>\`
                      : '—'}</td>
                  </tr>\`).join('') : '<tr><td colspan="6" class="muted">Nenhuma Foto com Jesus ainda.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>📇 Contatos (nome e WhatsApp)</h2>
            <p class="section-note">Cadastros do onboarding — nome e WhatsApp ficam salvos aqui para contato.</p>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>Cidade</th>
                  <th>Origem</th>
                  <th>Cadastro</th>
                  <th>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                \${(data.contacts || []).length ? data.contacts.map(u => \`
                  <tr>
                    <td><strong>\${u.displayName || '—'}</strong></td>
                    <td>\${u.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${u.whatsappLink}" target="_blank" rel="noopener">\${u.whatsapp}</a>\`
                      : (u.whatsapp || '—')}</td>
                    <td>\${u.city}</td>
                    <td><span class="pill">\${u.source}</span></td>
                    <td>\${u.firstSeenAt ? new Date(u.firstSeenAt).toLocaleString('pt-BR') : '—'}</td>
                    <td>\${u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('pt-BR') : '—'}</td>
                  </tr>\`).join('') : '<tr><td colspan="6" class="muted">Nenhum cadastro com nome/WhatsApp ainda. Peça para alguém concluir o onboarding no app.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="cols">
            <div class="card">
              <h2>📍 Onde estão (cidades)</h2>
              <div id="map"></div>
              <div style="margin-top:12px">\${rowList(data.cities)}</div>
            </div>
            <div class="card">
              <h2>↗ Origem do tráfego</h2>
              \${rowList(data.topSources)}
              <h2 style="margin-top:20px">📱 Telas mais abertas</h2>
              \${rowList(data.topScreens)}
            </div>
          </div>

          <div class="cols">
            <div class="card">
              <h2>🎧 Mais ouvidos</h2>
              \${rowList(data.topListened)}
            </div>
            <div class="card">
              <h2>📖 Mais lidos</h2>
              \${rowList(data.topRead)}
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>🟢 Online agora</h2>
            <table>
              <thead><tr><th>Nome</th><th>WhatsApp</th><th>Cidade</th><th>Origem</th><th>Visto</th></tr></thead>
              <tbody>
                \${data.online.length ? data.online.map(o => \`
                  <tr>
                    <td>\${o.displayName || o.userId || o.sessionId || '—'}</td>
                    <td>\${o.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${o.whatsappLink}" target="_blank" rel="noopener">\${o.whatsapp}</a>\`
                      : (o.whatsapp || '—')}</td>
                    <td>\${o.city}</td>
                    <td><span class="pill">\${o.source}</span></td>
                    <td>\${new Date(o.at).toLocaleTimeString('pt-BR')}</td>
                  </tr>\`).join('') : '<tr><td colspan="5" class="muted">Ninguém online neste momento.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>Eventos recentes</h2>
            <table>
              <thead><tr><th>Evento</th><th>Nome</th><th>WhatsApp</th><th>Conteúdo</th><th>Cidade</th><th>Origem</th><th>Quando</th></tr></thead>
              <tbody>
                \${data.recentEvents.map(e => \`
                  <tr>
                    <td>\${e.name}</td>
                    <td>\${e.displayName || '—'}</td>
                    <td>\${e.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${e.whatsappLink}" target="_blank" rel="noopener">\${e.whatsapp}</a>\`
                      : (e.whatsapp || '—')}</td>
                    <td>\${e.title || '—'}</td>
                    <td>\${e.city}</td>
                    <td>\${e.source}</td>
                    <td>\${new Date(e.at).toLocaleString('pt-BR')}</td>
                  </tr>\`).join('')}
              </tbody>
            </table>
          </div>
        </div>\`;

      document.getElementById('refresh').onclick = () => load(password);

      async function manageSubscription(body) {
        const res = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          alert(json.error || 'Não foi possível atualizar a assinatura.');
          return;
        }
        load(password);
      }

      document.getElementById('grant-sub').onclick = () => {
        const selected = document.getElementById('grant-user').value.trim();
        const typed = document.getElementById('grant-user-id').value.trim();
        const userId = typed || selected;
        const days = Number(document.getElementById('grant-days').value || 30);
        if (!userId) {
          alert('Informe o usuário (contato ou userId).');
          return;
        }
        manageSubscription({ action: 'grant', userId, days });
      };

      document.querySelectorAll('[data-sub-action]').forEach((btn) => {
        btn.onclick = () => {
          const action = btn.getAttribute('data-sub-action');
          const userId = btn.getAttribute('data-user-id');
          const days = Number(btn.getAttribute('data-days') || 30);
          if (action === 'cancel' && !confirm('Cancelar a Missão+ deste usuário agora?')) return;
          manageSubscription({ action, userId, days });
        };
      });

      const map = L.map('map').setView([-14.235, -51.9253], 3);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const points = data.cities.filter(c => c.lat != null && c.lon != null);
      points.forEach((c) => {
        L.circleMarker([c.lat, c.lon], {
          radius: Math.min(18, 6 + c.count),
          color: '#3DDC97',
          fillColor: '#3DDC97',
          fillOpacity: 0.55,
          weight: 2,
        }).addTo(map).bindPopup(\`<strong>\${c.key}</strong><br>\${c.count} eventos\`);
      });
      if (points.length) {
        map.fitBounds(points.map(c => [c.lat, c.lon]), { padding: [30, 30], maxZoom: 5 });
      }
    }

    async function load(password) {
      try {
        const res = await fetch('/api/stats', {
          headers: { 'x-admin-password': password }
        });
        if (res.status === 401) {
          renderLogin('Senha incorreta');
          return;
        }
        const data = await res.json();
        renderDashboard(data, password);
        if (window.__pvAdminTimer) clearInterval(window.__pvAdminTimer);
        window.__pvAdminTimer = setInterval(() => load(password), 12000);
      } catch (e) {
        renderLogin('Não foi possível conectar ao servidor de analytics.');
      }
    }

    if (saved) load(saved);
    else renderLogin();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin')) {
    send(res, 200, adminHtml, 'text/html');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    try {
      const body = await readBody(req);
      const geo = await resolveEventGeo(req, body);
      const events = readEvents();
      events.push({
        id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: body.name || 'unknown',
        path: body.path || null,
        contentId: body.contentId || null,
        contentTitle: body.contentTitle || null,
        contentKind: body.contentKind || null,
        userId: body.userId || null,
        displayName: body.displayName || null,
        whatsapp: body.whatsapp || null,
        sessionId: body.sessionId || null,
        platform: body.platform || null,
        attribution: body.attribution || {
          source: 'desconhecido',
          medium: '',
          campaign: '',
          referrer: '',
        },
        geo,
        meta: body.meta || null,
        occurredAt: body.occurredAt || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      });
      const saved = events[events.length - 1];
      writeEvents(events);
      if (saved.userId) {
        upsertUserProfile(saved);
      }
      // Assinatura real do app → grava no painel mesmo sem arquivo do payments
      if (
        saved.userId &&
        (saved.name === 'subscription_activated' ||
          saved.name === 'subscription_start')
      ) {
        ingestSubscriptionFromEvent(saved);
      }
      if (
        saved.userId &&
        (saved.name === 'tool_purchase_activated' ||
          saved.name === 'foto_jesus_success')
      ) {
        ingestCheckoutFromEvent(saved);
      }
      send(res, 201, { ok: true });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/internal/sync') {
    if (!isAuthorized(req, url)) {
      send(res, 401, { ok: false, error: 'unauthorized' });
      return;
    }
    try {
      const body = await readBody(req);
      if (body.type === 'subscription' && body.subscription?.userId) {
        upsertSubscriptionRecord(body.subscription);
      }
      if (body.type === 'checkout' && body.checkout) {
        upsertCheckoutRecord(body.checkout);
      }
      send(res, 200, {
        ok: true,
        subscriptions: listManageableSubscriptions().length,
        payments: listPayments().length,
      });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/stats') {
    if (!isAuthorized(req, url)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }
    send(res, 200, buildStats(readEvents()));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/subscriptions') {
    if (!isAuthorized(req, url)) {
      send(res, 401, { ok: false, error: 'unauthorized' });
      return;
    }
    try {
      const body = await readBody(req);
      const action = String(body.action || '').trim();
      const userId = String(body.userId || '').trim();
      if (!userId) {
        send(res, 400, { ok: false, error: 'userId_obrigatorio' });
        return;
      }

      let subscription = null;
      if (action === 'grant' || action === 'extend') {
        subscription = adminGrantSubscription(userId, {
          days: body.days,
          displayName: body.displayName,
          whatsapp: body.whatsapp,
          source: action === 'extend' ? 'admin_extend' : 'admin_grant',
        });
      } else if (action === 'cancel') {
        subscription = adminCancelSubscription(userId);
      } else if (action === 'set_expires') {
        subscription = adminSetExpires(userId, body.expiresAt);
      } else {
        send(res, 400, { ok: false, error: 'acao_invalida' });
        return;
      }

      if (!subscription) {
        send(res, 404, { ok: false, error: 'assinatura_nao_encontrada' });
        return;
      }

      send(res, 200, {
        ok: true,
        action,
        subscription,
        subscriptions: listManageableSubscriptions(),
        activeSubscriptions: listActiveSubscriptions(),
      });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true, events: readEvents().length });
    return;
  }

  send(res, 404, { error: 'not_found' });
});

backfillUsersFromEvents();

server.listen(PORT, () => {
  const password = process.env.ADMIN_PASSWORD || ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`\nPainel Palavra Viva`);
  console.log(`→ http://localhost:${PORT}/admin`);
  console.log(`→ Senha: ${password}`);
  console.log(`→ API eventos: POST http://localhost:${PORT}/api/events`);
  if (isProd && password === 'palavraviva') {
    console.warn(
      '⚠ PRODUÇÃO: defina ADMIN_PASSWORD forte no .env (senha padrão ainda ativa).\n',
    );
  } else {
    console.log('');
  }
});
