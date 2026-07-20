const runApi = require('../../server/vercel-api-run.cjs');

module.exports = async function handler(req, res) {
  return runApi(req, res, '/api/access/grant');
};

module.exports.config = require('../../server/vercel-api-run.cjs').config;
