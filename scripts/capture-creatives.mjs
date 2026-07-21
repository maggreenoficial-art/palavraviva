/**
 * Captura prints 9:16 (1080×1920) de todas as telas para criativos.
 * Uso: node scripts/capture-creatives.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'creatives', 'screenshots-9x16');
const BASE = process.argv[2] || 'http://localhost:8081';
const WIDTH = 1080;
const HEIGHT = 1920;

const onboardedState = {
  state: {
    hasOnboarded: true,
    userId: 'pv_criativo_demo',
    displayName: 'Ana Clara',
    whatsapp: '11987654321',
    feeling: 'ansioso',
    fontScale: 'grande',
    unlockedTools: [],
    trialStartedAt: new Date().toISOString(),
    subscriptionExpiresAt: null,
  },
  version: 4,
};

/** Onboarding limpo, mas com tipografia grande para o criativo. */
const freshState = {
  state: {
    hasOnboarded: false,
    userId: null,
    displayName: null,
    whatsapp: null,
    feeling: null,
    fontScale: 'grande',
    unlockedTools: [],
    trialStartedAt: null,
    subscriptionExpiresAt: null,
  },
  version: 4,
};

const screens = [
  { file: '01-onboarding', path: '/onboarding', fresh: true },
  { file: '02-home', path: '/home' },
  { file: '03-oracoes', path: '/biblia' },
  { file: '04-sos', path: '/sos' },
  { file: '05-player-ansiedade', path: '/player/ansiedade-01' },
  { file: '06-player-sos', path: '/player/sos-paz' },
  { file: '07-player-meditacao', path: '/player/amor-acalma-01' },
  { file: '08-leitura-salmo-23', path: '/leitura/ot-salmo-23' },
  { file: '09-leitura-ana', path: '/leitura/ot-ana' },
  { file: '10-oracao-pai-nosso', path: '/oracao/pai-nosso' },
  { file: '11-oracao-salmo-91', path: '/oracao/salmo-91' },
];

async function seedUser(page, fresh) {
  await page.addInitScript(
    ({ onboarded, freshState, fresh }) => {
      try {
        localStorage.setItem(
          'palavra-viva-user',
          JSON.stringify(fresh ? freshState : onboarded),
        );
      } catch {
        // ignore
      }
    },
    {
      onboarded: onboardedState,
      freshState,
      fresh: Boolean(fresh),
    },
  );
}

async function waitForApp(page) {
  await page.waitForTimeout(1200);
  // Espera o root do Expo/RN Web
  await page.waitForSelector('#root, [data-testid], body', { timeout: 30_000 });
  await page.waitForTimeout(1800);
}

/** Amplia tipografia nos criativos (RN Web usa classes atômicas). */
async function enlargeTypography(page, factor = 1.32) {
  await page.evaluate((factor) => {
    const scalePx = (value) => {
      if (!value || typeof value !== 'string' || !value.endsWith('px')) return null;
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return `${Math.round(n * factor)}px`;
    };

    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (!rule.style) continue;
        const nextFont = scalePx(rule.style.fontSize);
        if (nextFont) rule.style.fontSize = nextFont;
        const nextLine = scalePx(rule.style.lineHeight);
        if (nextLine) rule.style.lineHeight = nextLine;
      }
    }
  }, factor);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });

  console.log(`Base: ${BASE}`);
  console.log(`Saída: ${outDir}`);
  console.log(`Viewport: ${WIDTH}×${HEIGHT} (9:16)`);
  console.log(`Tipografia: ampliada 1.32× (criativos)\n`);

  for (const screen of screens) {
    const page = await context.newPage();
    await seedUser(page, screen.fresh);
    const url = `${BASE}${screen.path}`;
    process.stdout.write(`→ ${screen.file} … `);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      await waitForApp(page);
      await enlargeTypography(page, 1.32);
      await page.waitForTimeout(300);
      const filePath = path.join(outDir, `${screen.file}.png`);
      await page.screenshot({
        path: filePath,
        fullPage: false,
        type: 'png',
      });
      console.log('ok');
    } catch (error) {
      console.log('ERRO');
      console.error(`  ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\nPronto. Arquivos em creatives/screenshots-9x16/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
