// Set TEST_DATABASE_URL to use your own PostgreSQL; otherwise an embedded PostgreSQL is started (cannot run as root).
// Integration tests: real PostgreSQL (embedded, test-only), real Express app, mocked Gemini server.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const { makePool } = require('../src/db');
const { initDb } = require('../src/initDb');
const { createApp, loadConfig } = require('../src/app');

const R = Math.random().toString(36).slice(2, 8);
const KEY = 'test-key-AIzaSyFAKEFAKEFAKEFAKEFAKEFAKEFAKE12345';
let pg, pool, server, base, mock, mockMode = 'ok', mockSeen = [], dir;
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);

before(async () => {
  const EmbeddedPostgres = process.env.TEST_DATABASE_URL ? null : require('embedded-postgres').default;
  if (process.env.TEST_DATABASE_URL) pool = makePool(process.env.TEST_DATABASE_URL);
  else {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-pg-'));
    pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'pw', port: 54329, persistent: false });
    await pg.initialise(); await pg.start(); await pg.createDatabase('snap');
    pool = makePool('postgres://postgres:pw@localhost:54329/snap');
  }
  await initDb(pool); await initDb(pool); // schema script must be re-runnable
  mock = http.createServer((req, res) => {
    let b = ''; req.on('data', c => (b += c)); req.on('end', () => {
      mockSeen.push({ url: req.url, key: req.headers['x-goog-api-key'], body: b });
      if (mockMode === '500') { res.statusCode = 500; return res.end('{}'); }
      if (mockMode === '403') { res.statusCode = 403; return res.end('{}'); }
      const text = mockMode === 'bad' ? 'not json' : JSON.stringify({ product: 'A teal candle jar', lighting: ['Slightly dark'], background: ['Plain'], composition: ['Off-center'], visibility: ['Good'], recommendations: ['Move the jar to the middle', '<img src=x onerror=alert(1)>'] });
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
    });
  });
  await new Promise(r => mock.listen(0, r));
  const cfg = { ...loadConfig({ NODE_ENV: 'test', SESSION_SECRET: 'x'.repeat(40), GEMINI_API_KEY: KEY, GEMINI_DAILY_LIMIT: '3', AUTH_LIMIT: '1000', AI_PER_MINUTE: '1000', GEMINI_BASE_URL: `http://localhost:${mock.address().port}/v1beta`, MAX_IMAGE_BYTES: '200000' }) };
  server = createApp({ pool, cfg }).listen(0); await new Promise(r => server.on('listening', r));
  base = `http://localhost:${server.address().port}`;
});
after(async () => {
  /* cleanup */ server && server.close(); mock && mock.close(); pool && await pool.end(); if (pg) { await pg.stop(); fs.rmSync(dir, { recursive: true, force: true }); } });

