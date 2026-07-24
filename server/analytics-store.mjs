/**
 * Analytics em produção (Vercel /tmp + local server/data).
 * Eventos do app → persistência → painel /admin.
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from './payments-shared.mjs';

const PRICE_SUBSCRIPTION = Number(process.env.WIVEN_PRODUCT_PRICE || 19.9);
const PRICE_FOTO_JESUS = Number(process.env.WIVEN_TOOL_FOTO_JESUS_PRICE || 5);

const eventsPath = () => path.join(dataDir(), 'analytics-events.json');
const usersPath = () => path.join(dataDir(), 'analytics-users.json');
const subscriptionsPath = () => path.join(dataDir(), 'subscriptions.json');
const checkoutsPath = () => path.join(dataDir(), 'checkouts.json');
const generationsPath = () => path.join(dataDir(), 'foto-jesus-generations.json');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
}

function readEvents() {
  return readJson(eventsPath(), []);
}

function writeEvents(events) {
  writeJson(eventsPath(), events.slice(-50_000));
}

function readUsers() {
  const raw = readJson(usersPath(), {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function writeUsers(users) {
  writeJson(usersPath(), users);
}

function readSubscriptions() {
  const raw = readJson(subscriptionsPath(), {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function readCheckouts() {
  const raw = readJson(checkoutsPath(), []);
  return Array.isArray(raw) ? raw : [];
}

function readGenerations() {
  const raw = readJson(generationsPath(), {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function isWeakCity(city) {
  if (!city || typeof city !== 'string') return true;
  const n = city.trim().toLowerCase();
  return !n || n === 'local' || n === 'desconhecida' || n === 'unknown';
}

const DDD_CITY = {
  11: ['São Paulo', 'SP'],
  21: ['Rio de Janeiro', 'RJ'],
  31: ['Belo Horizonte', 'MG'],
  41: ['Curitiba', 'PR'],
  51: ['Porto Alegre', 'RS'],
  61: ['Brasília', 'DF'],
  71: ['Salvador', 'BA'],
  81: ['Recife', 'PE'],
  85: ['Fortaleza', 'CE'],
  62: ['Goiânia', 'GO'],
  19: ['Campinas', 'SP'],
};

function geoFromWhatsapp(whatsapp) {
  const digits = String(whatsapp || '').replace(/\D/g, '');
  const national = digits.startsWith('55') ? digits.slice(2) : digits;
  if (national.length < 10) return null;
  const hit = DDD_CITY[Number(national.slice(0, 2))];
  if (!hit) return null;
  return { city: hit[0], region: hit[1], country: 'BR', lat: null, lon: null };
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
  };
}

function pickBestGeo(...candidates) {
  for (const geo of candidates) {
    if (geo && !isWeakCity(geo.city)) return geo;
  }
  return candidates.find((g) => g?.city) || { city: '—', region: '', country: '' };
}

function resolveEventGeo(body) {
  return pickBestGeo(
    normalizeClientGeo(body?.clientGeo),
    geoFromWhatsapp(body?.whatsapp),
  );
}

function enrichCityLabel(city, region, whatsapp) {
  if (!isWeakCity(city)) return region ? `${city}/${region}` : city;
  const ddd = geoFromWhatsapp(whatsapp);
  if (ddd) return `${ddd.city}/${ddd.region}`;
  return city || '—';
}

function formatWhatsapp(digits) {
  if (!digits) return null;
  const clean = String(digits).replace(/\D/g, '');
  if (clean.length < 10) return clean;
  return clean.startsWith('55') ? clean : `55${clean}`;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function upsertUserProfile(event) {
  const key = event.userId;
  if (!key) return;
  const users = readUsers();
  const prev = users[key] || {
    userId: key,
    displayName: null,
    whatsapp: null,
    city: null,
    region: null,
    source: null,
    platform: null,
    firstSeenAt: event.occurredAt,
    lastSeenAt: event.occurredAt,
    events: 0,
  };
  const whatsapp = event.whatsapp || prev.whatsapp;
  const best = pickBestGeo(
    event.geo && !isWeakCity(event.geo.city) ? event.geo : null,
    !isWeakCity(prev.city)
      ? { city: prev.city, region: prev.region, country: prev.country }
      : null,
    geoFromWhatsapp(whatsapp),
  );
  users[key] = {
    ...prev,
    displayName: event.displayName || prev.displayName,
    whatsapp,
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

/** Persiste evento vindo do app (produção). */
export function recordAnalyticsEvent(body) {
  const events = readEvents();
  const saved = {
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
    geo: resolveEventGeo(body),
    meta: body.meta || null,
    occurredAt: body.occurredAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };
  events.push(saved);
  writeEvents(events);
  if (saved.userId) upsertUserProfile(saved);
  return saved;
}

function topCounts(items, keyFn, limit = 12) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const prev = map.get(key) || { key, count: 0 };
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function funnelLabel(event) {
  const name = event.name || '';
  const p = event.path || '';
  if (name === 'tool_purchase_start') return 'Iniciou compra (ferramenta)';
  if (name === 'tool_purchase_activated') return 'Comprou ferramenta';
  if (name === 'subscription_start') return 'Iniciou assinatura';
  if (name === 'subscription_activated') return 'Assinatura ativa';
  if (name === 'foto_jesus_prepare') return 'Enviou foto (Jesus)';
  if (name === 'foto_jesus_success') return 'Foto Jesus pronta';
  if (name === 'screen_view' && p.includes('foto-jesus')) return 'Tela Foto com Jesus';
  if (name === 'screen_view' && p.includes('paywall')) return 'Paywall';
  if (name === 'screen_view') return p || 'Tela';
  if (name === 'listen_start') return `Ouvir: ${event.contentTitle || 'áudio'}`;
  if (name === 'read_open') return `Ler: ${event.contentTitle || 'texto'}`;
  if (name === 'app_open') return 'Abriu o app';
  if (name === 'presence') return null;
  return name;
}

