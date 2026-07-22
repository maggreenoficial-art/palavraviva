const BASE = 'https://www.oucapalavra.com.br';

const html = await (await fetch(`${BASE}/`)).text();
const scriptMatch = html.match(/\/_expo\/static\/js\/web\/entry-[^"']+\.js/);
let bundleFlags = null;
if (scriptMatch) {
  const js = await (await fetch(`${BASE}${scriptMatch[0]}`)).text();
  bundleFlags = {
    script: scriptMatch[0],
    InitiateCheckout: js.includes('InitiateCheckout'),
    AddPaymentInfo: js.includes('AddPaymentInfo'),
    trackMissaoInitiateCheckout: js.includes('trackMissaoInitiateCheckout'),
    testEventCode: js.includes('testEventCode'),
    fbq: js.includes('fbq('),
  };
}

const status = await (await fetch(`${BASE}/api/meta/capi`)).json();

console.log(JSON.stringify({ bundleFlags, status }, null, 2));
