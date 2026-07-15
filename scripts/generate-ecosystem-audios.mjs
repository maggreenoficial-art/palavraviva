import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'hgTbkcw2ddnzYh66cwCI';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const onlyId = process.argv[2];

if (!API_KEY) {
  console.error('Defina ELEVENLABS_API_KEY no arquivo .env');
  process.exit(1);
}

const texts = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src', 'constants', 'biblicalPrayerTexts.json'),
    'utf8',
  ),
);

const scripts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ecosystem-scripts.json'), 'utf8'),
);

const outDir = path.join(root, 'assets', 'audio');
const resolvedDir = path.join(__dirname, 'resolved-ecosystem');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(resolvedDir, { recursive: true });

const MARKER_RE = /\{\{BIBLE:([A-Z0-9_]+)\}\}/g;

function formatBiblical(passageId) {
  const passage = texts[passageId];
  if (!passage?.text?.trim() || !passage.reference || !passage.verses?.length) {
    throw new Error(
      `Passagem bíblica ausente no dataset: ${passageId}. Rode npm run fetch:prayers. Não invente texto.`,
    );
  }
  const verseText = passage.verses.map((v) => v.text).join(' ');
  return `${passage.reference}. ${verseText}`;
}

function resolveScript(script) {
  const used = [];
  const resolved = script.replace(MARKER_RE, (_m, id) => {
    used.push(id);
    return `\n<break time="1.0s" />\n${formatBiblical(id)}\n<break time="1.0s" />\n`;
  });
  const leftover = resolved.match(MARKER_RE);
  if (leftover?.length) {
    throw new Error(`Marcadores não resolvidos: ${leftover.join(', ')}`);
  }
  return { resolved: resolved.replace(/\n{3,}/g, '\n\n').trim(), used };
}

function countWords(text) {
  return text
    .replace(/<break[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function sumBreakSeconds(text) {
  let total = 0;
  for (const match of text.matchAll(/<break time="([\d.]+)s"\s*\/>/g)) {
    total += Number(match[1]) || 0;
  }
  return total;
}

async function generateOne(id, entry, text) {
  const outPath = path.join(outDir, `${id}.mp3`);
  const voiceId = entry.voiceId || DEFAULT_VOICE_ID;
  const settings = entry.settings;

  console.log(`\n→ Gerando: ${entry.title} (${id})`);
  console.log(`  Entrega: ${entry.voiceHint}`);
  console.log(
    `  Voz: ${voiceId} | speed=${settings.speed} stability=${settings.stability} style=${settings.style}`,
  );
  console.log(`  Palavras ≈ ${countWords(text)} | chars=${text.length}`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity_boost,
          style: settings.style,
          use_speaker_boost: true,
          speed: settings.speed,
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha em ${id}: ${response.status} ${errText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ Salvo: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const ids = onlyId ? [onlyId] : Object.keys(scripts);

for (const id of ids) {
  const entry = scripts[id];
  if (!entry) {
    console.error(`Script não encontrado: ${id}`);
    process.exit(1);
  }

  const { resolved, used } = resolveScript(entry.devotionalScript);
  const resolvedPath = path.join(resolvedDir, `${id}.txt`);
  fs.writeFileSync(resolvedPath, resolved, 'utf8');
  console.log(`Roteiro resolvido (${used.join(', ')}) → ${resolvedPath}`);

  const words = countWords(resolved);
  const breaks = sumBreakSeconds(resolved);
  const estMin = words / 120 + breaks / 60;
  console.log(
    `  Estimativa ≈ ${estMin.toFixed(1)} min (palavras=${words}, pausas=${breaks.toFixed(1)}s)`,
  );
  if (words < 520) {
    console.warn(`  Aviso: roteiro pode ficar abaixo de 5 min (~${words} palavras).`);
  }

  await generateOne(id, entry, resolved);
}

console.log('\nÁudios da série ecossistema gerados com sucesso.');