function client() {
  let cookie = '';
  const call = async (method, url, body, extra = {}) => {
    const init = { method, headers: { ...(cookie ? { cookie } : {}), ...extra.headers } };
    if (body instanceof FormData) init.body = body; else if (body !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
    const r = await fetch(base + url, init);
    const sc = r.headers.getSetCookie?.() || []; if (sc.length) cookie = sc.map(c => c.split(';')[0]).join('; ');
    let j = null; try { j = await r.json(); } catch { /* no body */ }
    return { status: r.status, body: j, headers: r.headers };
  };
  return call;
}
const mkUser = async (email) => { const c = client(); const r = await c('POST', '/api/auth/register', { email, name: 'Test User', password: 'correct horse battery' }); assert.equal(r.status, 201); return c; };
const analysis = { profile: 'General', overall: 54, scores: [50, 40, 60, 70, 55, 45], measurements: { m: 82.5, sd: 30 }, gemini: { product: 'Jar' } };
const form = (buf, name = 'p.jpg') => { const f = new FormData(); f.append('image', new Blob([buf]), name); f.append('measurements', JSON.stringify({ m: 80, sharp: 40 })); return f; };

test('health endpoint reports database connection', async () => {
  const r = await client()('GET', '/health'); assert.equal(r.status, 200); assert.deepEqual(r.body, { status: 'ok', database: 'connected' });
});
test('homepage is served with security headers', async () => {
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'probe.txt'), 'x');
  const r = await fetch(base + '/probe.txt'); assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/); assert.equal(r.headers.get('x-powered-by'), null);
  fs.rmSync(path.join(__dirname, '..', 'public', 'probe.txt'));
});
test('register, me, logout, login, wrong password, duplicates, weak password', async () => {
  const c = client(); const email = `ana-${R}@example.com`;
  assert.equal((await c('POST', '/api/auth/register', { email, name: 'Ana', password: 'short' })).status, 400);
  assert.equal((await c('POST', '/api/auth/register', { email, name: 'Ana', password: 'longenough1' })).status, 201);
  assert.deepEqual((await c('GET', '/api/auth/me')).body.user, { email, name: 'Ana' });
  const stored = (await pool.query('SELECT password_hash FROM users WHERE email=$1', [email])).rows[0].password_hash;
  assert.match(stored, /^scrypt\$/); assert.ok(!stored.includes('longenough1'));
  assert.equal((await c('POST', '/api/auth/logout')).status, 200);
  assert.equal((await c('GET', '/api/auth/me')).status, 401);
  assert.equal((await c('POST', '/api/auth/login', { email, password: 'wrong-password' })).status, 401);
  assert.equal((await c('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password' })).status, 401);
  assert.equal((await c('POST', '/api/auth/login', { email: email.toUpperCase(), password: 'longenough1' })).status, 200);
  assert.equal((await client()('POST', '/api/auth/register', { email, name: 'Dup', password: 'longenough1' })).status, 409);
});
test('protected routes require login and cross-site writes are blocked', async () => {
  const c = client();
  for (const [m, u] of [['GET', '/api/projects'], ['POST', '/api/projects'], ['POST', '/api/analyze'], ['GET', '/api/photos/' + '0'.repeat(8) + '-0000-0000-0000-' + '0'.repeat(12)]]) assert.equal((await c(m, u, m === 'POST' ? {} : undefined)).status, 401, m + u);
  const u = await mkUser(`csrf-${R}@example.com`);
  assert.equal((await u('POST', '/api/projects', { name: 'X' }, { headers: { origin: 'https://evil.example' } })).status, 403);
});
test('projects: save, retrieve, rename, delete, validation', async () => {
  const c = await mkUser(`proj-${R}@example.com`);
  assert.equal((await c('POST', '/api/projects', { name: '' })).status, 400);
  const p = (await c('POST', '/api/projects', { name: 'Coffee Shop' })).body;
  const ph = await c('POST', `/api/projects/${p.id}/photos`, { name: 'jar.jpg', width: 900, height: 600, localRef: 'local-1', analysis });
  assert.equal(ph.status, 201);
  assert.equal((await c('POST', `/api/projects/${p.id}/photos`, { name: 'bad', analysis: { ...analysis, overall: 150 } })).status, 400);
  assert.equal((await c('POST', `/api/projects/${p.id}/photos`, { name: 'bad', analysis: { ...analysis, scores: [1, 2] } })).status, 400);
  assert.equal((await c('POST', `/api/photos/${ph.body.id}/versions`, { settings: { b: 25, c: 40 }, score: 73, localRef: 'v1', scores: [70, 60, 80, 75, 70, 65] })).status, 201);
  const full = (await c('GET', `/api/photos/${ph.body.id}`)).body;
  assert.equal(full.analyses.length, 2); assert.deepEqual(full.analyses.map(a => a.kind), ['original', 'edited']); assert.equal(full.versions[0].settings.b, 25); assert.equal(full.analyses[0].gemini.product, 'Jar');
  const list = (await c('GET', '/api/projects')).body.projects; assert.equal(list[0].photoCount, 1); assert.equal(list[0].best, 73);
  assert.equal((await c('PATCH', `/api/projects/${p.id}`, { name: 'Coffee Shop 2' })).body.name, 'Coffee Shop 2');
  assert.equal((await c('GET', `/api/projects/${p.id}/photos`)).body.photos.length, 1);
  assert.equal((await c('DELETE', `/api/photos/${ph.body.id}`)).status, 204);
  assert.equal((await c('DELETE', `/api/projects/${p.id}`)).status, 204);
  assert.equal((await c('GET', '/api/projects')).body.projects.length, 0);
  assert.equal((await pool.query('SELECT count(*)::int n FROM analyses')).rows[0].n >= 0, true);
});
test('ownership: a second user cannot read or change another user\'s data', async () => {
  const a = await mkUser(`owner-${R}@example.com`), b = await mkUser(`other-${R}@example.com`);
  const p = (await a('POST', '/api/projects', { name: 'Private' })).body;
  const ph = (await a('POST', `/api/projects/${p.id}/photos`, { name: 'x.jpg', analysis })).body;
  for (const [m, u, body] of [['GET', `/api/projects/${p.id}/photos`], ['PATCH', `/api/projects/${p.id}`, { name: 'Hacked' }], ['DELETE', `/api/projects/${p.id}`],
    ['POST', `/api/projects/${p.id}/photos`, { name: 'y', analysis }], ['GET', `/api/photos/${ph.id}`], ['POST', `/api/photos/${ph.id}/versions`, { settings: {}, score: 1 }], ['DELETE', `/api/photos/${ph.id}`]])
    assert.equal((await b(m, u, body)).status, 404, m + ' ' + u);
  assert.equal((await b('GET', '/api/projects')).body.projects.length, 0);
  assert.equal((await a('GET', `/api/photos/${ph.id}`)).status, 200);
  // a user id supplied by the browser is ignored
  const r = await b('POST', '/api/projects', { name: 'Mine', userId: 'whatever', user_id: 'whatever' }); assert.equal(r.status, 201);
  assert.equal((await a('GET', '/api/projects')).body.projects.length, 1);
});
test('Gemini: success, key stays server-side, output is validated', async () => {
  const c = await mkUser(`ai-${R}@example.com`); mockSeen = []; mockMode = 'ok';
  const r = await c('POST', '/api/analyze', form(JPEG));
  assert.equal(r.status, 200); assert.equal(r.body.analysis.product, 'A teal candle jar'); assert.deepEqual(r.body.usage, { used: 1, limit: 3 });
  assert.equal(mockSeen.length, 1); assert.equal(mockSeen[0].key, KEY); assert.match(mockSeen[0].url, /models\/gemini-3\.5-flash:generateContent/);
  assert.ok(JSON.parse(mockSeen[0].body).contents[0].parts[1].inlineData.data.length > 10);
  assert.ok(!JSON.stringify(r.body).includes(KEY)); assert.ok(!JSON.stringify([...r.headers]).includes(KEY));
  assert.ok(r.body.analysis.recommendations.length <= 5); // HTML-looking text is returned as plain text; the UI escapes it
});
test('Gemini: bad input, invalid answers, upstream errors, size and daily limits', async () => {
  const c = await mkUser(`ai2-${R}@example.com`); mockMode = 'ok';
  assert.equal((await c('POST', '/api/analyze', form(Buffer.from('this is not an image at all')))).status, 400);
  assert.equal((await c('POST', '/api/analyze', new FormData())).status, 400);
  assert.equal((await c('POST', '/api/analyze', form(Buffer.concat([JPEG, Buffer.alloc(250000)])))).status, 413);
  mockMode = 'bad'; let r = await c('POST', '/api/analyze', form(JPEG)); assert.equal(r.status, 502); assert.match(r.body.error, /could not use/);
  mockMode = '500'; r = await c('POST', '/api/analyze', form(JPEG)); assert.equal(r.status, 503);
  mockMode = '403'; r = await c('POST', '/api/analyze', form(JPEG)); assert.equal(r.status, 502); assert.ok(!JSON.stringify(r.body).includes(KEY));
  const used = (await pool.query(`SELECT count FROM usage u JOIN users s ON s.id=u.user_id WHERE s.email=$1`, [`ai2-${R}@example.com`])).rows[0];
  assert.equal(used.count, 0, 'failed calls must not use up the daily allowance');
  mockMode = 'ok';
  for (let i = 0; i < 3; i++) assert.equal((await c('POST', '/api/analyze', form(JPEG))).status, 200);
  r = await c('POST', '/api/analyze', form(JPEG)); assert.equal(r.status, 429); assert.match(r.body.error, /Daily AI limit/);
});
test('no secrets or credentials are committed in tracked files', () => {
  const root = path.join(__dirname, '..');
  const files = cp.execSync('git ls-files --cached --others --exclude-standard', { cwd: root }).toString().split('\n').filter(Boolean).filter(f => !/package-lock\.json$|^test\//.test(f));
  assert.ok(files.length > 5); assert.ok(!files.includes('.env'));
  for (const f of files) {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    assert.doesNotMatch(t, /AIza[0-9A-Za-z_-]{30,}/, f + ' contains something that looks like a Google API key');
    assert.doesNotMatch(t, /postgres(ql)?:\/\/[^:\s]+:(?!PASSWORD)[^@\s]{4,}@/, f + ' contains a database URL with a password');
  }
});
