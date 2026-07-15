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
// Aninha — Warm, Calm and Soothing (PT-BR)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'hgTbkcw2ddnzYh66cwCI';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const onlyId = process.argv[2];

if (!API_KEY) {
  console.error('Defina ELEVENLABS_API_KEY no arquivo .env');
  process.exit(1);
}

const scripts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'audio-scripts.json'), 'utf8'),
);
const outDir = path.join(root, 'assets', 'audio');
fs.mkdirSync(outDir, { recursive: true });

async function generateOne(id, entry) {
  const outPath = path.join(outDir, `${id}.mp3`);
  console.log(`\n→ Gerando: ${entry.title} (${id})`);
  console.log(`  Voz: ${VOICE_ID} | Modelo: ${MODEL_ID}`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: entry.text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: entry.settings.stability,
          similarity_boost: entry.settings.similarity_boost,
          style: entry.settings.style,
          use_speaker_boost: true,
          speed: entry.settings.speed,
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
  return outPath;
}

const ids = onlyId ? [onlyId] : Object.keys(scripts);

for (const id of ids) {
  const entry = scripts[id];
  if (!entry) {
    console.error(`Script não encontrado: ${id}`);
    process.exit(1);
  }
  await generateOne(id, entry);
}

console.log('\nÁudios gerados com sucesso em assets/audio/');
