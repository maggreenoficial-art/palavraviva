import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

// Carrega a jornada via TypeScript compilado não disponível — lê o arquivo fonte e avalia de forma segura via dynamic import após transpile.
// Em vez disso, mantemos um espelho JSON gerado a partir do TS, ou importamos o .ts via ts-node.
// Solução simples: definir os scripts resolvidos lendo anxietyJourney.ts com regex dos templates é frágil.
// Melhor: escrever journey-scripts.json a partir do código Node que importa o módulo com tsx/esbuild.
// Como o projeto não tem tsx, vamos ler o JSON de templates embutido.

const journeyPath = path.join(__dirname, 'journey-templates.json');
if (!fs.existsSync(journeyPath)) {
  console.error('Arquivo scripts/journey-templates.json não encontrado.');
  process.exit(1);
}

const journey = JSON.parse(fs.readFileSync(journeyPath, 'utf8'));
const outDir = path.join(root, 'assets', 'audio');
const resolvedDir = path.join(__dirname, 'resolved-journey');
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

async function generateOne(id, title, text) {
  const outPath = path.join(outDir, `${id}.mp3`);
  console.log(`\n→ Gerando: ${title} (${id})`);
  console.log(`  Caracteres: ${text.length}`);

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
          stability: 0.84,
          similarity_boost: 0.7,
          style: 0.12,
          use_speaker_boost: true,
          speed: 0.85,
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

const ids = onlyId ? [onlyId] : Object.keys(journey);

for (const id of ids) {
  const entry = journey[id];
  if (!entry) {
    console.error(`Sessão não encontrada: ${id}`);
    process.exit(1);
  }

  const { resolved, used } = resolveScript(entry.devotionalScript);
  if (resolved.includes('{{BIBLE:')) {
    throw new Error(`Marcador residual em ${id}`);
  }

  const resolvedPath = path.join(resolvedDir, `${id}.txt`);
  fs.writeFileSync(resolvedPath, resolved, 'utf8');
  console.log(`Roteiro resolvido (${used.join(', ')}) → ${resolvedPath}`);

  // Estimativa grosseira: ~14 chars/segundo em fala calma → ~3 min = ~2500 chars
  if (resolved.length > 3200) {
    console.warn(
      `  Aviso: roteiro de ${id} pode ultrapassar ~3 minutos (${resolved.length} chars).`,
    );
  }

  await generateOne(id, entry.title, resolved);
}

console.log('\nÁudios da jornada gerados com sucesso.');
