/**
 * Envia server/private-media (ou assets/audio) para S3/R2.
 *
 * Env:
 *   MEDIA_S3_BUCKET
 *   MEDIA_S3_ACCESS_KEY_ID
 *   MEDIA_S3_SECRET_ACCESS_KEY
 *   MEDIA_S3_ENDPOINT (R2)
 *   MEDIA_S3_REGION (default auto)
 *   MEDIA_S3_PREFIX (default audio)
 *
 * Uso: node scripts/upload-private-media.mjs
 */
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

const bucket = process.env.MEDIA_S3_BUCKET;
const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.MEDIA_S3_SECRET_ACCESS_KEY;
const endpoint = process.env.MEDIA_S3_ENDPOINT;
const region = process.env.MEDIA_S3_REGION || 'auto';
const prefix = (process.env.MEDIA_S3_PREFIX || 'audio').replace(/\/$/, '');

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.error(
    'Defina MEDIA_S3_BUCKET, MEDIA_S3_ACCESS_KEY_ID e MEDIA_S3_SECRET_ACCESS_KEY',
  );
  process.exit(1);
}

const privateDir = path.join(root, 'server', 'private-media');
const assetsDir = path.join(root, 'assets', 'audio');
const sourceDir = fs.existsSync(privateDir) ? privateDir : assetsDir;

function listMp3(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMp3(full, base));
    else if (/\.mp3$/i.test(entry.name)) {
      out.push({
        full,
        key: path.relative(base, full).split(path.sep).join('/'),
      });
    }
  }
  return out;
}

const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({
  region,
  endpoint: endpoint || undefined,
  forcePathStyle: Boolean(endpoint),
  credentials: { accessKeyId, secretAccessKey },
});

const files = listMp3(sourceDir);
console.log(`Enviando ${files.length} arquivos de ${sourceDir} → s3://${bucket}/${prefix}/`);

for (const file of files) {
  const Key = `${prefix}/${file.key}`;
  const Body = fs.readFileSync(file.full);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body,
      ContentType: 'audio/mpeg',
      CacheControl: 'private, no-store',
    }),
  );
  console.log(`  ✓ ${Key}`);
}

console.log('Upload concluído.');
