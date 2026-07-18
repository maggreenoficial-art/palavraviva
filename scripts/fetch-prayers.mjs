import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE =
  'https://raw.githubusercontent.com/midvash/bible-data/main/versions/pt/almeida-livre/books';
const catalogPath = path.join(
  root,
  'src',
  'constants',
  'biblicalPrayerCatalog.json',
);
const outPath = path.join(root, 'src', 'constants', 'biblicalPrayerTexts.json');

/**
 * Passagens bíblicas reais — texto do dataset (midvash/bible-data).
 * Catálogo único: src/constants/biblicalPrayerCatalog.json
 */
const prayers = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const bookCache = new Map();

async function loadBook(book) {
  if (bookCache.has(book)) return bookCache.get(book);
  const url = `${BASE}/${book}.json`;
  console.log(`  baixando livro ${book}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${book}: ${response.status}`);
  const data = await response.json();
  bookCache.set(book, data);
  return data;
}

function extractVerses(bookData, chapter, from, to) {
  const chapterData = bookData.chapters.find((item) => item.chapter === chapter);
  if (!chapterData) throw new Error(`Capítulo ${chapter} não encontrado`);
  return chapterData.verses
    .filter((verse) => verse.number >= from && verse.number <= to)
    .map((verse) => ({
      verse: verse.number,
      text: verse.text.replace(/\s+/g, ' ').trim(),
    }));
}

const out = {};

for (const prayer of prayers) {
  console.log(`→ ${prayer.id}`);
  const bookData = await loadBook(prayer.book);
  const verses = extractVerses(
    bookData,
    prayer.chapter,
    prayer.from,
    prayer.to,
  );
  if (verses.length === 0) {
    throw new Error(`Nenhum versículo para ${prayer.id}`);
  }
  out[prayer.id] = {
    reference: prayer.referenceLabel,
    translationName: 'Texto bíblico',
    text: verses.map((v) => v.text).join(' '),
    verses,
  };
  console.log(
    `  ✓ ${prayer.referenceLabel} (${verses.length} versículos)`,
  );
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`\nSalvo em ${outPath} (${Object.keys(out).length} passagens)`);
