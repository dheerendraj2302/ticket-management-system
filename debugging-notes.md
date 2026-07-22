# Debugging Notes

_Document real issues you actually hit. Add one "## Issue N" block per issue._

## Issue 1

### Problem

Browser console on the base page: `Uncaught SyntaxError: The requested module '.../src/shared/stateMachine.js' does not provide an export named 'canTransition'`. Page failed to load frontend state-machine helpers used by `StatusActions.jsx`.

### How I Investigated

Checked `src/shared/stateMachine.js` — exports via `module.exports` (CommonJS). Frontend `src/frontend/src/utils/stateMachine.js` was importing named exports from `@shared/stateMachine.js` (Vite alias to `src/shared`). Frontend package is `"type": "module"`; Vite serves first-party files as ESM without the CJS interop it applies to `node_modules`.

### How AI Helped

Diagnosed CJS/ESM mismatch before changing code. Tried default import from shared module; `npm run build` still failed (`"default" is not exported`). Implemented standalone ESM copy in `src/frontend/src/utils/stateMachine.js` per decision to keep validations separate.

### What I Validated

- `cd src/frontend && npm run build` — exits 0.
- Backend unchanged (`src/backend/utils/stateMachine.js` still re-exports shared CJS module).
- Review docs updated to note finding 8 no longer uses `@shared` for frontend.

### Final Fix

Replaced frontend `@shared` re-export with a self-contained ESM `src/frontend/src/utils/stateMachine.js` that mirrors backend transition rules. Backend/shared module left as CommonJS. Default-import from shared module was also tried; production build still failed (`"default" is not exported`). Shared-module unification via ESM conversion or Vite `commonjsOptions` was rejected per explicit decision to keep frontend validations separate.

## Issue 2

### Problem

After Phase 2 tasks, `npm test` failed across most suites with two recurring errors: `duplicate key value violates unique constraint "pg_database_datname_index"` and `database "ticket_management_system_test" does not exist` (e.g. at `tests/db.test.js` line 22). Last failing run: 6 suites failed / 1 passed, 22 tests failed / 32 passed (54 total).

### How I Investigated

Traced both errors to `src/backend/testDb.js`: every suite calls `setupTestDb()` in `beforeAll` (create DB) and `teardownTestDb()` in `afterAll` (drop DB) against the same `ticket_management_system_test` name. Jest runs suites in parallel workers by default, so workers race on `CREATE DATABASE` (check-then-create TOCTOU → duplicate key) and one worker can drop the DB while another is still querying it (`does not exist`). Confirmed this was not a Phase 2 endpoint logic bug.

### How AI Helped

Diagnosed single root cause (parallel workers + shared test DB lifecycle) before changing application code. Compared minimal fixes: serialize suites vs. swallow duplicate-key vs. per-worker unique DB names. Recommended `"maxWorkers": 1` in Jest config as the smallest fix for both error patterns.

### What I Validated

- `cd src/backend && npm test` — 7 suites pass; no `pg_database_datname_index` or missing-database errors.
- `npx jest --maxWorkers=2` — still fails (confirms parallel execution was the trigger).
- Serial default (`maxWorkers: 1`) — passes; each suite still gets a clean DB via existing setup/teardown.

### Final Fix

Added `"maxWorkers": 1` to the `jest` block in `src/backend/package.json`. No changes to `testDb.js` or Phase 2 endpoint code.

## Issue 3

### Problem

Assignee name was missing in the UI and absent from `GET /api/tickets` JSON (response had `assignedTo` but no `assigneeName`).

### How I Investigated

Checked repository code: `TICKET_SELECT_BASE` in `src/repositories/tickets.js` joins `users` for assignee name; `mapTicketRow` in `utils/tickets.js` maps `assignee_name` → `assigneeName`. Integration tests asserting `assigneeName: 'Bob Agent'` were already passing (50/50 at time of debug). Terminal showed `npm start` running `node index.js` with no file watcher — process had loaded modules before the join/`assigneeName` changes landed.

### How AI Helped

Ruled out a code bug before editing. Pointed to stale long-running backend process as the cause and gave verification steps: `curl` against live API, browser hard-refresh, and isolated test run against current code.

### What I Validated

- `curl http://localhost:4000/api/tickets` — returns `assigneeName` after backend restart.
- Browser hard-refresh — Assignee column populated in ticket list.
- `npm test -- --runInBand --forceExit tests/tickets.test.js` — passes independently of running server.

### Final Fix

Restarted the backend server (`Ctrl+C` then `npm start` in `src/backend/`). No code change required.