/** Dashboard agregado para /api/admin/stats */
export function buildDashboardStats() {
  const events = readEvents();
  const usersMap = readUsers();
  const subs = readSubscriptions();
  const checkouts = readCheckouts();
  const generations = readGenerations();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => Date.parse(e.occurredAt) >= weekAgo);
  const today = events.filter((e) => Date.parse(e.occurredAt) >= dayAgo);

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

  const activeSubscriptions = Object.values(subs).filter((s) => {
    const exp = Date.parse(s?.expiresAt || '');
    return s?.userId && Number.isFinite(exp) && exp > now;
  });

  const paidCheckouts = checkouts.filter((c) => c.status === 'paid');
  const paidFotoJesus = paidCheckouts.filter(
    (c) => c.product === 'tool-foto-jesus' || c.kind === 'generation',
  );
  const paidSubscriptions = paidCheckouts.filter(
    (c) => !c.product || c.product === 'subscription' || c.kind === 'subscription',
  );
  const fotoSuccess = Object.values(generations).filter(
    (g) => g.status === 'success' && g.resultUrl,
  );

  const uniqueUsers7d = new Set(
    recent.map((e) => e.userId || e.sessionId).filter(Boolean),
  ).size;

  const funnelEvents = recent
    .map((e) => {
      const label = funnelLabel(e);
      if (!label) return null;
      return { event: e, label };
    })
    .filter(Boolean);

  const cityRows = recent
    .map((e) => {
      const label = enrichCityLabel(e.geo?.city, e.geo?.region, e.whatsapp);
      if (isWeakCity(label.split('/')[0])) return null;
      return { event: e, label };
    })
    .filter(Boolean);

  const cities = topCounts(cityRows, (r) => r.label, 15).map((row) => {
    const sample = cityRows.find((c) => c.label === row.key)?.event;
    const ddd = geoFromWhatsapp(sample?.whatsapp);
    return {
      ...row,
      lat: sample?.geo?.lat ?? ddd?.lat ?? null,
      lon: sample?.geo?.lon ?? ddd?.lon ?? null,
    };
  });

  const revenue =
    paidSubscriptions.length * PRICE_SUBSCRIPTION +
    paidFotoJesus.length * PRICE_FOTO_JESUS;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      onlineNow: onlineMap.size,
      activeSubscriptions: activeSubscriptions.length,
      paidSubscriptions: paidSubscriptions.length,
      paidFotoJesus: paidFotoJesus.length,
      fotoSuccess: fotoSuccess.length,
      paidCheckouts: paidCheckouts.length,
      revenuePaid: revenue,
      revenuePaidLabel: formatMoney(revenue),
      opens24h: today.filter((e) => e.name === 'app_open').length,
      uniqueUsers7d,
      events7d: recent.length,
    },
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
        path: e.path || '—',
        at: e.occurredAt,
      };
    }),
    funnel: topCounts(funnelEvents, (r) => r.label, 15),
    topScreens: topCounts(
      recent.filter((e) => e.name === 'screen_view'),
      (e) => e.path || '—',
      12,
    ),
    topSources: topCounts(
      recent,
      (e) => e.attribution?.source || 'direto',
      10,
    ),
    cities,
    payments: paidCheckouts
      .slice()
      .sort(
        (a, b) =>
          Date.parse(b.paidAt || b.createdAt || 0) -
          Date.parse(a.paidAt || a.createdAt || 0),
      )
      .slice(0, 40)
      .map((c) => ({
        id: c.id,
        userId: c.userId,
        displayName: c.displayName || usersMap[c.userId]?.displayName || null,
        product:
          c.product === 'tool-foto-jesus' || c.kind === 'generation'
            ? 'Foto com Jesus'
            : 'Missão+',
        method: c.method || '—',
        paidAt: c.paidAt || c.createdAt,
        transactionId: c.transactionId || null,
      })),
    fotoJesus: Object.values(generations)
      .slice()
      .sort(
        (a, b) =>
          Date.parse(b.updatedAt || b.createdAt || 0) -
          Date.parse(a.updatedAt || a.createdAt || 0),
      )
      .slice(0, 40)
      .map((g) => {
        const ck = checkouts.find((c) => c.generationId === g.id);
        return {
          id: g.id,
          userId: g.userId,
          status: g.status,
          paid: Boolean(g.paidAt || ck?.status === 'paid'),
          resultUrl: g.resultUrl || null,
          createdAt: g.createdAt,
          paidAt: g.paidAt || ck?.paidAt || null,
        };
      }),
    recentEvents: recent
      .slice(-50)
      .reverse()
      .map((e) => ({
        name: e.name,
        title: e.contentTitle || e.path || funnelLabel(e) || '',
        displayName: e.displayName || null,
        city: enrichCityLabel(e.geo?.city, e.geo?.region, e.whatsapp),
        source: e.attribution?.source || '—',
        at: e.occurredAt,
      })),
  };
}

export function verifyAdminPassword(header, queryPassword) {
  const password =
    process.env.ADMIN_PASSWORD ||
    process.env.ANALYTICS_SYNC_SECRET ||
    'palavraviva';
  return header === password || queryPassword === password;
}
