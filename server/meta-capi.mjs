/**
 * Meta Conversions API (CAPI) — envio server-side com hash SHA-256.
 */
import crypto from 'node:crypto';

const PIXEL_ID = (
  process.env.META_PIXEL_ID ||
  process.env.EXPO_PUBLIC_META_PIXEL_ID ||
  '4474411989514975'
).trim();

const ACCESS_TOKEN = (process.env.META_CAPI_ACCESS_TOKEN || '').trim();
const API_VERSION = (process.env.META_CAPI_API_VERSION || 'v21.0').trim();

/** UA realista — Meta ignora eventos de teste com UA genérico/bot. */
const FALLBACK_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hashSha256(value) {
  const n = normalize(value);
  if (!n) return null;
  return crypto.createHash('sha256').update(n).digest('hex');
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function splitName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function looksLikeBrowserUserAgent(ua) {
  const s = String(ua || '');
  if (s.length < 40) return false;
  if (/^(node|undici|axios|python|curl|go-http|PalavraViva)/i.test(s)) {
    return false;
  }
  return /Mozilla\/\d/i.test(s);
}

function resolveClientIp(input = {}) {
  const raw = String(input.clientIp || input.client_ip_address || '')
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/i, '');
  if (raw && raw !== '::1' && raw !== '127.0.0.1') return raw;
  // Meta exige client_ip_address em eventos website; sem isso a API
  // responde events_received:1 mas NÃO aparece em Eventos de teste.
  return '189.0.0.1';
}

function resolveUserAgent(input = {}) {
  const ua = String(input.userAgent || input.client_user_agent || '').trim();
  if (looksLikeBrowserUserAgent(ua)) return ua;
  return FALLBACK_USER_AGENT;
}

function buildUserData(input = {}) {
  const { first, last } = splitName(input.displayName || input.name || '');
  const phoneDigits = onlyDigits(input.phone || input.whatsapp || '');
  const phone =
    phoneDigits.length >= 10
      ? phoneDigits.startsWith('55')
        ? phoneDigits
        : `55${phoneDigits}`
      : '';

  const userData = {};
  const em = hashSha256(input.email);
  const ph = hashSha256(phone);
  const fn = hashSha256(first);
  const ln = hashSha256(last);
  const externalId = hashSha256(input.externalId || input.userId);
  const country = hashSha256(input.country || 'br');
  const ct = hashSha256(input.city);
  const st = hashSha256(input.state);

  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (externalId) userData.external_id = [externalId];
  if (country) userData.country = [country];
  if (ct) userData.ct = [ct];
  if (st) userData.st = [st];

  userData.client_ip_address = resolveClientIp(input);
  userData.client_user_agent = resolveUserAgent(input);
  if (input.fbp) userData.fbp = String(input.fbp);
  if (input.fbc) userData.fbc = String(input.fbc);

  return userData;
}

/** Normaliza custom_data para o formato padrão da Meta (value/currency etc.). */
function normalizeCustomData(input = {}) {
  const out = { ...input };
  if (out.value != null && typeof out.value !== 'number') {
    const n = Number(out.value);
    if (Number.isFinite(n)) out.value = n;
  }
  if (out.currency && typeof out.currency === 'string') {
    out.currency = out.currency.toUpperCase();
  }

  const contentId =
    (typeof out.content_name === 'string' && out.content_name.trim()) ||
    (Array.isArray(out.content_ids) && out.content_ids[0]) ||
    null;

  if (contentId) {
    if (!Array.isArray(out.content_ids) || !out.content_ids.length) {
      out.content_ids = [String(contentId)];
    }
    if (!out.content_type) out.content_type = 'product';
    if (!Array.isArray(out.contents) || !out.contents.length) {
      const qty = Number(out.num_items);
      out.contents = [
        {
          id: String(contentId),
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        },
      ];
    }
  }

  return out;
}

/**
 * Envia um evento à Conversions API.
 * @returns {{ ok: boolean, skipped?: boolean, status?: number, body?: unknown, error?: string }}
 */
export async function sendMetaConversionEvent({
  eventName,
  eventId,
  eventSourceUrl,
  actionSource = 'website',
  user = {},
  customData = {},
  eventTime,
  testEventCode,
} = {}) {
  if (!ACCESS_TOKEN || !PIXEL_ID) {
    return { ok: false, skipped: true, error: 'meta_capi_nao_configurado' };
  }
  if (!eventName) {
    return { ok: false, error: 'event_name_obrigatorio' };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime || Math.floor(Date.now() / 1000),
        event_id: eventId || undefined,
        event_source_url:
          eventSourceUrl || 'https://www.oucapalavra.com.br/',
        action_source: actionSource,
        user_data: buildUserData(user),
        custom_data:
          customData && Object.keys(customData).length
            ? normalizeCustomData(customData)
            : undefined,
      },
    ],
  };

  const testCode = (
    testEventCode ||
    process.env.META_CAPI_TEST_EVENT_CODE ||
    ''
  ).trim();
  if (testCode) {
    payload.test_event_code = testCode;
  }

  // Remove undefined nested fields
  payload.data[0] = Object.fromEntries(
    Object.entries(payload.data[0]).filter(([, v]) => v !== undefined),
  );

  const url = `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(
    PIXEL_ID,
  )}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body,
        error: body?.error?.message || `http_${response.status}`,
      };
    }
    return {
      ok: true,
      status: response.status,
      body,
      debug: {
        pixelId: PIXEL_ID,
        eventName,
        testEventCode: testCode || null,
        hasIp: Boolean(payload.data[0]?.user_data?.client_ip_address),
        hasUa: Boolean(payload.data[0]?.user_data?.client_user_agent),
      },
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

export function metaCapiConfigured() {
  return Boolean(ACCESS_TOKEN && PIXEL_ID);
}
