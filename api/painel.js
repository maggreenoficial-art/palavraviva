const runApi = require('../server/vercel-api-run.cjs');

module.exports = async function handler(req, res) {
  return runApi(req, res, '/admin');
};

module.exports.config = require('../server/vercel-api-run.cjs').config;
