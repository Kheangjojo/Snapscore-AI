const fs = require('fs'), path = require('path');
const { makePool } = require('./db');
async function initDb(pool) {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}
module.exports = { initDb };
if (require.main === module) {
  const pool = makePool(process.env.DATABASE_URL);
  initDb(pool).then(() => { console.log('Database schema is ready.'); return pool.end(); })
    .catch(e => { console.error('Database init failed:', e.message); process.exit(1); });
}
