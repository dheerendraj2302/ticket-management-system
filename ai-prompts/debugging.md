# AI Prompts — Debugging

_Log real sessions as you go — don't reconstruct from memory at the end. Add one entry block per meaningful prompt/response exchange._

## Entry 1

**Prompt:** `/debug` after completing Phase 2 tasks (`tool-specific/cursor-workflow/tasks.md`), the test suite was mostly failing with two recurring errors: (1) `duplicate key value violates unique constraint "pg_database_datname_index"`, and (2) `database "ticket_management_system_test" does not exist` (surfacing at line 22 of `tests/db.test.js`). Final run before the fix: 6 suites failed / 1 passed, 22 tests failed / 32 passed of 54 total. Asked for root-cause diagnosis before any code change, plus a way to verify the fix.

**AI Response Summary:** Diagnosed both errors as one root cause: Jest runs test suites in parallel workers by default, but all 7 suites share a single test database (`ticket_management_system_test`) and each independently creates it in `beforeAll` (`setupTestDb`) and drops it in `afterAll` (`teardownTestDb`). Error 1 is a check-then-create (TOCTOU) race in `createTestDatabase()` (`src/backend/testDb.js` lines 58–67): concurrent workers all `SELECT` (see "not present") then all `CREATE DATABASE`, so losers hit the `pg_database` unique index. Error 2 is `dropTestDatabase()` (`src/backend/testDb.js` lines 75–87) terminating other backends and dropping the shared DB while another suite is still querying it, so its next query fails. Concluded it was not a Phase 2 endpoint logic bug. Applied the minimal fix: added `"maxWorkers": 1` to the Jest config in `src/backend/package.json` so suites run serially (no create race, no drop-under-another-suite), while each suite still gets a clean DB. Considered but did not choose swallowing the duplicate-key error or per-worker unique DB names, since the one-line serialization fixes both errors at their shared source. Provided verification steps: `cd "src/backend" && npm test` (expect 7 suites passing, no `pg_database_datname_index` / `does not exist` errors), and contrasting `npx jest --maxWorkers=2` (still fails) vs. the serial default (passes).

**Accepted:** The `"maxWorkers": 1` addition to the `jest` config in `src/backend/package.json` landed unchanged.

**Changed:**

**Rejected:**

**Why:**

## Entry 2

**Prompt:** `/debug` — assignee name not visible in the UI and not present in the `/api/tickets` network response (sample response showed only `assignedTo`, no `assigneeName`). API endpoint: `/api/tickets`.

**AI Response Summary:** Hypothesized root cause before any code change: the on-disk code was correct (backend tests asserting `assigneeName: 'Bob Agent'` passed 50/50), but the live backend was serving stale code. Terminal showed `npm start` running `node index.js` with no file watching — the Node process loaded modules at startup before the `JOIN users assignee` / `assigneeName` changes landed. Pointed to `repositories/tickets.js` (`TICKET_SELECT_BASE` with assignee join) and `mapTicketRow` in `utils/tickets.js` as the correct logic the running process had not picked up. Minimal fix: restart the backend server (no code change required). Provided verification: `curl http://localhost:4000/api/tickets` should return `assigneeName`; hard-refresh browser to confirm Assignee column populated; run `npm test -- --runInBand --forceExit tests/tickets.test.js` to confirm code correctness independently of the running server.

**Accepted:** Diagnosis that stale `npm start` process was the cause; verification steps (curl, browser refresh, test run).

**Changed:**

**Rejected:** Treating as a code bug or re-implementing the assignee join — code and tests were already correct.

**Why:** Integration tests passed with `assigneeName` against the updated repository code; only the long-running `node index.js` process was out of date.

## Entry 3

**Prompt:** `/debug` — browser console on base page: `Uncaught SyntaxError: The requested module '.../src/shared/stateMachine.js' does not provide an export named 'canTransition'`. Follow-up: `let's keep the validations separately for now`.

**AI Response Summary:** Root cause: `src/shared/stateMachine.js` is CommonJS (`module.exports`); frontend imported `{ canTransition }` via Vite `@shared` alias. Vite does not CJS-interop first-party source, so no named ESM exports at runtime. Default-import attempt also failed on production build. Fix: standalone ESM `src/frontend/src/utils/stateMachine.js` mirroring backend rules; backend/shared module unchanged. `npm run build` in frontend passed.

**Accepted:** Separate frontend ESM state machine; no `@shared` import from frontend.

**Changed:**

**Rejected:** Shared-module unification via ESM conversion or Vite `commonjsOptions` — user chose separate validations.

**Why:** Explicit user direction after diagnosis; backend remains authoritative for enforcement.

