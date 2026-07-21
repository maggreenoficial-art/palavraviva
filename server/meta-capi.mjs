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

  if (input.clientIp) userData.client_ip_address = String(input.clientIp);
  if (input.userAgent) userData.client_user_agent = String(input.userAgent);
  if (input.fbp) userData.fbp = String(input.fbp);
  if (input.fbc) userData.fbc = String(input.fbc);

  return userData;
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
        event_source_url: eventSourceUrl || undefined,
        action_source: actionSource,
        user_data: buildUserData(user),
        custom_data:
          customData && Object.keys(customData).length ? customData : undefined,
      },
    ],
  };

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
    return { ok: true, status: response.status, body };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

export function metaCapiConfigured() {
  return Boolean(ACCESS_TOKEN && PIXEL_ID);
}
