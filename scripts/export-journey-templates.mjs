import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(
  path.join(root, 'src', 'constants', 'anxietyJourney.ts'),
  'utf8',
);

const out = {};
const re =
  /id:\s*'([^']+)',[\s\S]*?title:\s*'([^']*)',[\s\S]*?devotionalScript:\s*`([\s\S]*?)`,/g;

let match;
while ((match = re.exec(src))) {
  out[match[1]] = {
    title: match[2],
    devotionalScript: match[3],
  };
}

const keys = Object.keys(out);
if (keys.length < 7) {
  console.error('Esperado 7 sessões, encontrado:', keys.length, keys);
  process.exit(1);
}

const outPath = path.join(__dirname, 'journey-templates.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Exportadas ${keys.length} sessões → ${outPath}`);
