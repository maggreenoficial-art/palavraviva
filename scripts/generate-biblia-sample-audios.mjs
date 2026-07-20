/**
 * Gera 10 amostras de narração para avaliar qualidade.
 * Não altera áudios OT existentes (assets/audio/ot/).
 *
 * Uso:
 *   GEMINI_API_KEY=... npm run generate:biblia-samples
 *   npm run generate:biblia-samples -- --elevenlabs
 *   npm run generate:biblia-samples -- salmo-91
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

const args = process.argv.slice(2).filter((a) => a !== '--elevenlabs');
const forceEleven =
  process.argv.includes('--elevenlabs') ||
  process.env.BIBLIA_TTS_PROVIDER === 'elevenlabs';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_VOICE =
  process.env.ELEVENLABS_VOICE_ID || 'hgTbkcw2ddnzYh66cwCI';
const ELEVEN_MODEL =
  process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const GEMINI_MODEL =
  process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const GEMINI_VOICE = process.env.GEMINI_TTS_VOICE || 'Sulafat';
const onlyId = args[0];

/** Passagens OT que já têm MP3 — nunca sobrescrever */
const SKIP_IDS = new Set([
  'salmo-23',
  'salmo-51',
  '1KINGS_8_22_30',
  '1SAMUEL_2_1_10',
  '1KINGS_18_36_39',
  '1CHRONICLES_4_10',
  'DANIEL_9_4_19',
  'oracao-jonas',
  'HABAKKUK_3_17_19',
  'EXODUS_32_11_14',
]);

const SAMPLE_IDS = [
  'pai-nosso',
  'salmo-91',
  'filipenses-4',
  'bencao-aaronica',
  'ISAIAH_41_10',
  'salmo-121',
  'magnificat',
  'salmo-46',
  'salmo-139',
  'salmo-27',
];

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
const catalogById = new Map(catalog.map((item) => [item.id, item]));

const outDir = path.join(root, 'assets', 'audio', 'biblia-samples');
const resolvedDir = path.join(__dirname, 'resolved-biblia-samples');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(resolvedDir, { recursive: true });

function cleanBiblicalText(raw) {
  return String(raw || '')
    .replace(/\[[^\]]*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPrompt(id) {
  const passage = texts[id];
  const meta = catalogById.get(id);
  if (!passage?.text || !passage.reference) {
    throw new Error(`Texto ausente: ${id}`);
  }
  if (SKIP_IDS.has(id)) {
    throw new Error(`ID bloqueado (já tem áudio OT): ${id}`);
  }

  const body = cleanBiblicalText(passage.text);
  const title = meta?.title || passage.reference;

  return {
    title,
    reference: passage.reference,
    body,
    geminiPrompt:
      `Leia em português do Brasil, com voz serena, pausada e reverente, ` +
      `como uma leitura bíblica para meditação. Sem dramatização exagerada. ` +
      `Faça pausas naturais entre frases.\n\n` +
      `${title}.\n` +
      `${passage.reference}.\n\n` +
      `${body}`,
    elevenText:
      `${title}.\n` +
      `<break time="0.6s" />\n` +
      `Texto bíblico. ${passage.reference}.\n` +
      `<break time="1.0s" />\n` +
      `${body}\n` +
      `<break time="0.8s" />\n` +
      `Fim da passagem.`,
  };
}

function pcmToWav(pcm, sampleRate = 24_000, channels = 1, bitDepth = 16) {
  const blockAlign = (channels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

function tryConvertMp3(wavPath, mp3Path) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path],
    { encoding: 'utf8' },
  );
  return result.status === 0 && fs.existsSync(mp3Path);
}

async function generateGemini(id, built) {
  const wavPath = path.join(outDir, `${id}.wav`);
  const mp3Path = path.join(outDir, `${id}.mp3`);

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_MODEL}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: built.geminiPrompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: GEMINI_VOICE },
          },
        },
      },
    }),
  });

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `${id}: resposta inválida (${response.status}) ${rawText.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    const msg = data?.error?.message || rawText.slice(0, 300);
    const err = new Error(`${id}: ${response.status} ${msg}`);
    err.status = response.status;
    err.body = msg;
    throw err;
  }

  const part = data?.candidates?.[0]?.content?.parts?.[0];
  const b64 = part?.inlineData?.data;
  const mime = part?.inlineData?.mimeType || '';
  if (!b64) {
    throw new Error(
      `${id}: sem áudio na resposta. ${JSON.stringify(data).slice(0, 400)}`,
    );
  }

  const pcm = Buffer.from(b64, 'base64');
  const rateMatch = /rate=(\d+)/i.exec(mime);
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24_000;
  const wav = pcmToWav(pcm, sampleRate);
  fs.writeFileSync(wavPath, wav);
  console.log(`  ✓ WAV ${(wav.length / 1024).toFixed(1)} KB (${sampleRate} Hz)`);

  if (tryConvertMp3(wavPath, mp3Path)) {
    console.log(`  ✓ MP3 ${(fs.statSync(mp3Path).size / 1024).toFixed(1)} KB`);
  } else {
    console.log('  · MP3 pulado (ffmpeg não encontrado) — use o .wav');
  }
}

async function generateEleven(id, built) {
  const mp3Path = path.join(outDir, `${id}.mp3`);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: built.elevenText,
        model_id: ELEVEN_MODEL,
        voice_settings: {
          stability: 0.84,
          similarity_boost: 0.7,
          style: 0.12,
          speed: 0.82,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`${id}: ${response.status} ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(mp3Path, buffer);
  console.log(`  ✓ MP3 ${(buffer.length / 1024).toFixed(1)} KB`);
}

