# AI Prompts — Documentation

## Entry 1

**Prompt:** Based on `spec.md` and `requirements-analysis.md`, draft the Validation, Error Handling, Testing, and Documentation sections in `acceptance-criteria.md` as checkable items. Do not change the Core section.

**AI Response Summary:** Drafted checkable acceptance criteria from spec and requirements: 18 Validation items (create/update/status/comment rules, permissions, remarks, terminal states, query-param validation), 8 Error Handling items (JSON error shape, HTTP status mapping, empty-search behavior, frontend error display), 10 Testing items (Jest + Supertest, valid/invalid transitions, role/remarks cases, per-feature coverage, unit tests for pure helpers, `test-results.md`), and 9 Documentation items (lifecycle artifact checklist). Left Core section unchanged. Synced `tool-specific/cursor-workflow/acceptance-criteria.md` to match.

**Accepted:**
- Core section unchanged (11 existing items)
- Validation: 18 checkable items with expected HTTP status codes where applicable
- Error Handling: 8 items covering standard response shape and status conventions
- Testing: 10 items including mandatory state-machine integration tier and `test-results.md`
- Documentation: 9 items covering all required lifecycle markdown artifacts
- Mirror file `tool-specific/cursor-workflow/acceptance-criteria.md` kept in sync

## Entry 2

**Prompt:** `/document database/setup-notes.md — real commands to create DB, run schema, seed, start server, and verify data persists after restart. I will test by following the steps myself.`

**AI Response Summary:** Read the current implementation (`migrate.js`, `seed.js`, `index.js`, `db.js`, `testDb.js`, `001_initial_schema.sql`, `seed.sql`, `.env.example`, `src/backend/package.json`) and filled `database/setup-notes.md` with real setup/run steps. Corrected the template's misleading "file-based" Postgres note — the app uses a PostgreSQL server via `DATABASE_URL`. Documented: prerequisites, env setup (`cp .env.example .env`), manual `psql` database creation, `npm install` / `npm run migrate` / `npm run seed` / `npm start` from `src/backend/`, `curl` health check, persistence verification via `psql` before and after stopping/restarting the server, plus reset instructions, test DB notes (`npm test -- --runInBand`), and an "Uncertainties" section (credentials, `psql` auth, non-idempotent migrations, no ticket API routes yet).

**Accepted:**
- `database/setup-notes.md` fully populated (replaced empty placeholder sections)
- Database choice corrected to PostgreSQL client/server (not file-based)
- Prerequisites: Node.js, running Postgres, `psql` on PATH
- Env vars table for `PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`
- Step-by-step setup: create DB → install deps → migrate → seed → start
- Schema/seed sections pointing at real files and npm scripts
- "Steps to Run Locally" end-to-end command block
- "Verifying Persistence" flow: query → stop server → restart → re-query (3 users, 5 tickets)
- "Resetting the database" drop/recreate + migrate + seed commands
- "Running tests" section with `--runInBand` note
- "Uncertainties / things to adjust locally" caveats

**Changed:**

**Rejected:**

**Why:**


