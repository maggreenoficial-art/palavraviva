const runApi = require('../../server/vercel-api-run.cjs');

module.exports = async function handler(req, res) {
  return runApi(req, res, '/api/foto-jesus/status');
};

module.exports.config = require('../../server/vercel-api-run.cjs').config;
