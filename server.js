const { createApp, loadConfig } = require('./src/app');
const { makePool } = require('./src/db');
const cfg = loadConfig();
if (cfg.prod && (!cfg.sessionSecret || cfg.sessionSecret.length < 32)) {
  console.error('SESSION_SECRET must be set to a 32+ character secret in production.'); process.exit(1);
}
const pool = makePool(cfg.databaseUrl);
const app = createApp({ pool, cfg });
const server = app.listen(cfg.port, '0.0.0.0', () => console.log(`SnapScore AI listening on port ${cfg.port} (${cfg.prod ? 'production' : 'development'}); Gemini ${cfg.geminiKey ? 'configured' : 'NOT configured'}`));
const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', stop); process.on('SIGINT', stop);
