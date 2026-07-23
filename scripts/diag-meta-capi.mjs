/**
 * Diagnóstico: Pixel + CAPI + test_event_code em produção.
 * Uso: node scripts/diag-meta-capi.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(file) {
  try {
    const text = readFileSync(resolve(file), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      process.env[m[1]] = m[2].trim();
    }
  } catch {
    // ignore
  }
}

loadEnvFile('.env');

const PIXEL_ID = (
  process.env.META_PIXEL_ID ||
  process.env.EXPO_PUBLIC_META_PIXEL_ID ||
  '1168978568102199'
).trim();
const TOKEN = (process.env.META_CAPI_ACCESS_TOKEN || '').trim();
const TEST_CODE = 'TEST94275';
const BASE = 'https://oucapalavra.com.br';

async function graph(path, opts = {}) {
  const url = path.startsWith('http')
    ? path
    : `https://graph.facebook.com/v21.0/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function sendViaProdApi(eventName) {
  const eventId = `${eventName}_diag_${Date.now()}`;
  const res = await fetch(`${BASE}/api/meta/capi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName,
      eventId,
      eventSourceUrl: 'https://www.oucapalavra.com.br/',
      userId: 'diag_meta_user',
      displayName: 'Diag Meta',
      whatsapp: '11999999999',
      testEventCode: TEST_CODE,
      customData: {
        currency: 'BRL',
        value: 19.9,
        content_name: 'missao_plus',
        content_category: 'subscription',
        num_items: 1,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, eventId, body };
}

async function sendDirectGraph(eventName) {
  const eventId = `${eventName}_direct_${Date.now()}`;
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: 'https://www.oucapalavra.com.br/',
        action_source: 'website',
        user_data: {
          client_user_agent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          country: [
            '4fc82b26aecb47d2868c4efbe394ba52fdc0b3b0c2c4c4b4c4c4c4c4c4c4c4c4',
          ],
        },
        custom_data: {
          currency: 'BRL',
          value: 19.9,
          content_name: 'missao_plus',
        },
      },
    ],
    test_event_code: TEST_CODE,
  };
  // country must be real sha256 of "br"
  const crypto = await import('node:crypto');
  payload.data[0].user_data.country = [
    crypto.createHash('sha256').update('br').digest('hex'),
  ];
  payload.data[0].user_data.external_id = [
    crypto.createHash('sha256').update('diag_meta_user').digest('hex'),
  ];

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json().catch(() => ({}));
  return { status: res.status, eventId, body };
}

const html = await (await fetch('https://www.oucapalavra.com.br/')).text();
const pixelMatches = html.match(/1168978568102199/g) || [];
const scriptMatch = html.match(/\/_expo\/static\/js\/web\/entry-[^"']+\.js/);
let bundleFlags = null;
if (scriptMatch) {
  const js = await (await fetch(`https://www.oucapalavra.com.br${scriptMatch[0]}`)).text();
  bundleFlags = {
    script: scriptMatch[0],
    testEventCode: js.includes('testEventCode'),
    meta_test_event_code: js.includes('meta_test_event_code'),
    InitiateCheckout: js.includes('InitiateCheckout'),
    AddPaymentInfo: js.includes('AddPaymentInfo'),
  };
}

console.log(
  JSON.stringify(
    {
      pixelId: PIXEL_ID,
      tokenLen: TOKEN.length,
      pixelInHtml: [...new Set(pixelMatches)],
      bundleFlags,
      prodCapiStatus: await (await fetch(`${BASE}/api/meta/capi`)).json(),
      debugToken: TOKEN
        ? await graph(
            `debug_token?input_token=${encodeURIComponent(TOKEN)}&access_token=${encodeURIComponent(TOKEN)}`,
          )
        : null,
      pixelInfo: TOKEN ? await graph(`${PIXEL_ID}?fields=id,name`) : null,
      viaProdInitiateCheckout: await sendViaProdApi('InitiateCheckout'),
      viaProdAddPaymentInfo: await sendViaProdApi('AddPaymentInfo'),
      viaDirectInitiateCheckout: TOKEN
        ? await sendDirectGraph('InitiateCheckout')
        : null,
    },
    null,
    2,
  ),
);
