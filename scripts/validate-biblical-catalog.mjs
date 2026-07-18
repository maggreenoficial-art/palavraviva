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

const catalog = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src', 'constants', 'biblicalPrayerCatalog.json'),
    'utf8',
  ),
);

const ids = catalog.map((item) => item.id);
const issues = [];
const seen = new Set();

if (ids.length === 0) {
  issues.push('Nenhum ID de oração encontrado no catálogo.');
}

for (const item of catalog) {
  const { id } = item;
  if (!id) {
    issues.push('(sem-id): item sem ID');
    continue;
  }
  if (seen.has(id)) issues.push(`${id}: ID duplicado`);
  seen.add(id);
  if (!item.referenceLabel) issues.push(`${id}: referenceLabel ausente`);
  if (!item.book || !item.chapter) {
    issues.push(`${id}: book/chapter ausente para fetch`);
  }

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
