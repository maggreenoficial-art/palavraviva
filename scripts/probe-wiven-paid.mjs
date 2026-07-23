import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1)];
    }),
);

const h = {
  Accept: 'application/json',
  'x-public-key': env.WIVEN_PUBLIC_KEY,
  'x-secret-key': env.WIVEN_SECRET_KEY,
};
const base = 'https://app.wiven.com.br/api/v1';

async function getTx(label, path) {
  const r = await fetch(`${base}${path}`, { headers: h });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  console.log(`\n=== ${label} HTTP ${r.status} ===`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

const checkoutsPath = path.join(root, 'server', 'data', 'checkouts.json');
let checkouts = [];
try {
  checkouts = JSON.parse(fs.readFileSync(checkoutsPath, 'utf8'));
} catch {
  // ok
}

const recent = checkouts
  .filter((c) => c.product === 'tool-foto-jesus' || c.amount === 5)
  .slice(-10);

console.log(`Checkouts locais foto-jesus: ${recent.length}`);

for (const c of recent) {
  if (c.transactionId) {
    await getTx(
      `${c.id} by id`,
      `/gateway/transactions?id=${encodeURIComponent(c.transactionId)}`,
    );
  }
  if (c.identifier) {
    await getTx(
      `${c.id} by clientIdentifier`,
      `/gateway/transactions?clientIdentifier=${encodeURIComponent(c.identifier)}`,
    );
  }
}

// CLI: node scripts/probe-wiven-paid.mjs <transactionId> [clientIdentifier]
const txId = process.argv[2];
const clientId = process.argv[3];
if (txId) {
  await getTx('CLI id', `/gateway/transactions?id=${encodeURIComponent(txId)}`);
}
if (clientId) {
  await getTx(
    'CLI clientIdentifier',
    `/gateway/transactions?clientIdentifier=${encodeURIComponent(clientId)}`,
  );
}
