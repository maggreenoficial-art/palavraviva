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
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'hgTbkcw2ddnzYh66cwCI';
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

/** Metadados espelhados do catálogo TS — mantidos aqui para o gerador Node. */
const prayers = [
  {
    id: 'ot-salmo-23',
    passageId: 'salmo-23',
    title: 'O Salmo do Pastor',
    who: 'Rei Davi',
    settings: { stability: 0.84, similarity_boost: 0.7, style: 0.12, speed: 0.82 },
  },
  {
    id: 'ot-salmo-51',
    passageId: 'salmo-51',
    title: 'A Oração de Arrependimento',
    who: 'Rei Davi',
    settings: { stability: 0.88, similarity_boost: 0.68, style: 0.1, speed: 0.8 },
  },
  {
    id: 'ot-salomao-templo',
    passageId: '1KINGS_8_22_30',
    title: 'A Dedicação do Templo',
    who: 'Rei Salomão',
    settings: { stability: 0.8, similarity_boost: 0.72, style: 0.18, speed: 0.86 },
  },
  {
    id: 'ot-ana',
    passageId: '1SAMUEL_2_1_10',
    title: 'O Cântico de Ana',
    who: 'Ana',
    settings: { stability: 0.76, similarity_boost: 0.74, style: 0.22, speed: 0.88 },
  },
  {
    id: 'ot-elias-carmelo',
    passageId: '1KINGS_18_36_39',
    title: 'O Desafio no Monte Carmelo',
    who: 'Profeta Elias',
    settings: { stability: 0.7, similarity_boost: 0.75, style: 0.28, speed: 0.9 },
  },
  {
    id: 'ot-jabez',
    passageId: '1CHRONICLES_4_10',
    title: 'A Oração de Jabez',
    who: 'Jabez',
    settings: { stability: 0.82, similarity_boost: 0.7, style: 0.16, speed: 0.84 },
  },
  {
    id: 'ot-daniel-9',
    passageId: 'DANIEL_9_4_19',
    title: 'A Intercessão por Israel',
    who: 'Profeta Daniel',
    settings: { stability: 0.86, similarity_boost: 0.7, style: 0.14, speed: 0.83 },
  },
  {
    id: 'ot-jonas',
    passageId: 'oracao-jonas',
    title: 'O Clamor no Ventre do Peixe',
    who: 'Profeta Jonas',
    settings: { stability: 0.9, similarity_boost: 0.66, style: 0.08, speed: 0.78 },
  },
  {
    id: 'ot-habacuque',
    passageId: 'HABAKKUK_3_17_19',
    title: 'A Oração da Fé na Escassez',
    who: 'Profeta Habacuque',
    settings: { stability: 0.8, similarity_boost: 0.72, style: 0.2, speed: 0.85 },
  },
  {
    id: 'ot-moises',
    passageId: 'EXODUS_32_11_14',
    title: 'A Intercessão de Moisés',
    who: 'Moisés',
    settings: { stability: 0.78, similarity_boost: 0.73, style: 0.2, speed: 0.87 },
  },
];

const outDir = path.join(root, 'assets', 'audio', 'ot');
const resolvedDir = path.join(__dirname, 'resolved-ot');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(resolvedDir, { recursive: true });

function buildNarration(passageId, title, who) {
  const passage = texts[passageId];
  if (!passage?.verses?.length || !passage.reference) {
    throw new Error(
      `Passagem ausente: ${passageId}. Rode npm run fetch:prayers. Não invente texto.`,
    );
  }

  const verseBlocks = passage.verses
    .map(
      (v) =>
        `Versículo ${v.verse}.\n<break time="0.4s" />\n${v.text}\n<break time="1.1s" />`,
    )
    .join('\n');

  return (
    `${title}.\n` +
    `<break time="0.6s" />\n` +
    `Quem orou: ${who}.\n` +
    `<break time="0.8s" />\n` +
    `Texto bíblico. ${passage.reference}.\n` +
    `<break time="1.2s" />\n` +
    `${verseBlocks}\n` +
    `<break time="1.0s" />\n` +
    `Fim da passagem.`
  );
}

async function generateOne(entry) {
  const text = buildNarration(entry.passageId, entry.title, entry.who);
  fs.writeFileSync(path.join(resolvedDir, `${entry.id}.txt`), text, 'utf8');

  const outPath = path.join(outDir, `${entry.id}.mp3`);
  console.log(`\n→ ${entry.title} (${entry.id})`);
  console.log(
    `  speed=${entry.settings.speed} style=${entry.settings.style} chars=${text.length}`,
  );

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
        text,
        model_id: MODEL_ID,
        voice_settings: {
          ...entry.settings,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`${entry.id}: ${response.status} ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ ${(buffer.length / 1024).toFixed(1)} KB`);
}

const list = onlyId ? prayers.filter((p) => p.id === onlyId) : prayers;
if (!list.length) {
  console.error('ID não encontrado');
  process.exit(1);
}

for (const entry of list) {
  await generateOne(entry);
}

console.log('\nNarrações OT salvas em assets/audio/ot/');
