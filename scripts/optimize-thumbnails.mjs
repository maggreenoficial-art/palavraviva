/**
 * Redimensiona capas (máx. 480px) e grava JPEG otimizado.
 * Uso: node scripts/optimize-thumbnails.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'assets', 'thumbnails');
const MAX_WIDTH = 480;

async function main() {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !f.endsWith('.bak'));

  let before = 0;
  let after = 0;

  for (const file of files) {
    const src = path.join(dir, file);
    const base = file.replace(/\.(png|jpe?g|webp)$/i, '');
    const outJpg = path.join(dir, `${base}.jpg`);
    const input = fs.readFileSync(src);
    before += input.length;

    const jpg = await sharp(input)
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: Math.round(MAX_WIDTH * 1.2),
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(outJpg, jpg);
    after += jpg.length;

    // Remove originais pesados que não são o jpg final
    if (!file.toLowerCase().endsWith('.jpg')) {
      fs.unlinkSync(src);
    } else if (src !== outJpg && fs.existsSync(src)) {
      // já era jpg com outro casing
    }

    console.log(
      `${base}: ${(input.length / 1024).toFixed(0)}KB → ${(jpg.length / 1024).toFixed(0)}KB`,
    );
  }

  // Limpa webp/png residuais do mesmo basename se sobrou
  for (const file of fs.readdirSync(dir)) {
    if (/\.(png|webp)$/i.test(file)) {
      const jpg = path.join(dir, file.replace(/\.(png|webp)$/i, '.jpg'));
      if (fs.existsSync(jpg)) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }

  console.log(
    `\nTotal: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
