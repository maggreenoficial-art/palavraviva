/**
 * Verifica se o token CAPI consegue LER qualidade do dataset
 * e se InitiateCheckout existe nos dados (mesmo com events_received:1).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';

function loadEnv() {
  try {
    for (const line of readFileSync(resolve('.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();

const PIXEL_ID = (process.env.META_PIXEL_ID || '4474411989514975').trim();
const TOKEN = (process.env.META_CAPI_ACCESS_TOKEN || '').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function sha(v) {
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

async function graph(path, opts) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://graph.facebook.com/v21.0/${path}${sep}access_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, opts);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const eventId = `InitiateCheckout_probe_${Date.now()}`;
const payload = {
  data: [
    {
      event_name: 'InitiateCheckout',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: 'https://www.oucapalavra.com.br/',
      action_source: 'website',
      user_data: {
        client_ip_address: '189.18.44.10',
        client_user_agent: UA,
        external_id: [sha('pv_probe_user')],
        country: [sha('br')],
        ph: [sha('5511987654321')],
        fn: [sha('teste')],
        ln: [sha('meta')],
      },
      custom_data: {
        currency: 'BRL',
        value: 19.9,
        content_name: 'missao_plus',
        content_category: 'subscription',
        num_items: 1,
      },
    },
  ],
  test_event_code: 'TEST94275',
  partner_agent: 'palavra_viva_probe',
};

const send = await graph(`${PIXEL_ID}/events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const sendProd = await graph(`${PIXEL_ID}/events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...payload,
    test_event_code: undefined,
    data: [
      {
        ...payload.data[0],
        event_id: `InitiateCheckout_prod_${Date.now()}`,
        event_name: 'InitiateCheckout',
      },
    ],
  }),
});

const debug = await graph(
  `debug_token?input_token=${encodeURIComponent(TOKEN)}`,
);

const quality = await graph(
  `${PIXEL_ID}/dataset_quality?fields=web&agent_name=palavra_viva_probe`,
);

const quality2 = await graph(
  `dataset_quality?dataset_id=${PIXEL_ID}&fields=web`,
);

const pixel = await graph(`${PIXEL_ID}?fields=id,name,owner_ad_account,is_unavailable`);

const prodApi = await fetch('https://oucapalavra.com.br/api/meta/capi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
  body: JSON.stringify({
    eventName: 'InitiateCheckout',
    eventId: `InitiateCheckout_via_prod_${Date.now()}`,
    eventSourceUrl: 'https://www.oucapalavra.com.br/',
    userId: 'pv_probe_user',
    displayName: 'Teste Meta',
    whatsapp: '11987654321',
    clientIp: '189.18.44.10',
    userAgent: UA,
    testEventCode: 'TEST94275',
    customData: { currency: 'BRL', value: 19.9, content_name: 'missao_plus' },
  }),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

console.log(
  JSON.stringify(
    {
      eventId,
      tokenScopes: debug.body?.data?.scopes,
      tokenApp: debug.body?.data?.application,
      tokenGranular: debug.body?.data?.granular_scopes,
      pixel,
      sendTest: send,
      sendProd,
      quality,
      quality2,
      prodApi,
    },
    null,
    2,
  ),
);
