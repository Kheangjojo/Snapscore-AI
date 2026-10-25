const path = require('path');
const express = require('express'), helmet = require('helmet'), session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit'), multer = require('multer');
const V = require('./validate');
const { hashPassword, verifyPassword } = require('./auth');
const { analyzeWithGemini } = require('./gemini');

function loadConfig(env = process.env) {
  return {
    prod: env.NODE_ENV === 'production',
    port: +env.PORT || 3000,
    databaseUrl: env.DATABASE_URL,
    sessionSecret: env.SESSION_SECRET,
    geminiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || 'gemini-3.5-flash',
    geminiBase: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    geminiDaily: +env.GEMINI_DAILY_LIMIT || 10,
    geminiTimeout: +env.GEMINI_TIMEOUT_MS || 25000,
    maxImageBytes: +env.MAX_IMAGE_BYTES || 4 * 1024 * 1024,
    authLimit: +env.AUTH_LIMIT || 30,
    aiPerMinute: +env.AI_PER_MINUTE || 6
  };
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpErr = (status, message) => Object.assign(new Error(message), { status, expose: true });
const sniff = (b) => b.length > 12 && (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'image/jpeg'
  : b.slice(0, 4).toString('hex') === '89504e47' ? 'image/png'
  : b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' ? 'image/webp' : null);

function createApp({ pool, cfg, gemini = analyzeWithGemini }) {
  if (!cfg.sessionSecret || cfg.sessionSecret.length < 16) throw new Error('SESSION_SECRET must be set (16+ characters)');
  const app = express();
  app.disable('x-powered-by');
  if (cfg.prod) app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ['https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"],
    objectSrc: ["'none'"], frameAncestors: ["'none'"], ...(cfg.prod ? {} : { upgradeInsecureRequests: null })
  } } }));
  app.use(express.json({ limit: '64kb' }));
  app.use(session({
    name: 'snapscore.sid', secret: cfg.sessionSecret, resave: false, saveUninitialized: false,
    store: new PgStore({ pool, tableName: 'session' }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: cfg.prod, maxAge: 14 * 864e5 }
  }));
  // CSRF defence: reject cross-site browser requests that change data.
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const o = req.headers.origin;
    if (o) { try { if (new URL(o).host !== req.headers.host) return res.status(403).json({ error: 'Cross-site request blocked' }); } catch { return res.status(403).json({ error: 'Bad origin' }); } }
    next();
  });
  const needAuth = (req, res, next) => (req.session.uid ? next() : res.status(401).json({ error: 'Please log in.' }));
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: cfg.authLimit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
  const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: cfg.aiPerMinute, standardHeaders: true, legacyHeaders: false, message: { error: 'Slow down: too many AI requests this minute.' } });
  const q = (text, params) => pool.query(text, params);

  app.get('/health', async (req, res) => {
    try { await q('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
    catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
  });

  /* ---------- auth ---------- */
  const startSession = (req, uid) => new Promise((ok, no) => req.session.regenerate(e => {
    if (e) return no(e); req.session.uid = uid; req.session.save(e2 => (e2 ? no(e2) : ok()));
  }));
  app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
    const email = V.email(req.body.email), name = V.str(req.body.name, 'name', 1, 60), pw = req.body.password;
    if (typeof pw !== 'string' || pw.length < 8 || pw.length > 200) throw new V.Bad('Password must be 8-200 characters');
    const r = await q('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id,email,name', [email, name, await hashPassword(pw)]);
    if (!r.rowCount) throw httpErr(409, 'An account with this email already exists');
    await startSession(req, r.rows[0].id);
    res.status(201).json({ user: { email, name } });
  }));
  app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
    const email = V.email(req.body.email), pw = req.body.password;
    if (typeof pw !== 'string' || !pw || pw.length > 200) throw httpErr(401, 'Wrong email or password');
    const u = (await q('SELECT id,email,name,password_hash FROM users WHERE email=$1', [email])).rows[0];
    const ok = await verifyPassword(pw, u && u.password_hash);
    if (!u || !ok) throw httpErr(401, 'Wrong email or password');
    await startSession(req, u.id);
    res.json({ user: { email: u.email, name: u.name } });
  }));
  app.post('/api/auth/logout', (req, res) => req.session.destroy(() => { res.clearCookie('snapscore.sid'); res.json({ ok: true }); }));
  app.get('/api/auth/me', wrap(async (req, res) => {
    if (!req.session.uid) throw httpErr(401, 'Not logged in');
    const u = (await q('SELECT email,name FROM users WHERE id=$1', [req.session.uid])).rows[0];
    if (!u) throw httpErr(401, 'Not logged in');
    res.json({ user: u });
  }));

  /* ---------- projects ---------- */
  const ownProject = async (id, uid) => (await q('SELECT id,name FROM projects WHERE id=$1 AND user_id=$2', [V.uuid(id), uid])).rows[0];
  const ownPhoto = async (id, uid) => (await q('SELECT ph.*,p.id AS pid FROM photos ph JOIN projects p ON p.id=ph.project_id WHERE ph.id=$1 AND p.user_id=$2', [V.uuid(id), uid])).rows[0];
  const touch = (pid) => q('UPDATE projects SET updated_at=now() WHERE id=$1', [pid]);
  const notFound = () => httpErr(404, 'Not found');

  app.get('/api/projects', needAuth, wrap(async (req, res) => {
    const r = await q(`SELECT p.id,p.name,p.created_at,p.updated_at,count(DISTINCT ph.id)::int AS photo_count,max(a.overall) AS best
      FROM projects p LEFT JOIN photos ph ON ph.project_id=p.id LEFT JOIN analyses a ON a.photo_id=ph.id
      WHERE p.user_id=$1 GROUP BY p.id ORDER BY p.updated_at DESC`, [req.session.uid]);
    res.json({ projects: r.rows.map(p => ({ id: p.id, name: p.name, photoCount: p.photo_count, best: p.best, createdAt: p.created_at, updatedAt: p.updated_at })) });
  }));
  app.post('/api/projects', needAuth, wrap(async (req, res) => {
    const name = V.str(req.body.name, 'name', 1, 60);
    if ((await q('SELECT count(*)::int AS n FROM projects WHERE user_id=$1', [req.session.uid])).rows[0].n >= 50) throw httpErr(409, 'Project limit reached (50)');
    const r = await q('INSERT INTO projects(user_id,name) VALUES($1,$2) RETURNING id,name', [req.session.uid, name]);
    res.status(201).json(r.rows[0]);
  }));
  app.patch('/api/projects/:id', needAuth, wrap(async (req, res) => {
    const name = V.str(req.body.name, 'name', 1, 60);
    const r = await q('UPDATE projects SET name=$1,updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id,name', [name, V.uuid(req.params.id), req.session.uid]);
    if (!r.rowCount) throw notFound();
    res.json(r.rows[0]);
  }));
  app.delete('/api/projects/:id', needAuth, wrap(async (req, res) => {
    const r = await q('DELETE FROM projects WHERE id=$1 AND user_id=$2', [V.uuid(req.params.id), req.session.uid]);
    if (!r.rowCount) throw notFound();
    res.status(204).end();
  }));
  app.get('/api/projects/:id/photos', needAuth, wrap(async (req, res) => {
    if (!(await ownProject(req.params.id, req.session.uid))) throw notFound();
    const r = await q(`SELECT ph.id,ph.name,ph.width,ph.height,ph.local_ref,ph.created_at,
      (SELECT overall FROM analyses a WHERE a.photo_id=ph.id ORDER BY created_at DESC LIMIT 1) AS latest
      FROM photos ph WHERE ph.project_id=$1 ORDER BY ph.created_at DESC`, [req.params.id]);
    res.json({ photos: r.rows });
  }));
  const analysisIn = (a) => {
    a = V.obj(a, 'analysis');
    return { profile: a.profile == null ? null : V.str(a.profile, 'profile', 1, 30), overall: V.int(a.overall, 'overall', 0, 100), scores: V.scores(a.scores),
      measurements: V.obj(a.measurements, 'measurements', true), gemini: V.obj(a.gemini, 'gemini', true, 12000) };
  };
  const addAnalysis = (photoId, kind, a) => q('INSERT INTO analyses(photo_id,kind,profile,overall,scores,measurements,gemini) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [photoId, kind, a.profile, a.overall, JSON.stringify(a.scores), a.measurements && JSON.stringify(a.measurements), a.gemini && JSON.stringify(a.gemini)]);
  app.post('/api/projects/:id/photos', needAuth, wrap(async (req, res) => {
    const p = await ownProject(req.params.id, req.session.uid); if (!p) throw notFound();
    const b = V.obj(req.body, 'body'), name = V.str(b.name, 'name', 1, 120), w = V.int(b.width, 'width', 1, 20000, true), h = V.int(b.height, 'height', 1, 20000, true);
    const ref = b.localRef == null ? null : V.str(b.localRef, 'localRef', 1, 100), a = analysisIn(b.analysis);
    const ph = (await q('INSERT INTO photos(project_id,name,width,height,local_ref) VALUES($1,$2,$3,$4,$5) RETURNING id', [p.id, name, w, h, ref])).rows[0];
    await addAnalysis(ph.id, 'original', a); await touch(p.id);
    res.status(201).json({ id: ph.id });
  }));
  app.get('/api/photos/:id', needAuth, wrap(async (req, res) => {
    const ph = await ownPhoto(req.params.id, req.session.uid); if (!ph) throw notFound();
    const an = await q('SELECT id,kind,profile,overall,scores,measurements,gemini,created_at FROM analyses WHERE photo_id=$1 ORDER BY created_at', [ph.id]);
    const ve = await q('SELECT id,settings,score,local_ref,created_at FROM versions WHERE photo_id=$1 ORDER BY created_at', [ph.id]);
    res.json({ photo: { id: ph.id, name: ph.name, width: ph.width, height: ph.height, localRef: ph.local_ref, projectId: ph.pid }, analyses: an.rows, versions: ve.rows });
  }));
  app.post('/api/photos/:id/versions', needAuth, wrap(async (req, res) => {
    const ph = await ownPhoto(req.params.id, req.session.uid); if (!ph) throw notFound();
    const b = V.obj(req.body, 'body'), settings = V.obj(b.settings, 'settings'), score = V.int(b.score, 'score', 0, 100);
    const ref = b.localRef == null ? null : V.str(b.localRef, 'localRef', 1, 100);
    const v = (await q('INSERT INTO versions(photo_id,settings,score,local_ref) VALUES($1,$2,$3,$4) RETURNING id', [ph.id, JSON.stringify(settings), score, ref])).rows[0];
    if (b.scores !== undefined) await addAnalysis(ph.id, 'edited', { profile: b.profile == null ? null : V.str(b.profile, 'profile', 1, 30), overall: score, scores: V.scores(b.scores), measurements: null, gemini: null });
    await touch(ph.pid);
    res.status(201).json({ id: v.id });
  }));
  app.delete('/api/photos/:id', needAuth, wrap(async (req, res) => {
    const ph = await ownPhoto(req.params.id, req.session.uid); if (!ph) throw notFound();
    await q('DELETE FROM photos WHERE id=$1', [ph.id]); await touch(ph.pid);
    res.status(204).end();
  }));

  /* ---------- Gemini ---------- */
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.maxImageBytes, files: 1, fields: 4, fieldSize: 8 * 1024 } });
  app.post('/api/analyze', needAuth, aiLimiter, upload.single('image'), wrap(async (req, res) => {
    if (!cfg.geminiKey) throw httpErr(503, 'AI Insights are not configured on this server.');
    if (!req.file) throw new V.Bad('Attach a photo in the "image" field');
    const mime = sniff(req.file.buffer);
    if (!mime) throw new V.Bad('Only JPEG, PNG or WebP photos are supported');
    let m = {}; try { m = JSON.parse(req.body.measurements || '{}'); } catch { /* ignore bad measurements */ }
    const used = await q(`INSERT INTO usage(user_id,day,kind,count) VALUES($1,CURRENT_DATE,'gemini',1)
      ON CONFLICT (user_id,day,kind) DO UPDATE SET count=usage.count+1 WHERE usage.count<$2 RETURNING count`, [req.session.uid, cfg.geminiDaily]);
    if (!used.rowCount) throw httpErr(429, `Daily AI limit reached (${cfg.geminiDaily}). Try again tomorrow.`);
    try {
      const analysis = await gemini({ cfg, image: req.file.buffer, mime, measurements: m });
      res.json({ analysis, usage: { used: used.rows[0].count, limit: cfg.geminiDaily } });
    } catch (e) {
      await q(`UPDATE usage SET count=GREATEST(count-1,0) WHERE user_id=$1 AND day=CURRENT_DATE AND kind='gemini'`, [req.session.uid]);
      console.error('Gemini failure:', e.name === 'AbortError' ? 'timeout' : e.upstream ? 'status ' + e.upstream : e.name);
      if (e.name === 'AbortError') throw httpErr(504, 'Gemini took too long. Please try again.');
      if (e.upstream === 429 || e.upstream >= 500) throw httpErr(503, 'Gemini is busy right now. Please try again soon.');
      if (e.upstream) throw httpErr(502, 'Gemini rejected the request. The server API key or model name may need attention.');
      throw httpErr(502, 'Gemini returned an answer we could not use. Please try again.');
    }
  }));

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Image is too large (max ${Math.round(cfg.maxImageBytes / 1048576)} MB)` });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.expose || (err.status && err.status < 500)) return res.status(err.status).json({ error: err.message });
    console.error('Unhandled error:', err.code || err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
module.exports = { createApp, loadConfig };
