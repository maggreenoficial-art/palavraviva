import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE =
  'https://raw.githubusercontent.com/midvash/bible-data/main/versions/pt/almeida-livre/books';
const outPath = path.join(root, 'src', 'constants', 'biblicalPrayerTexts.json');

/**
 * Passagens bíblicas reais — texto do dataset local (midvash/bible-data).
 * IDs com underscore maiúsculo são usados pelos marcadores {{BIBLE:ID}}.
 */
const prayers = [
  { id: 'pai-nosso', book: 'Matt', chapter: 6, from: 9, to: 13, label: 'Mateus 6:9-13' },
  { id: 'salmo-23', book: 'Ps', chapter: 23, from: 1, to: 6, label: 'Salmo 23:1-6' },
  { id: 'salmo-91', book: 'Ps', chapter: 91, from: 1, to: 16, label: 'Salmo 91:1-16' },
  { id: 'salmo-51', book: 'Ps', chapter: 51, from: 1, to: 12, label: 'Salmo 51:1-12' },
  { id: 'bencao-aaronica', book: 'Num', chapter: 6, from: 24, to: 26, label: 'Números 6:24-26' },
  { id: 'salmo-121', book: 'Ps', chapter: 121, from: 1, to: 8, label: 'Salmo 121:1-8' },
  { id: 'salmo-46', book: 'Ps', chapter: 46, from: 1, to: 11, label: 'Salmo 46:1-11' },
  { id: 'filipenses-4', book: 'Phil', chapter: 4, from: 6, to: 7, label: 'Filipenses 4:6-7' },
  { id: 'salmo-27', book: 'Ps', chapter: 27, from: 1, to: 14, label: 'Salmo 27:1-14' },
  { id: 'magnificat', book: 'Luke', chapter: 1, from: 46, to: 55, label: 'Lucas 1:46-55' },
  { id: 'oracao-jonas', book: 'Jonah', chapter: 2, from: 1, to: 9, label: 'Jonas 2:1-9' },
  { id: 'getsemani', book: 'Matt', chapter: 26, from: 39, to: 42, label: 'Mateus 26:39-42' },
  { id: 'salmo-139', book: 'Ps', chapter: 139, from: 1, to: 14, label: 'Salmo 139:1-14' },
  { id: 'salmo-4', book: 'Ps', chapter: 4, from: 1, to: 8, label: 'Salmo 4:1-8' },
  { id: 'isaias-41', book: 'Isa', chapter: 41, from: 10, to: 13, label: 'Isaías 41:10-13' },

  // Jornada de 7 dias — marcadores {{BIBLE:...}}
  { id: 'PSALM_56_3_4', book: 'Ps', chapter: 56, from: 3, to: 4, label: 'Salmo 56:3-4' },
  { id: '1_PETER_5_7', book: '1Pet', chapter: 5, from: 7, to: 7, label: '1 Pedro 5:7' },
  { id: 'PHILIPPIANS_4_6_7', book: 'Phil', chapter: 4, from: 6, to: 7, label: 'Filipenses 4:6-7' },
  { id: 'MATTHEW_6_31_34', book: 'Matt', chapter: 6, from: 31, to: 34, label: 'Mateus 6:31-34' },
  { id: 'MATTHEW_11_28_30', book: 'Matt', chapter: 11, from: 28, to: 30, label: 'Mateus 11:28-30' },
  { id: 'ISAIAH_41_10', book: 'Isa', chapter: 41, from: 10, to: 10, label: 'Isaías 41:10' },
  { id: 'PSALM_4_8', book: 'Ps', chapter: 4, from: 8, to: 8, label: 'Salmo 4:8' },
  { id: 'PSALM_23_1_4', book: 'Ps', chapter: 23, from: 1, to: 4, label: 'Salmo 23:1-4' },
  { id: 'LAMENTATIONS_3_21_23', book: 'Lam', chapter: 3, from: 21, to: 23, label: 'Lamentações 3:21-23' },

  // Meditações bíblicas — Amor / Criação / Fé
  { id: '1CORINTHIANS_13_1_3', book: '1Cor', chapter: 13, from: 1, to: 3, label: '1 Coríntios 13:1-3' },
  { id: '1CORINTHIANS_13_4_7', book: '1Cor', chapter: 13, from: 4, to: 7, label: '1 Coríntios 13:4-7' },
  { id: '1CORINTHIANS_13_13', book: '1Cor', chapter: 13, from: 13, to: 13, label: '1 Coríntios 13:13' },
  { id: 'GENESIS_1_1_5', book: 'Gen', chapter: 1, from: 1, to: 5, label: 'Gênesis 1:1-5' },
  { id: 'HEBREWS_11_1', book: 'Heb', chapter: 11, from: 1, to: 1, label: 'Hebreus 11:1' },

  // Série: Ansiedade · Autocontrole · Organização
  { id: 'PROVERBS_16_32', book: 'Prov', chapter: 16, from: 32, to: 32, label: 'Provérbios 16:32' },
  { id: 'GALATIANS_5_22_23', book: 'Gal', chapter: 5, from: 22, to: 23, label: 'Gálatas 5:22-23' },
  { id: 'PROVERBS_16_3', book: 'Prov', chapter: 16, from: 3, to: 3, label: 'Provérbios 16:3' },

  // 10 Orações do Velho Testamento (leitura guiada)
  { id: '1KINGS_8_22_30', book: '1Kgs', chapter: 8, from: 22, to: 30, label: '1 Reis 8:22-30' },
  { id: '1SAMUEL_2_1_10', book: '1Sam', chapter: 2, from: 1, to: 10, label: '1 Samuel 2:1-10' },
  { id: '1KINGS_18_36_39', book: '1Kgs', chapter: 18, from: 36, to: 39, label: '1 Reis 18:36-39' },
  { id: '1CHRONICLES_4_10', book: '1Chr', chapter: 4, from: 10, to: 10, label: '1 Crônicas 4:10' },
  { id: 'DANIEL_9_4_19', book: 'Dan', chapter: 9, from: 4, to: 19, label: 'Daniel 9:4-19' },
  { id: 'HABAKKUK_3_17_19', book: 'Hab', chapter: 3, from: 17, to: 19, label: 'Habacuque 3:17-19' },
  { id: 'EXODUS_32_11_14', book: 'Exod', chapter: 32, from: 11, to: 14, label: 'Êxodo 32:11-14' },
];

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

const existing = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
  : {};
const out = { ...existing };

for (const prayer of prayers) {
  console.log(`→ ${prayer.id}`);
  const bookData = await loadBook(prayer.book);
  const verses = extractVerses(bookData, prayer.chapter, prayer.from, prayer.to);
  if (verses.length === 0) {
    throw new Error(`Nenhum versículo para ${prayer.id}`);
  }
  out[prayer.id] = {
    reference: prayer.label,
    translationName: 'Texto bíblico',
    text: verses.map((v) => v.text).join(' '),
    verses,
  };
  console.log(`  ✓ ${prayer.label} (${verses.length} versículos)`);
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`\nSalvo em ${outPath} (${Object.keys(out).length} passagens)`);
