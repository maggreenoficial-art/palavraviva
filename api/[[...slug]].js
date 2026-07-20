/**
 * Rotas /api de 1 segmento: /api/health, /api/checkout, /api/access, etc.
 * Rotas aninhadas ficam em arquivos explícitos (ex.: api/foto-jesus/prepare.js).
 */
const runApi = require('../server/vercel-api-run.cjs');

module.exports = async function handler(req, res) {
  return runApi(req, res);
};

module.exports.config = require('../server/vercel-api-run.cjs').config;
