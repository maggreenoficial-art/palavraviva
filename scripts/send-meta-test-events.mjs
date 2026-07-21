/**
 * Envia InitiateCheckout/AddPaymentInfo com UA+IP válidos para a aba Eventos de teste.
 * Uso: node scripts/send-meta-test-events.mjs
 */
const BASE = 'https://oucapalavra.com.br';
const TEST_CODE = 'TEST94275';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function send(eventName) {
  const eventId = `${eventName}_fix_${Date.now()}`;
  const res = await fetch(`${BASE}/api/meta/capi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({
      eventName,
      eventId,
      eventSourceUrl: 'https://www.oucapalavra.com.br/',
      userId: 'pv_test_fix',
      displayName: 'Teste Meta',
      whatsapp: '11987654321',
      country: 'br',
      clientIp: '189.18.44.10',
      userAgent: UA,
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
  const body = await res.json();
  console.log(eventName, res.status, JSON.stringify(body));
}

await send('InitiateCheckout');
await send('AddPaymentInfo');
await send('Lead');
