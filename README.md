# SnapScore AI

Product photo analyzer for small online sellers. Plain HTML/CSS/JS frontend (`public/`), Node.js + Express backend (`src/`), PostgreSQL for data, Google Gemini for AI observations.

## What runs where (read this first)
| Thing | Where it lives |
|---|---|
| Photo analysis scores (brightness, sharpness, framing...) | Computed **in the browser**. Simple image measurements, not a trained model. |
| Photos (originals and edited versions) | **Only in the browser** that saved them (IndexedDB). They do **not** sync between devices. |
| Accounts, projects, photo names, scores, edit settings, Gemini notes | **PostgreSQL** (available from any device after login; the photo files are not). |
| Gemini AI Insights | Only when the user clicks the button and agrees: a resized copy of the photo goes through **your server** to Google. Needs login. Limited per user per day. |
| Free "3 photo analyses per day" and the Premium switch | **Browser-only demo**. Not enforced by the server and not real payment. |

## Run locally
1. Install Node.js 20+ and PostgreSQL (or use a free Render database).
2. `cp .env.example .env`, then fill in `DATABASE_URL`, `SESSION_SECRET`, `GEMINI_API_KEY`.
3. `npm install`
4. Load the variables and create tables: `export $(grep -v '^#' .env | xargs) && npm run db:init`
5. `npm start` and open http://localhost:3000

## Tests
`TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/DBNAME npm test`
(Without `TEST_DATABASE_URL` the tests start a temporary embedded PostgreSQL, which cannot run as root.) Gemini is mocked, so tests never need your key.

## Put the code on GitHub
```bash
git init && git add . && git commit -m "SnapScore AI"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/snapscore-ai.git   # create an empty private repo first
git push -u origin main
```
Run `git status` first: `.env` must not be listed (it is in `.gitignore`).

## Deploy on Render
1. Get a Gemini key at https://aistudio.google.com/ . Check https://ai.google.dev/gemini-api/docs/models for current model names and set `GEMINI_MODEL` if the default (`gemini-3.5-flash`) is not offered.
2. Render dashboard > **New > Blueprint** > pick your GitHub repo. It reads `render.yaml` and creates the web service and the PostgreSQL database, and wires `DATABASE_URL` and a random `SESSION_SECRET`.
3. When asked, paste `GEMINI_API_KEY` (never put it in the repo).
4. After the first deploy open `https://YOUR-SERVICE.onrender.com/health`. It should show `{"status":"ok","database":"connected"}`.
Manual alternative: create a PostgreSQL database and a Node web service (build `npm ci`, start `npm run db:init && npm start`, health check `/health`) and set `NODE_ENV=production`, `DATABASE_URL` (Internal Database URL), `SESSION_SECRET`, `GEMINI_API_KEY`.
Free-tier limits change, so check Render's current terms. Historically free web services sleep after idle time (slow first load) and free databases expire after a period.

## Security notes
Passwords are hashed with scrypt; sessions are server-side in PostgreSQL with HttpOnly, SameSite cookies (Secure in production); every project and photo query is scoped to the logged-in user; inputs are validated; SQL is parameterized; the API key exists only in server environment variables. This is a school-project baseline, **not** an audited or production-certified system: there is no email verification, password reset, or account deletion yet.

## Maintaining
`npm run db:init` is safe to re-run (it only creates missing tables). Rotate `GEMINI_API_KEY` in the Render dashboard if it ever leaks. Change `GEMINI_DAILY_LIMIT` to control AI usage per user.
