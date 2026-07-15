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
const onlyId = process.argv[2];

if (!API_KEY) {
  console.error('Defina ELEVENLABS_API_KEY no arquivo .env');
  process.exit(1);
}

const prompts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ambient-prompts.json'), 'utf8'),
);
const outDir = path.join(root, 'assets', 'audio', 'ambient');
fs.mkdirSync(outDir, { recursive: true });

async function generateAmbient(id, entry) {
  const outPath = path.join(outDir, `${id}.mp3`);
  console.log(`\n→ Ambiente: ${entry.title} (${id})`);

  const response = await fetch(
    'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: entry.prompt,
        duration_seconds: 30,
        loop: true,
        prompt_influence: 0.45,
        model_id: 'eleven_text_to_sound_v2',
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

const ids = onlyId ? [onlyId] : Object.keys(prompts);

for (const id of ids) {
  const entry = prompts[id];
  if (!entry) {
    console.error(`Ambiente não encontrado: ${id}`);
    process.exit(1);
  }
  await generateAmbient(id, entry);
}

console.log('\nAmbientes gerados em assets/audio/ambient/');
