const { Pool } = require('pg');
function makePool(url) {
  if (!url) throw new Error('DATABASE_URL is not set');
  // Render external URLs need TLS; internal URLs do not.
  const ssl = process.env.PGSSL === 'disable' ? false : /\.render\.com/.test(url) ? { rejectUnauthorized: false } : false;
  return new Pool({ connectionString: url, ssl, max: 8, connectionTimeoutMillis: 8000 });
}
module.exports = { makePool };
