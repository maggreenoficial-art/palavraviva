/**
 * Runner compartilhado das rotas /api no Vercel (sem Next.js).
 */
module.exports = async function runApi(req, res, forcedPathname) {
  try {
    if (forcedPathname) {
      const raw = String(req.url || '');
      const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
      req.url = `${forcedPathname}${query}`;
    }

    const { handlePaymentsRequest } = await import('./payments-server.mjs');
    await handlePaymentsRequest(req, res);
  } catch (error) {
    console.error('[api]', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(
        JSON.stringify({
          ok: false,
          error: String(error?.message || error || 'erro_interno'),
        }),
      );
    }
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};