async function probeGeminiFree() {
  if (!GEMINI_KEY) return false;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'Leia em português, voz serena: O Senhor é o meu pastor.',
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: GEMINI_VOICE },
          },
        },
      },
    }),
  });
  if (response.ok) return true;
  const text = await response.text();
  console.warn(`Gemini indisponível (${response.status}): ${text.slice(0, 180)}`);
  return false;
}

let provider = forceEleven ? 'elevenlabs' : 'gemini';
if (provider === 'gemini') {
  if (!GEMINI_KEY) {
    console.warn('GEMINI_API_KEY ausente — usando ElevenLabs.');
    provider = 'elevenlabs';
  } else {
    console.log('Testando Gemini (free/paid da conta)...');
    const ok = await probeGeminiFree();
    if (!ok) {
      console.warn(
        'Gemini bloqueado nesta chave (créditos pré-pagos esgotados / sem free tier neste projeto).',
      );
      console.warn('Gerando amostras com ElevenLabs (mesma voz das orações OT).');
      provider = 'elevenlabs';
    }
  }
}

if (provider === 'elevenlabs' && !ELEVEN_KEY) {
  console.error('ELEVENLABS_API_KEY ausente no .env');
  process.exit(1);
}

console.log(`Provider: ${provider}`);

const list = (onlyId ? [onlyId] : SAMPLE_IDS).filter((id) => {
  if (SKIP_IDS.has(id)) {
    console.warn(`Pulando ${id} (já tem áudio OT).`);
    return false;
  }
  return true;
});

if (!list.length) {
  console.error('Nenhuma passagem para gerar.');
  process.exit(1);
}

for (const id of list) {
  const meta = catalogById.get(id);
  const built = buildPrompt(id);
  fs.writeFileSync(
    path.join(resolvedDir, `${id}.txt`),
    provider === 'gemini' ? built.geminiPrompt : built.elevenText,
    'utf8',
  );

  console.log(`\n→ ${meta?.referenceLabel || id} (${id})`);
  if (provider === 'gemini') {
    console.log(
      `  model=${GEMINI_MODEL} voice=${GEMINI_VOICE} chars=${built.geminiPrompt.length}`,
    );
    await generateGemini(id, built);
  } else {
    console.log(
      `  model=${ELEVEN_MODEL} voice=${ELEVEN_VOICE} chars=${built.elevenText.length}`,
    );
    await generateEleven(id, built);
  }
}

console.log(`\nAmostras em ${path.relative(root, outDir)}/`);
console.log('Áudios OT em assets/audio/ot/ não foram alterados.');
