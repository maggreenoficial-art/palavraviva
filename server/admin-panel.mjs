/** HTML do painel admin em produção — /admin */
export function adminPanelHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Painel · Palavra Viva</title>
  <style>
    :root {
      --bg: #0f1419;
      --elev: #1a2430;
      --soft: #222e3a;
      --border: #2c3a48;
      --text: #f2f5f7;
      --muted: #8a97a5;
      --accent: #3ddc97;
      --warn: #f07167;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(900px 400px at 0 -10%, rgba(61,220,151,.1), transparent), var(--bg);
      color: var(--text);
    }
    header {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
      padding: 18px 22px; border-bottom: 1px solid var(--border);
      position: sticky; top: 0; background: rgba(15,20,25,.94); backdrop-filter: blur(8px); z-index: 5;
    }
    h1 { margin: 0; font-size: 1.2rem; }
    h1 span { color: var(--accent); }
    .wrap { padding: 20px; max-width: 1200px; margin: 0 auto; }
    .login {
      max-width: 400px; margin: 72px auto; background: var(--elev);
      border: 1px solid var(--border); border-radius: 16px; padding: 24px;
    }
    input, button {
      width: 100%; border-radius: 10px; border: 1px solid var(--border);
      background: var(--soft); color: var(--text); padding: 12px 14px; font-size: 1rem;
    }
    button {
      background: var(--accent); color: #102018; border: none; font-weight: 700; cursor: pointer; margin-top: 10px;
    }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .card {
      background: var(--elev); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px;
    }
    .card .label { color: var(--muted); font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
    .card .value { font-size: 1.7rem; font-weight: 700; margin-top: 6px; color: var(--accent); }
    .cols { display: grid; gap: 14px; grid-template-columns: 1fr 1fr; margin-top: 14px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    h2 { font-size: .95rem; margin: 0 0 10px; }
    .muted { color: var(--muted); font-size: .85rem; }
    table { width: 100%; border-collapse: collapse; font-size: .86rem; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    .pill {
      display: inline-block; padding: 2px 8px; border-radius: 999px;
      background: rgba(61,220,151,.15); color: var(--accent); font-size: .72rem;
    }
    a.wa { color: var(--accent); text-decoration: none; }
    ol { margin: 0; padding-left: 18px; color: var(--muted); }
    li { margin: 5px 0; }
    li strong { color: var(--text); }
    .badge-live { color: var(--accent); font-size: .8rem; }
    .btn-sm { width: auto; margin: 0; padding: 8px 14px; font-size: .85rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const app = document.getElementById('app');
    const saved = sessionStorage.getItem('pv_admin_password') || '';

    function renderLogin(error) {
      app.innerHTML = \`
        <div class="login">
          <h1>Painel <span>Palavra Viva</span></h1>
          <p class="muted">Conectado ao site em produção</p>
          <input id="password" type="password" placeholder="Senha do painel" value="\${saved}" />
          \${error ? '<p style="color:var(--warn)">' + error + '</p>' : ''}
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
      return '<ol>' + items.map(i => '<li><strong>' + i.key + '</strong> · ' + i.count + '</li>').join('') + '</ol>';
    }

    function renderDashboard(data, password) {
      app.innerHTML = \`
        <header>
          <h1>Painel <span>Palavra Viva</span> <span class="badge-live">● ao vivo</span></h1>
          <div class="muted">Atualizado \${new Date(data.generatedAt).toLocaleString('pt-BR')}
            · <button class="btn-sm" id="refresh">Atualizar</button></div>
        </header>
        <div class="wrap">
          <div class="grid">
            <div class="card"><div class="label">Online agora</div><div class="value">\${data.totals.onlineNow}</div></div>
            <div class="card"><div class="label">Assinaturas ativas</div><div class="value">\${data.totals.activeSubscriptions}</div></div>
            <div class="card"><div class="label">Fotos pagas</div><div class="value">\${data.totals.paidFotoJesus}</div></div>
            <div class="card"><div class="label">Fotos entregues</div><div class="value">\${data.totals.fotoSuccess}</div></div>
            <div class="card"><div class="label">Receita estimada</div><div class="value" style="font-size:1.2rem">\${data.totals.revenuePaidLabel}</div></div>
            <div class="card"><div class="label">Acessos 24h</div><div class="value">\${data.totals.opens24h}</div></div>
            <div class="card"><div class="label">Visitantes 7d</div><div class="value">\${data.totals.uniqueUsers7d}</div></div>
          </div>

          <div class="cols">
            <div class="card">
              <h2>🟢 Online agora</h2>
              <table>
                <thead><tr><th>Quem</th><th>Cidade</th><th>Origem</th><th>Onde</th></tr></thead>
                <tbody>
                  \${data.online.length ? data.online.map(o => '<tr><td>' + (o.displayName || o.userId || o.sessionId || '—') + '</td><td>' + o.city + '</td><td><span class="pill">' + o.source + '</span></td><td class="muted">' + (o.path || '—') + '</td></tr>').join('') : '<tr><td colspan="4" class="muted">Ninguém online nos últimos 2 min.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="card">
              <h2>📊 Funil (7 dias)</h2>
              \${rowList(data.funnel)}
              <h2 style="margin-top:16px">📱 Telas mais vistas</h2>
              \${rowList(data.topScreens)}
            </div>
          </div>

          <div class="cols">
            <div class="card">
              <h2>🌍 Cidades (7 dias)</h2>
              \${rowList(data.cities)}
            </div>
            <div class="card">
              <h2>📣 Origem do tráfego</h2>
              \${rowList(data.topSources)}
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>💳 Pagamentos confirmados</h2>
            <table>
              <thead><tr><th>Quando</th><th>Produto</th><th>Nome</th><th>Método</th></tr></thead>
              <tbody>
                \${data.payments.length ? data.payments.map(p => '<tr><td>' + new Date(p.paidAt).toLocaleString('pt-BR') + '</td><td>' + p.product + '</td><td>' + (p.displayName || p.userId || '—') + '</td><td>' + p.method + '</td></tr>').join('') : '<tr><td colspan="4" class="muted">Nenhum pagamento ainda.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>🖼️ Foto com Jesus</h2>
            <table>
              <thead><tr><th>Quando</th><th>Status</th><th>Pago</th><th>Resultado</th></tr></thead>
              <tbody>
                \${data.fotoJesus.length ? data.fotoJesus.map(f => '<tr><td>' + new Date(f.createdAt).toLocaleString('pt-BR') + '</td><td>' + f.status + '</td><td>' + (f.paid ? 'sim' : 'não') + '</td><td>' + (f.resultUrl ? '<a class="wa" href="' + f.resultUrl + '" target="_blank" rel="noopener">ver</a>' : '—') + '</td></tr>').join('') : '<tr><td colspan="4" class="muted">Nenhuma geração ainda.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="card" style="margin-top:14px">
            <h2>⚡ Eventos recentes</h2>
            <table>
              <thead><tr><th>Evento</th><th>Detalhe</th><th>Cidade</th><th>Origem</th><th>Quando</th></tr></thead>
              <tbody>
                \${data.recentEvents.map(e => '<tr><td>' + e.name + '</td><td>' + (e.title || '—') + '</td><td>' + e.city + '</td><td>' + e.source + '</td><td>' + new Date(e.at).toLocaleString('pt-BR') + '</td></tr>').join('')}
              </tbody>
            </table>
          </div>
        </div>\`;

      document.getElementById('refresh').onclick = () => load(password);
    }

    let refreshTimer = null;

    async function load(password) {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { 'x-admin-password': password },
        });
        if (res.status === 401) {
          renderLogin('Senha incorreta.');
          return;
        }
        const data = await res.json();
        if (!data?.totals) throw new Error('Resposta inválida');
        renderDashboard(data, password);
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => load(password), 12_000);
      } catch (err) {
        renderLogin('Não foi possível carregar: ' + (err.message || 'erro'));
      }
    }

    if (saved) load(saved);
    else renderLogin();
  </script>
</body>
</html>`;
}
