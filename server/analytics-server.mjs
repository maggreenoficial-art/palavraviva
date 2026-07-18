import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const eventsPath = path.join(dataDir, 'events.json');
const usersPath = path.join(dataDir, 'users.json');
const PORT = Number(process.env.ANALYTICS_PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'palavraviva';

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(eventsPath)) {
  fs.writeFileSync(eventsPath, '[]', 'utf8');
}
if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, '{}', 'utf8');
}

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

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeEvents(events) {
  // Mantém no máximo ~50k eventos
  const trimmed = events.slice(-50_000);
  fs.writeFileSync(eventsPath, JSON.stringify(trimmed), 'utf8');
}

function readUsers() {
  try {
    const raw = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

function upsertUserProfile(event) {
  const key = event.userId || null;
  if (!key) return;

  const users = readUsers();
  const prev = users[key] || {
    userId: key,
    displayName: null,
    whatsapp: null,
    city: null,
    region: null,
    country: null,
    source: null,
    platform: null,
    firstSeenAt: event.occurredAt,
    lastSeenAt: event.occurredAt,
    events: 0,
  };

  users[key] = {
    ...prev,
    displayName: event.displayName || prev.displayName,
    whatsapp: event.whatsapp || prev.whatsapp,
    city: event.geo?.city || prev.city,
    region: event.geo?.region || prev.region,
    country: event.geo?.country || prev.country,
    source: event.attribution?.source || prev.source,
    platform: event.platform || prev.platform,
    firstSeenAt: prev.firstSeenAt || event.occurredAt,
    lastSeenAt:
      Date.parse(event.occurredAt) >= Date.parse(prev.lastSeenAt || 0)
        ? event.occurredAt
        : prev.lastSeenAt,
    events: (prev.events || 0) + 1,
  };

  writeUsers(users);
}

function formatWhatsapp(digits) {
  if (!digits) return null;
  const clean = String(digits).replace(/\D/g, '');
  if (clean.length < 10) return clean;
  const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
  return withCountry;
}

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

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

async function lookupGeo(ip) {
  const clean = (ip || '').replace('::ffff:', '');
  if (
    !clean ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('192.168.') ||
    clean.startsWith('10.')
  ) {
    return {
      city: 'Local',
      region: '',
      country: 'BR',
      lat: -14.235,
      lon: -51.9253,
    };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,city,regionName,country,lat,lon`,
    );
    const data = await response.json();
    if (data.status !== 'success') {
      return { city: 'Desconhecida', region: '', country: '', lat: null, lon: null };
    }
    return {
      city: data.city || 'Desconhecida',
      region: data.regionName || '',
      country: data.country || '',
      lat: data.lat ?? null,
      lon: data.lon ?? null,
    };
  } catch {
    return { city: 'Desconhecida', region: '', country: '', lat: null, lon: null };
  }
}

function isAuthorized(req, url) {
  const header = req.headers['x-admin-password'];
  const queryPass = url.searchParams.get('password');
  const password = process.env.ADMIN_PASSWORD || ADMIN_PASSWORD;
  return header === password || queryPass === password;
}

function topCounts(items, keyFn, limit = 10) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const prev = map.get(key) || { key, count: 0, label: key };
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function buildStats(events) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const recent = events.filter((e) => Date.parse(e.occurredAt) >= weekAgo);
  const today = events.filter((e) => Date.parse(e.occurredAt) >= dayAgo);

  const contacts = Object.values(readUsers())
    .filter((u) => u.displayName || u.whatsapp)
    .sort((a, b) => Date.parse(b.lastSeenAt || 0) - Date.parse(a.lastSeenAt || 0));

  const onlineWindow = now - 2 * 60 * 1000;
  const onlineMap = new Map();
  for (const event of events) {
    if (event.name !== 'presence' && event.name !== 'app_open') continue;
    const t = Date.parse(event.occurredAt);
    if (t < onlineWindow) continue;
    const key = event.userId || event.sessionId;
    if (!key) continue;
    onlineMap.set(key, event);
  }

  const listens = recent.filter((e) => e.name === 'listen_start');
  const reads = recent.filter((e) => e.name === 'read_open');
  const opens = recent.filter((e) => e.name === 'app_open');
  const screens = recent.filter((e) => e.name === 'screen_view');

  const cities = topCounts(
    recent.filter((e) => e.geo?.city),
    (e) => `${e.geo.city}${e.geo.region ? `/${e.geo.region}` : ''}`,
    15,
  ).map((row) => {
    const sample = recent.find(
      (e) =>
        e.geo?.city &&
        `${e.geo.city}${e.geo.region ? `/${e.geo.region}` : ''}` === row.key,
    );
    return {
      ...row,
      lat: sample?.geo?.lat ?? null,
      lon: sample?.geo?.lon ?? null,
      country: sample?.geo?.country ?? '',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      events7d: recent.length,
      opens7d: opens.length,
      listens7d: listens.length,
      reads7d: reads.length,
      opens24h: today.filter((e) => e.name === 'app_open').length,
      onlineNow: onlineMap.size,
      contacts: contacts.length,
      withWhatsapp: contacts.filter((u) => u.whatsapp).length,
    },
    online: [...onlineMap.values()].map((e) => ({
      userId: e.userId,
      displayName: e.displayName || null,
      whatsapp: e.whatsapp || null,
      whatsappLink: formatWhatsapp(e.whatsapp),
      sessionId: e.sessionId,
      city: e.geo?.city || '—',
      source: e.attribution?.source || '—',
      at: e.occurredAt,
    })),
    contacts: contacts.map((u) => ({
      userId: u.userId,
      displayName: u.displayName || null,
      whatsapp: u.whatsapp || null,
      whatsappLink: formatWhatsapp(u.whatsapp),
      city: u.city || '—',
      source: u.source || '—',
      platform: u.platform || '—',
      firstSeenAt: u.firstSeenAt,
      lastSeenAt: u.lastSeenAt,
      events: u.events || 0,
    })),
    users: contacts.slice(0, 80),
    topListened: topCounts(
      listens,
      (e) => e.contentTitle || e.contentId || 'sem-titulo',
      12,
    ),
    topRead: topCounts(
      reads,
      (e) => e.contentTitle || e.contentId || 'sem-titulo',
      12,
    ),
    topScreens: topCounts(screens, (e) => e.path || '—', 12),
    topSources: topCounts(
      recent,
      (e) => e.attribution?.source || 'desconhecido',
      12,
    ),
    cities,
    recentEvents: recent
      .slice(-40)
      .reverse()
      .map((e) => ({
        name: e.name,
        title: e.contentTitle || e.path || '',
        displayName: e.displayName || null,
        whatsapp: e.whatsapp || null,
        whatsappLink: formatWhatsapp(e.whatsapp),
        city: e.geo?.city || '—',
        source: e.attribution?.source || '—',
        at: e.occurredAt,
      })),
  };
}

function backfillUsersFromEvents() {
  const users = readUsers();
  if (Object.keys(users).length > 0) return;
  const events = readEvents();
  for (const event of events) {
    if (event.userId && (event.displayName || event.whatsapp)) {
      upsertUserProfile(event);
    }
  }
}

const adminHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Painel · Palavra Viva</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root {
      --bg: #121A21;
      --elev: #1A2430;
      --soft: #222E3A;
      --border: #2C3A48;
      --text: #F2F5F7;
      --muted: #8A97A5;
      --accent: #3DDC97;
      --sos: #F07167;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(1200px 500px at 10% -10%, rgba(61,220,151,.12), transparent), var(--bg);
      color: var(--text);
    }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      position: sticky; top: 0; background: rgba(18,26,33,.92); backdrop-filter: blur(8px); z-index: 5;
    }
    h1 { margin: 0; font-size: 1.25rem; }
    h1 span { color: var(--accent); }
    .wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .login {
      max-width: 420px; margin: 80px auto; background: var(--elev);
      border: 1px solid var(--border); border-radius: 16px; padding: 24px;
    }
    input, button {
      width: 100%; border-radius: 10px; border: 1px solid var(--border);
      background: var(--soft); color: var(--text); padding: 12px 14px; font-size: 1rem;
    }
    button {
      background: var(--accent); color: #102018; border: none; font-weight: 700;
      cursor: pointer; margin-top: 10px;
    }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    .card {
      background: var(--elev); border: 1px solid var(--border); border-radius: 14px; padding: 16px;
    }
    .card .label { color: var(--muted); font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
    .card .value { font-size: 1.8rem; font-weight: 700; margin-top: 6px; color: var(--accent); }
    .cols { display: grid; gap: 14px; grid-template-columns: 1.2fr 1fr; margin-top: 14px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    h2 { font-size: 1rem; margin: 0 0 12px; }
    ol { margin: 0; padding-left: 18px; color: var(--muted); }
    li { margin: 6px 0; }
    li strong { color: var(--text); }
    #map { height: 340px; border-radius: 12px; border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 600; }
    .muted { color: var(--muted); }
    .pill {
      display: inline-block; padding: 2px 8px; border-radius: 999px;
      background: rgba(61,220,151,.15); color: var(--accent); font-size: .75rem;
    }
    a.wa { color: var(--accent); text-decoration: none; font-weight: 600; }
    a.wa:hover { text-decoration: underline; }
    .section-note { color: var(--muted); font-size: .85rem; margin: -4px 0 12px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const app = document.getElementById('app');
    const saved = sessionStorage.getItem('pv_admin_password') || '';

    function renderLogin(error) {
      app.innerHTML = \`
        <div class="login">
          <h1>Painel <span>Palavra Viva</span></h1>
          <p class="muted">Acesso do administrador</p>
          <input id="password" type="password" placeholder="Senha do painel" value="\${saved}" />
          \${error ? \`<p style="color:var(--sos)">\${error}</p>\` : ''}
          <button id="enter">Entrar</button>
        </div>\`;
      document.getElementById('enter').onclick = () => {
        const password = document.getElementById('password').value.trim();
        sessionStorage.setItem('pv_admin_password', password);
        load(password);
      };
    }

    function rowList(items) {
      if (!items?.length) return '<p class="muted">Sem dados ainda.</p>';
      return '<ol>' + items.map((i) =>
        \`<li><strong>\${i.key}</strong> · \${i.count}</li>\`
      ).join('') + '</ol>';
    }

    function renderDashboard(data, password) {
      app.innerHTML = \`
        <header>
          <h1>Painel <span>Palavra Viva</span></h1>
          <div class="muted">Atualizado \${new Date(data.generatedAt).toLocaleString('pt-BR')} ·
            <button style="width:auto;margin:0;padding:8px 12px" id="refresh">Atualizar</button>
          </div>
        </header>
        <div class="wrap">
          <div class="grid">
            <div class="card"><div class="label">Online agora</div><div class="value">\${data.totals.onlineNow}</div></div>
            <div class="card"><div class="label">Cadastros</div><div class="value">\${data.totals.contacts || 0}</div></div>
            <div class="card"><div class="label">Com WhatsApp</div><div class="value">\${data.totals.withWhatsapp || 0}</div></div>
            <div class="card"><div class="label">Acessos 24h</div><div class="value">\${data.totals.opens24h}</div></div>
            <div class="card"><div class="label">Áudios 7 dias</div><div class="value">\${data.totals.listens7d}</div></div>
            <div class="card"><div class="label">Leituras 7 dias</div><div class="value">\${data.totals.reads7d}</div></div>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>📇 Contatos (nome e WhatsApp)</h2>
            <p class="section-note">Cadastros do onboarding — nome e WhatsApp ficam salvos aqui para contato.</p>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>Cidade</th>
                  <th>Origem</th>
                  <th>Cadastro</th>
                  <th>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                \${(data.contacts || []).length ? data.contacts.map(u => \`
                  <tr>
                    <td><strong>\${u.displayName || '—'}</strong></td>
                    <td>\${u.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${u.whatsappLink}" target="_blank" rel="noopener">\${u.whatsapp}</a>\`
                      : (u.whatsapp || '—')}</td>
                    <td>\${u.city}</td>
                    <td><span class="pill">\${u.source}</span></td>
                    <td>\${u.firstSeenAt ? new Date(u.firstSeenAt).toLocaleString('pt-BR') : '—'}</td>
                    <td>\${u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('pt-BR') : '—'}</td>
                  </tr>\`).join('') : '<tr><td colspan="6" class="muted">Nenhum cadastro com nome/WhatsApp ainda. Peça para alguém concluir o onboarding no app.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="cols">
            <div class="card">
              <h2>📍 Onde estão (cidades)</h2>
              <div id="map"></div>
              <div style="margin-top:12px">\${rowList(data.cities)}</div>
            </div>
            <div class="card">
              <h2>↗ Origem do tráfego</h2>
              \${rowList(data.topSources)}
              <h2 style="margin-top:20px">📱 Telas mais abertas</h2>
              \${rowList(data.topScreens)}
            </div>
          </div>

          <div class="cols">
            <div class="card">
              <h2>🎧 Mais ouvidos</h2>
              \${rowList(data.topListened)}
            </div>
            <div class="card">
              <h2>📖 Mais lidos</h2>
              \${rowList(data.topRead)}
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>🟢 Online agora</h2>
            <table>
              <thead><tr><th>Nome</th><th>WhatsApp</th><th>Cidade</th><th>Origem</th><th>Visto</th></tr></thead>
              <tbody>
                \${data.online.length ? data.online.map(o => \`
                  <tr>
                    <td>\${o.displayName || o.userId || o.sessionId || '—'}</td>
                    <td>\${o.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${o.whatsappLink}" target="_blank" rel="noopener">\${o.whatsapp}</a>\`
                      : (o.whatsapp || '—')}</td>
                    <td>\${o.city}</td>
                    <td><span class="pill">\${o.source}</span></td>
                    <td>\${new Date(o.at).toLocaleTimeString('pt-BR')}</td>
                  </tr>\`).join('') : '<tr><td colspan="5" class="muted">Ninguém online neste momento.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>Eventos recentes</h2>
            <table>
              <thead><tr><th>Evento</th><th>Nome</th><th>WhatsApp</th><th>Conteúdo</th><th>Cidade</th><th>Origem</th><th>Quando</th></tr></thead>
              <tbody>
                \${data.recentEvents.map(e => \`
                  <tr>
                    <td>\${e.name}</td>
                    <td>\${e.displayName || '—'}</td>
                    <td>\${e.whatsappLink
                      ? \`<a class="wa" href="https://wa.me/\${e.whatsappLink}" target="_blank" rel="noopener">\${e.whatsapp}</a>\`
                      : (e.whatsapp || '—')}</td>
                    <td>\${e.title || '—'}</td>
                    <td>\${e.city}</td>
                    <td>\${e.source}</td>
                    <td>\${new Date(e.at).toLocaleString('pt-BR')}</td>
                  </tr>\`).join('')}
              </tbody>
            </table>
          </div>
        </div>\`;

      document.getElementById('refresh').onclick = () => load(password);

      const map = L.map('map').setView([-14.235, -51.9253], 3);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const points = data.cities.filter(c => c.lat != null && c.lon != null);
      points.forEach((c) => {
        L.circleMarker([c.lat, c.lon], {
          radius: Math.min(18, 6 + c.count),
          color: '#3DDC97',
          fillColor: '#3DDC97',
          fillOpacity: 0.55,
          weight: 2,
        }).addTo(map).bindPopup(\`<strong>\${c.key}</strong><br>\${c.count} eventos\`);
      });
      if (points.length) {
        map.fitBounds(points.map(c => [c.lat, c.lon]), { padding: [30, 30], maxZoom: 5 });
      }
    }

    async function load(password) {
      try {
        const res = await fetch('/api/stats', {
          headers: { 'x-admin-password': password }
        });
        if (res.status === 401) {
          renderLogin('Senha incorreta');
          return;
        }
        const data = await res.json();
        renderDashboard(data, password);
      } catch (e) {
        renderLogin('Não foi possível conectar ao servidor de analytics.');
      }
    }

    if (saved) load(saved);
    else renderLogin();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin')) {
    send(res, 200, adminHtml, 'text/html');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    try {
      const body = await readBody(req);
      const geo = await lookupGeo(clientIp(req));
      const events = readEvents();
      events.push({
        id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: body.name || 'unknown',
        path: body.path || null,
        contentId: body.contentId || null,
        contentTitle: body.contentTitle || null,
        contentKind: body.contentKind || null,
        userId: body.userId || null,
        displayName: body.displayName || null,
        whatsapp: body.whatsapp || null,
        sessionId: body.sessionId || null,
        platform: body.platform || null,
        attribution: body.attribution || {
          source: 'desconhecido',
          medium: '',
          campaign: '',
          referrer: '',
        },
        geo,
        meta: body.meta || null,
        occurredAt: body.occurredAt || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      });
      const saved = events[events.length - 1];
      writeEvents(events);
      if (saved.userId) {
        upsertUserProfile(saved);
      }
      send(res, 201, { ok: true });
    } catch (error) {
      send(res, 400, { ok: false, error: String(error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/stats') {
    if (!isAuthorized(req, url)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }
    send(res, 200, buildStats(readEvents()));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true, events: readEvents().length });
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
