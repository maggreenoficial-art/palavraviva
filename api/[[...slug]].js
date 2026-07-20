/**
 * Catch-all da API de pagamentos no Vercel.
 * Expõe as mesmas rotas do server/payments-server.mjs em https://seu-dominio/api/*
 */
module.exports = async function handler(req, res) {
  try {
    const { handlePaymentsRequest } = await import('../server/payments-server.mjs');
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
