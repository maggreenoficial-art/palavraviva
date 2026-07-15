import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const texts = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src', 'constants', 'biblicalPrayerTexts.json'),
    'utf8',
  ),
);

const prayersSource = fs.readFileSync(
  path.join(root, 'src', 'constants', 'biblicalPrayers.ts'),
  'utf8',
);

// IDs de oração: aparecem junto de apiPassage no mesmo objeto.
const blocks = prayersSource.split('{').slice(1);
const uniqueIds = [];

for (const block of blocks) {
  if (!block.includes('apiPassage')) continue;
  const idMatch = block.match(/id:\s*'([^']+)'/);
  if (idMatch) uniqueIds.push(idMatch[1]);
}

const ids = [...new Set(uniqueIds)];
const issues = [];

if (ids.length === 0) {
  issues.push('Nenhum ID de oração encontrado no catálogo.');
}

for (const id of ids) {
  const text = texts[id];
  if (!text) {
    issues.push(`${id}: ausente em biblicalPrayerTexts.json`);
    continue;
  }
  if (!text.reference) issues.push(`${id}: reference ausente`);
  if (!text.translationName) issues.push(`${id}: translationName ausente`);
  if (!Array.isArray(text.verses) || text.verses.length === 0) {
    issues.push(`${id}: verses ausentes`);
  }
}

if (issues.length) {
  console.error('Falha na validação do catálogo bíblico:');
  for (const issue of issues) console.error(` - ${issue}`);
  process.exit(1);
}

console.log(`Catálogo bíblico OK (${ids.length} orações com texto).`);
