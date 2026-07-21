const res = await fetch('https://oucapalavra.com.br/');
const html = await res.text();
const scripts = [...html.matchAll(/src="(\/[^"]+\.js)"/g)].map((m) => m[1]);
console.log('scripts', scripts.slice(0, 10));
for (const s of scripts.slice(0, 8)) {
  try {
    const t = await (await fetch(`https://oucapalavra.com.br${s}`)).text();
    const hit =
      t.includes('InitiateCheckout') ||
      t.includes('AddPaymentInfo') ||
      t.includes('missao_plus');
    if (hit) {
      console.log('FOUND', s, {
        InitiateCheckout: t.includes('InitiateCheckout'),
        AddPaymentInfo: t.includes('AddPaymentInfo'),
        missao_plus: t.includes('missao_plus'),
      });
    }
  } catch (e) {
    console.log('fail', s, e.message);
  }
}
