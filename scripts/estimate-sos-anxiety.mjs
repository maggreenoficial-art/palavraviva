import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const scripts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'sos-anxiety-scripts.json'), 'utf8'),
);
const texts = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src', 'constants', 'biblicalPrayerTexts.json'),
    'utf8',
  ),
);
const MARKER = /\{\{BIBLE:([A-Za-z0-9_-]+)\}\}/g;

function format(id) {
  const p = texts[id];
  if (!p?.verses?.length) throw new Error(`missing ${id}`);
  return `${p.reference}. ${p.verses.map((v) => v.text).join(' ')}`;
}

for (const [id, e] of Object.entries(scripts)) {
  const used = [];
  const resolved = e.devotionalScript.replace(MARKER, (_m, bid) => {
    used.push(bid);
    return format(bid);
  });
  const plain = resolved.replace(/<break[^>]*>/g, ' ');
  const words = plain.split(/\s+/).filter(Boolean).length;
  let breaks = 0;
  for (const m of resolved.matchAll(/<break time="([\d.]+)s"\s*\/>/g)) {
    breaks += Number(m[1]) || 0;
  }
  const min = words / 120 + breaks / 60;
  console.log(
    `${id} words=${words} breaks=${breaks.toFixed(0)}s ≈${min.toFixed(1)}min [${used.join(', ')}]`,
  );
}
