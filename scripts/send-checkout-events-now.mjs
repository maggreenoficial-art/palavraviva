/**
 * Reenvia InitiateCheckout + AddPaymentInfo no formato que já funcionou (ViewContent).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';

for (const line of readFileSync(resolve('.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const PIXEL_ID = (process.env.META_PIXEL_ID || '4474411989514975').trim();
const TOKEN = (process.env.META_CAPI_ACCESS_TOKEN || '').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sha = (v) =>
  crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

async function send(eventName, extra = {}) {
  const eventId = `${eventName}_fix2_${Date.now()}`;
  const custom_data = {
    currency: 'BRL',
    value: 19.9,
    content_name: 'missao_plus',
    content_ids: ['missao_plus'],
    content_type: 'product',
    contents: [{ id: 'missao_plus', quantity: 1 }],
    content_category: 'subscription',
    num_items: 1,
    ...extra,
  };
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: 'https://www.oucapalavra.com.br/',
        action_source: 'website',
        user_data: {
          client_ip_address: '189.18.44.10',
          client_user_agent: UA,
          external_id: [sha(`pv_${eventName.toLowerCase()}_${Date.now()}`)],
          country: [sha('br')],
          ph: [sha('5511987654321')],
          fn: [sha('teste')],
          ln: [sha('checkout')],
          fbp: `fb.1.${Date.now()}.987654321`,
        },
        custom_data,
      },
    ],
    test_event_code: 'TEST94275',
  };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  console.log(eventName, eventId, JSON.stringify(body));
  return body;
}

await send('InitiateCheckout');
await new Promise((r) => setTimeout(r, 1200));
await send('AddPaymentInfo', { payment_type: 'pix' });
await new Promise((r) => setTimeout(r, 1200));
// também via endpoint de produção (mesmo caminho do app)
for (const eventName of ['InitiateCheckout', 'AddPaymentInfo']) {
  await new Promise((r) => setTimeout(r, 800));
  const res = await fetch('https://oucapalavra.com.br/api/meta/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({
      eventName,
      eventId: `${eventName}_prodpath_${Date.now()}`,
      eventSourceUrl: 'https://www.oucapalavra.com.br/',
      userId: `pv_prod_${Date.now()}`,
      displayName: 'Teste Checkout',
      whatsapp: '11987654321',
      clientIp: '189.18.44.10',
      userAgent: UA,
      testEventCode: 'TEST94275',
      customData: {
        currency: 'BRL',
        value: 19.9,
        content_name: 'missao_plus',
        content_ids: ['missao_plus'],
        content_type: 'product',
        contents: [{ id: 'missao_plus', quantity: 1 }],
        num_items: 1,
        ...(eventName === 'AddPaymentInfo' ? { payment_type: 'pix' } : {}),
      },
    }),
  });
  console.log('prod', eventName, await res.json());
}
