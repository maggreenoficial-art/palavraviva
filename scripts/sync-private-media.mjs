/**
 * Espelha assets/audio → server/private-media (dev / include local).
 * Uso: node scripts/sync-private-media.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'assets', 'audio');
const destDir = path.join(root, 'server', 'private-media');

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(fromPath, toPath);
    } else if (entry.isFile() && /\.mp3$/i.test(entry.name)) {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

if (!fs.existsSync(srcDir)) {
  console.error('Pasta assets/audio não encontrada.');
  process.exit(1);
}

copyRecursive(srcDir, destDir);
console.log(`OK: áudios sincronizados em ${path.relative(root, destDir)}`);
