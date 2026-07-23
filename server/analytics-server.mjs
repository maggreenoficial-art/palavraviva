import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  backfillUsersFromEvents,
  getAdminPanelHtml,
  getAnalyticsStats,
  handleAdminSubscriptionAction,
  ingestAnalyticsEvent,
  isAdminAuthorized,
  syncAnalyticsPayload,
} from './analytics-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.ANALYTICS_PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'palavraviva';

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

function send(res, status, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body != null) {
      try {
        if (typeof req.body === 'string') {
          resolve(req.body ? JSON.parse(req.body) : {});
          return;
        }
        if (Buffer.isBuffer(req.body)) {
          const raw = req.body.toString('utf8');
          resolve(raw ? JSON.parse(raw) : {});
          return;
        }
        if (typeof req.body === 'object') {
          resolve(req.body);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin')) {
    send(res, 200, getAdminPanelHtml(), 'text/html');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    try {
      const body = await readBody(req);
      await ingestAnalyticsEvent(body, req);
      send(res, 201, { ok: true });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/internal/sync') {
    if (!isAdminAuthorized(req, url)) {
      send(res, 401, { ok: false, error: 'unauthorized' });
      return;
    }
    try {
      const body = await readBody(req);
      const result = syncAnalyticsPayload(body);
      send(res, 200, { ok: true, ...result });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error.message || error) });
    }
    return;
  }

  if (
    req.method === 'GET' &&
    (url.pathname === '/api/stats' || url.pathname === '/api/admin/stats')
  ) {
    if (!isAdminAuthorized(req, url)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }
    send(res, 200, getAnalyticsStats());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/subscriptions') {
    if (!isAdminAuthorized(req, url)) {
      send(res, 401, { ok: false, error: 'unauthorized' });
      return;
    }
    try {
      const body = await readBody(req);
      const result = handleAdminSubscriptionAction(body);
      send(res, 200, { ok: true, ...result });
    } catch (error) {
      const message = String(error.message || error);
      const status = message === 'assinatura_nao_encontrada' ? 404 : 400;
      send(res, status, { ok: false, error: message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true });
    return;
  }

  send(res, 404, { error: 'not_found' });
});

backfillUsersFromEvents();

server.listen(PORT, () => {
  const password = process.env.ADMIN_PASSWORD || ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`\nPainel Palavra Viva`);
  console.log(`→ http://localhost:${PORT}/admin`);
  console.log(`→ Senha: ${password}`);
  console.log(`→ API eventos: POST http://localhost:${PORT}/api/events`);
  if (isProd && password === 'palavraviva') {
    console.warn(
      '⚠ PRODUÇÃO: defina ADMIN_PASSWORD forte no .env (senha padrão ainda ativa).\n',
    );
  } else {
    console.log('');
  }
});
