# AI Prompts — Implementation

## Entry 1

**Prompt:** `/implement Task 1.1: Initialize backend in src/backend/ — package.json, Express entry point, dotenv loading from repo-root .env (PORT and DATABASE_URL). Add GET /health returning { "status": "ok" }. Done when npm start listens on PORT from env. No database or ticket routes yet.`

**AI Response Summary:** Created `src/backend/package.json` (Express + dotenv, `npm start` → `node index.js`) and `src/backend/index.js` (loads repo-root `.env` via `path.resolve(__dirname, '../../.env')`, validates `PORT` and `DATABASE_URL` at startup, `GET /health` → `{ "status": "ok" }`, 404 JSON handler for unknown routes). Ran `npm install` (generated `package-lock.json`). Started the server and verified behavior; noted that `.env` had `PORT=5432` (PostgreSQL default) conflicting with a running Postgres instance, and that tests on `PORT=4000` succeeded (`/health` → 200 + `{"status":"ok"}`, unknown route → 404).

**Accepted:** All proposed files landed unchanged: `src/backend/package.json` (pinned `express@4.21.2`, `dotenv@16.4.7`), `src/backend/index.js` (dotenv from repo root, env validation, `/health` route, 404 handler, `app.listen` on `PORT`), and `src/backend/package-lock.json` from `npm install`.

## Entry 2

**Prompt:** `/implement Task 1.2: Postgres connection module in src/backend/ plus test DB helper — connect/disconnect/reset using DATABASE_URL from .env. Use a separate test database file for tests. No ticket routes yet.`

**AI Response Summary:** Added/validated `src/backend/db.js` (`connect`, `disconnect`, `reset`, `query` via `pg` Pool using `DATABASE_URL`), `src/backend/testDb.js` (separate test DB helper: derives `TEST_DATABASE_URL` or `{db}_test`, create/drop via admin connection to `postgres`, `setupTestDb`/`teardownTestDb`/`resetTestDb`), and `tests/db.test.js` (3 integration tests). Added `pg@8.13.1` to backend dependencies. Fixed Jest config in `src/backend/package.json` because `npm test` found 0 tests on Windows (repo-root `tests/` not discovered / `dotenv` not resolved). Ran `npm install` and `npm test` — 3/3 passed. No ticket routes or server wiring added.

**Accepted:** `src/backend/db.js` (Pool singleton, `getDatabaseUrl`, `connect`/`disconnect`/`reset`/`query`/`getPool`), `src/backend/testDb.js` (separate test DB file with create/drop/setup/teardown helpers), `tests/db.test.js` (connect query, reset drops tables, setup/teardown recreates clean test DB), `pg@8.13.1` in `src/backend/package.json` dependencies.

**Changed:** Jest config in `src/backend/package.json` — replaced `testMatch: "<rootDir>/../../tests/**/*.test.js"` with explicit `roots: ["<rootDir>/../../tests"]`, `moduleDirectories` including `<rootDir>/node_modules`, and `testMatch: ["**/*.test.js"]` so tests run on Windows.

## Entry 3

**Prompt:** `/implement Task 1.3: Schema init script in database/schema-or-migrations/ — users, tickets (with updatedBy), comments tables. Enum constraints for role, priority, status per spec.md. Wire a script to run migrations from the backend.`

**AI Response Summary:** Created `database/schema-or-migrations/001_initial_schema.sql` with PostgreSQL enum types (`user_role`, `ticket_priority`, `ticket_status`) and tables `users`, `tickets` (including `updated_by` FK to `users`), and `comments`, plus indexes on `comments.ticket_id`, `tickets.status`, and `tickets.priority`. Added `src/backend/migrate.js` to apply sorted `.sql` files from the migrations directory, wired as `npm run migrate` in `src/backend/package.json`. Updated `testDb.setupTestDb()` to run migrations after reset. Added `tests/schema.test.js` (5 tests) covering migration file discovery, table creation, enum values, `updated_by`/FKs, and enum rejection at the DB layer. Ran `npm run migrate` successfully against the main DB and `npm test -- --runInBand` — 8/8 passed. Noted that parallel Jest suites can race on test DB create/drop, so serial execution with `--runInBand` is recommended.

**Accepted:** `database/schema-or-migrations/001_initial_schema.sql` (enum types and tables per `spec.md`/`design-notes.md`, snake_case columns, `updated_by` on tickets), `src/backend/migrate.js` (`getMigrationFiles`, `runMigrations`, CLI entrypoint with dotenv from repo root), `npm run migrate` script in `src/backend/package.json`, `testDb.js` change to call `runMigrations()` after `resetTestDb()` in `setupTestDb()`, and `tests/schema.test.js` (all 5 schema integration tests).

**Changed:** Added `require('dotenv').config(...)` to `migrate.js` after the first `npm run migrate` run failed with `Missing required environment variable: DATABASE_URL` (dotenv was not loaded in the initial version).

## Entry 4

**Prompt:** `/implement Task 1.4: Seed script in database/seed-data/ — at least 3 users (customer, agent, admin), tickets in each status, sample comments. Runnable from npm script.`

**AI Response Summary:** Created `database/seed-data/seed.sql` with `TRUNCATE ... RESTART IDENTITY CASCADE` followed by inserts for 3 users (Alice Customer/customer, Bob Agent/agent, Carol Admin/admin), 5 tickets (one per status: Open, In Progress, Resolved, Closed, Cancelled), and 5 sample comments linked to those tickets. Added `src/backend/seed.js` mirroring the migrate runner pattern (`getSeedFiles`, `runSeed`, CLI with dotenv from repo root), wired as `npm run seed` in `src/backend/package.json`. Added `tests/seed.test.js` (5 integration tests) covering seed file discovery, all three roles, all five statuses, comment linkage, and safe re-run. Ran `npm test -- --runInBand` — 13/13 passed — and `npm run seed` against the main DB successfully.

**Accepted:** `database/seed-data/seed.sql` (3 users, 5 tickets across all statuses, 5 comments, truncate-for-idempotency), `src/backend/seed.js` (`getSeedFiles`, `runSeed`, CLI entrypoint with dotenv), `npm run seed` in `src/backend/package.json`, and `tests/seed.test.js` (all 5 seed integration tests).

**Changed:**

**Rejected:**

**Why:**


## Entry 5

**Prompt:** `/implement Task 2.1: GET /api/users — return all seeded users (id, name, email, role). Add one Supertest case.` Followed by: separate controller from router; remove unnecessary template literal for static queries; return proper status code for readability; validate query parameters wherever necessary; keep in mind for future API development and add to the relevant dev rules file if necessary.

**AI Response Summary:** Implemented `GET /api/users` returning all seeded users (`id`, `name`, `email`, `role`) ordered by `id`. Extracted `createApp()` into `src/backend/app.js` (mounts `/health`, `/api/users`, 404 and 500 handlers). Updated `src/backend/index.js` to connect to Postgres on startup, then listen. Added `tests/users.test.js` with one Supertest case asserting `200` and all three seeded roles. Added `supertest@7.0.0` as a dev dependency. After the follow-up refactor: moved handler logic to `src/backend/controllers/users.js`, left `src/backend/routes/users.js` as route wiring only, replaced template-literal SQL with a plain string, used `res.status(200).json(...)`, noted no query/body params on `GET /api/users` so no validation was added there, and created `.cursor/rules/backend-api-conventions.mdc` for future API work. Ran `npm test -- --runInBand` — 14/14 passed.

**Accepted:** `src/backend/app.js` (`createApp` factory), `src/backend/index.js` (async DB connect + listen), `src/backend/controllers/users.js` (`listUsers` handler), `src/backend/routes/users.js` (wires `GET /` to controller), `tests/users.test.js` (Supertest case for all three seeded users/roles), `supertest@7.0.0` in `src/backend/package.json` devDependencies, `.cursor/rules/backend-api-conventions.mdc` (router/controller separation, static vs parameterized SQL, explicit status codes, input/query validation guidance).

**Changed:** `backend-api-conventions.mdc` was added in the follow-up, not in the original Task 2.1 proposal.

**Rejected:** Initial Task 2.1 `routes/users.js` implementation with handler logic, DB query, and response handling all in the router file; template-literal SQL for a static `SELECT`; and `res.json()` without an explicit status code.

**Why:** User rejected that structure and asked for router/controller separation, plain strings for static queries, explicit status codes for readability, query-parameter validation guidance for future endpoints, and a dev-rules file documenting these conventions.

## Entry 6

**Prompt:** `/implement Task 2.2: POST /api/tickets — validation, defaults (priority=Medium, status=Open), auto-populate createdBy, updatedBy, timestamps from acting user header/body per spec. Add Supertest: 201 on valid, 400 on missing fields, 400 on invalid assignedTo.`

**AI Response Summary:** Implemented `POST /api/tickets` with router/controller separation (`routes/tickets.js`, `controllers/tickets.js`) and shared helpers in `utils/tickets.js` (`mapTicketRow`, parsing/validation helpers, priority constants). Validates `title`, `description`, `assignedTo`, `actingUserId`, and optional `priority`; defaults `priority` to `Medium` and always sets `status` to `Open`; auto-populates `createdBy`/`updatedBy` from `actingUserId` with DB-managed timestamps. Returns camelCase ticket object with `201` on success, `400` for validation failures, `404` for non-existent `actingUserId` (per `spec.md`). Added `express.json()` middleware and mounted tickets router in `app.js`. Added `tests/tickets.test.js` with three Supertest cases (valid create `201`, missing fields `400`, invalid `assignedTo` `400`). Hit a Supertest/superagent `mime.getType` compatibility issue on POST `.send({})`; fixed by adding `tests/helpers/http.js` (`postJson` helper using explicit `Content-Type` + `JSON.stringify`) and bumping `supertest` to `7.1.3`. Reordered validation so missing `title` is reported before other required-field errors. Ran `npm test -- --runInBand --forceExit` — 17/17 passed.

**Accepted:** `src/backend/controllers/tickets.js` (`createTicket` handler), `src/backend/routes/tickets.js` (wires `POST /` to controller), `src/backend/utils/tickets.js` (row mapping + validation helpers), `src/backend/app.js` (`express.json()` + `/api/tickets` mount), `tests/tickets.test.js` (3 Supertest cases), `tests/helpers/http.js` (`postJson` helper), `supertest@7.1.3` in `src/backend/package.json` devDependencies.

## Entry 7

**Prompt:** `/implement 2.3: GET /api/tickets — list all tickets, no filters yet. Add Supertest returning 200 with seeded tickets.` Followed by code review: move validation out of the controller; reduce user-existence DB queries (e.g. `SELECT id FROM users WHERE id IN ($1, $2)`); extract SQL into named constants instead of inline `await db.query(\`INSERT...\`)`; create a repository layer; don't hardcode status; document standards for future API development.

**AI Response Summary:** Implemented `GET /api/tickets` via `listTickets` in the tickets controller (query all tickets ordered by `id`, camelCase via `mapTicketRow`, `200` response). Wired `GET /` in `routes/tickets.js`. Added a separate `describe('GET /api/tickets')` in `tests/tickets.test.js` with one Supertest case (`200`, 5 seeded tickets, titles/statuses, key fields on first ticket). After review, refactored tickets/users backend into layered structure: `validators/tickets.js` (`validateCreateTicket`), `repositories/tickets.js` and `repositories/users.js` (named SQL constants `INSERT_TICKET`, `LIST_TICKETS`, `LIST_USERS`; `findExistingUserIds` batch lookup), slim controllers that orchestrate only; `DEFAULT_STATUS`/`VALID_STATUSES` in `utils/tickets.js` (no hardcoded `'Open'` in SQL); users controller moved to repository. Updated `.cursor/rules/backend-api-conventions.mdc` with routes → controllers → validators → repositories → utils layering, SQL-as-constants, batched lookups, enum constants. Ran `npm test -- --runInBand --forceExit` — 18/18 passed.

**Accepted:** `listTickets` handler and `GET /` route; GET Supertest case in `tests/tickets.test.js`; post-review: `src/backend/validators/tickets.js`, `src/backend/repositories/tickets.js`, `src/backend/repositories/users.js`, refactored `controllers/tickets.js` and `controllers/users.js`, `DEFAULT_STATUS`/`VALID_STATUSES` in `utils/tickets.js`, updated `.cursor/rules/backend-api-conventions.mdc`.

**Changed:** After Task 2.3, review refactor moved create/list logic out of controllers into validators and repositories; `listTickets` and `listUsers` now call repositories instead of inline `db.query`; `INSERT_TICKET` takes status as `$4` parameter; user existence checked in one `IN` query via `findExistingUserIds`; priority error message now derived from `VALID_PRIORITIES` (`"priority must be one of: Low, Medium, High"`).

**Rejected:** Pre-refactor `controllers/tickets.js` with inline validation in `createTicket`; separate `userExists()` calls per user id (two DB round-trips for `actingUserId` and `assignedTo`); inline SQL in `db.query(\`INSERT...\`)` without named constants; no repository layer (controllers calling `db` directly); hardcoded `'Open'` in the INSERT statement.

**Why:** User review asked for validation outside controllers, fewer DB queries via batched user lookup, extracted SQL constants, a repository pattern, shared status constants instead of literals, and documented conventions for future endpoints.

## Entry 8

**Prompt:** `/implement Task 2.4: GET /api/tickets/:id — detail with nested comments array. 404 for missing id. Add Supertest for both cases.`

**AI Response Summary:** Implemented `GET /api/tickets/:id` following the layered pattern: `validateTicketIdParam` in `validators/tickets.js` (malformed id → `400`); `findTicketById` with `FIND_TICKET_BY_ID` in `repositories/tickets.js`; new `repositories/comments.js` with `LIST_COMMENTS_BY_TICKET_ID` and `listCommentsByTicketId`; `mapCommentRow` in `utils/comments.js`. `getTicketById` controller orchestrates validator + both repositories, returns `200` with ticket fields and nested `comments` array (camelCase), or `404` `{ error: "Ticket not found" }` when ticket missing. Wired `GET /:id` in `routes/tickets.js` after `GET /`. Added `describe('GET /api/tickets/:id')` in `tests/tickets.test.js` with two Supertest cases: ticket `1` with nested comment (`200`), id `9999` (`404`). Ran `npm test -- --runInBand --forceExit` — 20/20 passed.

**Accepted:** `getTicketById` in `src/backend/controllers/tickets.js`, `validateTicketIdParam` in `src/backend/validators/tickets.js`, `findTicketById`/`FIND_TICKET_BY_ID` in `src/backend/repositories/tickets.js`, `src/backend/repositories/comments.js`, `src/backend/utils/comments.js`, `GET /:id` route in `src/backend/routes/tickets.js`, two Supertest cases in `tests/tickets.test.js`.

## Entry 9

**Prompt:** `/implement 2.5: PATCH /api/tickets/:id — partial update/reassign, role scope checks per spec.md, reject status field with 400. Supertest: valid 200, customer editing another's ticket 403, status in body 400.`

**AI Response Summary:** Implemented `PATCH /api/tickets/:id` with partial updates for `title`, `description`, `priority`, and `assignedTo`; auto-sets `updatedBy`/`updatedAt`; returns `200` with updated ticket. Added `validateUpdateTicket` in `validators/tickets.js` (rejects `status` in body → `400`; validates optional fields; requires `actingUserId`). Added `canUpdateTicketFields` in `utils/permissions.js` (customer → tickets they created; agent → assigned tickets; admin → any; violation → `403` with message from `design-notes.md`). Added `updateTicket` in `repositories/tickets.js` (dynamic SET clause) and `findUserById` in `repositories/users.js`. `updateTicket` controller orchestrates validator, permission check, and repository. Wired `PATCH /:id` in `routes/tickets.js`. Added `patchJson` helper in `tests/helpers/http.js` and three Supertest cases in `tests/tickets.test.js`: valid update (`200`), customer PATCH on agent-created ticket (`403`), `status` in body (`400`). Ran `npm test -- --runInBand --forceExit` — 23/23 passed.

**Accepted:** `updateTicket` in `src/backend/controllers/tickets.js`, `validateUpdateTicket` in `src/backend/validators/tickets.js`, `canUpdateTicketFields` in `src/backend/utils/permissions.js`, `updateTicket`/`findUserById` in repositories, `PATCH /:id` route, `patchJson` helper, three Supertest cases in `tests/tickets.test.js`.

**Changed:**

**Rejected:**

**Why:**

## Entry 10

**Prompt:** `/implement 2.6: Pure function getAllowedNextStatuses(currentStatus) — base state machine lookup map per state-machine.mdc. Unit tests for all 5 statuses; terminal states return [].`

**AI Response Summary:** Added `src/backend/utils/stateMachine.js` with `ALLOWED_TRANSITIONS` lookup map per `.cursor/rules/state-machine.mdc` (`Open` → `In Progress`/`Cancelled`; `In Progress` → `Resolved`/`Cancelled`; `Resolved` → `Closed`; `Closed`/`Cancelled` → `[]`) and pure function `getAllowedNextStatuses(currentStatus)` returning the allowed array or `[]` for unknown status. Added `tests/stateMachine.test.js` with parameterized unit tests covering all 5 statuses plus unknown status. No HTTP wiring yet (reserved for Task 2.9). Ran `npm test -- --runInBand --forceExit` — 29/29 passed.

**Accepted:** `src/backend/utils/stateMachine.js` (`ALLOWED_TRANSITIONS`, `getAllowedNextStatuses`), `tests/stateMachine.test.js` (parameterized cases for all 5 statuses; terminal `Closed`/`Cancelled` return `[]`; unknown status returns `[]`).

**Changed:**

**Rejected:**

**Why:**

## Entry 11

**Prompt:** `/implement 2.7: Pure function canTransition({ actor, ticket, targetStatus }) — role permission rules per spec.md. Unit tests for all 5 allowed paths and at least 5 denial cases.`

**AI Response Summary:** Extended `src/backend/utils/stateMachine.js` with `ROLE_TRANSITION_RULES` and `canTransition({ actor, ticket, targetStatus })` — first checks base map via `getAllowedNextStatuses` (invalid base → `{ allowed: false, reason: "Invalid transition from X to Y" }`), then applies Layer 2 role rules (assignee for `Open → In Progress` and `In Progress → Resolved`; creator for cancel/close paths; admin bypasses role checks on valid base transitions only). Returns `{ allowed: true }` or `{ allowed: false, reason }`. Extended `tests/stateMachine.test.js` with `canTransition` tests: 5 allowed paths (correct actor per transition), 6 denial cases (4 permission denials + 2 invalid base transitions including terminal state), plus admin allowed on valid base transition. Ran `npm test -- --runInBand --forceExit` — 41/41 passed.

**Accepted:** `canTransition`, `ROLE_TRANSITION_RULES`, and `getTransitionKey` in `src/backend/utils/stateMachine.js`; `canTransition` unit tests in `tests/stateMachine.test.js` (5 allowed paths, 6 denial cases, admin valid-transition case).

**Changed:**

**Rejected:**

**Why:**

## Entry 12

**Prompt:** `/implement 2.8: Pure function requiresRemarks(targetStatus) — true for Resolved and Cancelled only. Unit tests for all 5 status values.`

**AI Response Summary:** Added `requiresRemarks(targetStatus)` to `src/backend/utils/stateMachine.js` using `STATUSES_REQUIRING_REMARKS` set (`Resolved`, `Cancelled` → `true`; all others → `false`). Added parameterized unit tests in `tests/stateMachine.test.js` covering all 5 status values. No HTTP wiring yet (reserved for Task 2.9). Ran `npm test -- --runInBand --forceExit` — 46/46 passed.

**Accepted:** `requiresRemarks` and `STATUSES_REQUIRING_REMARKS` in `src/backend/utils/stateMachine.js`; `requiresRemarks` parameterized tests in `tests/stateMachine.test.js` (all 5 statuses: `Resolved`/`Cancelled` → `true`, others → `false`).

**Changed:**

**Rejected:**

**Why:**

## Entry 13

**Prompt:** `/implement Task 2.9: PATCH /api/tickets/:id/status — enforce base + role rules, mandatory remarks persisted as Comment in same transaction. 409 invalid transition, 400 missing remarks, 403 permission denied. Add Supertest for happy path.`

**AI Response Summary:** Implemented `PATCH /api/tickets/:id/status` with `validateUpdateTicketStatus` in `validators/tickets.js` (required `status` enum, required `actingUserId`, mandatory non-empty `remarks` for `Resolved`/`Cancelled` per `design-notes.md`). Controller orchestrates `validateTicketIdParam`, loads ticket/actor, maps `canTransition` failures to `409` (invalid base transition via `isInvalidTransitionReason`) or `403` (permission denied), same-status → `409`. Added `db.withTransaction()` in `db.js`; `ticketsRepository.updateTicketStatus()` runs `UPDATE_TICKET_STATUS` + optional `insertComment` in one transaction; `INSERT_COMMENT` in `repositories/comments.js`. Wired `PATCH /:id/status` before `PATCH /:id`. Added one happy-path Supertest (`Open → In Progress` by assignee, `200`). Ran `npm test -- --runInBand --forceExit` — 47/47 passed.

**Accepted:** `updateTicketStatus` controller, `validateUpdateTicketStatus`, `db.withTransaction`, `updateTicketStatus`/`UPDATE_TICKET_STATUS` in tickets repository, `insertComment`/`INSERT_COMMENT` in comments repository, `PATCH /:id/status` route, happy-path Supertest in `tests/tickets.test.js`.

**Changed:**

**Rejected:**

**Why:**

## Entry 14

**Prompt:** `/implement 2.10: POST /api/tickets/:id/comments — standalone comment. 201 valid, 400 empty message, 404 missing ticket. Add Supertest.`

**AI Response Summary:** Implemented `POST /api/tickets/:id/comments` following the layered pattern: `validateCreateComment` in `validators/comments.js` (non-empty trimmed `message` → `400`; required `actingUserId`); `createComment` in `controllers/comments.js` orchestrating `validateTicketIdParam`, ticket lookup (`404` if missing), actor lookup (`404` if `actingUserId` not found per `spec.md`), and persistence via `createComment` in `repositories/comments.js` (reuses `INSERT_COMMENT`, standalone `db.query` path separate from transaction-scoped `insertComment`). Wired `POST /:id/comments` in `routes/tickets.js`. Added `tests/comments.test.js` with three Supertest cases: valid create (`201` with `{ id, ticketId, message, createdBy, createdAt }`), whitespace-only message (`400`), non-existent ticket (`404`). Ran `npm test -- --runInBand --forceExit` — 50/50 passed.

**Accepted:** `src/backend/validators/comments.js` (`validateCreateComment`), `src/backend/controllers/comments.js` (`createComment`), `createComment` in `src/backend/repositories/comments.js`, `POST /:id/comments` route in `src/backend/routes/tickets.js`, `tests/comments.test.js` (three Supertest cases).

**Changed:**

**Rejected:**

**Why:**

## Entry 15

**Prompt:** `/implement 2.11: GET /api/tickets?search=&status=&priority= — keyword search on title, description, comment text; status and priority filters with AND logic. Add Supertest for each search dimension.`

**AI Response Summary:** Extended `GET /api/tickets` with optional query params `search`, `status`, and `priority`. Added `validateListTicketsQuery` in `validators/tickets.js` (invalid enum → `400`; empty/whitespace `search` ignored; empty `status`/`priority` treated as no filter). Updated `listTickets` controller to validate `req.query` then call repository. Refactored `repositories/tickets.js` with `buildListTicketsQuery` — dynamic `WHERE` clauses with AND logic; case-insensitive `ILIKE` on title/description; comment text matched via `EXISTS` subquery (avoids duplicate rows from joins). Added four Supertest cases in `tests/tickets.test.js`: keyword search across title (`billing`), description (`subscription`), and comment (`csv export`); `status=Open` filter; `priority=High` filter; combined AND filter (`search=login&status=Open&priority=High`). Ran `npm test -- --runInBand --forceExit` — 54/54 passed.

**Accepted:** `validateListTicketsQuery` in `src/backend/validators/tickets.js`, `buildListTicketsQuery` and updated `listTickets` in `src/backend/repositories/tickets.js`, updated `listTickets` controller in `src/backend/controllers/tickets.js`, four Supertest cases in `tests/tickets.test.js`.

**Changed:**

**Rejected:**

**Why:**

## Entry 16

**Prompt:** `/implement 2.12: Centralized error handler — all endpoints return { error: "..." } for 4xx/5xx. No unhandled rejections. Verify existing tests still pass.`

**AI Response Summary:** Extracted centralized error handling from inline `app.js` middleware into `middleware/errorHandler.js` with `notFoundHandler` (404 `{ error: "Not found" }`), `errorHandler` (malformed JSON body → `400` `{ error: "Invalid JSON in request body" }`; `HttpError` or errors with `status` + `message` → matching 4xx/5xx; unexpected errors logged server-side → `500` `{ error: "Internal server error" }` with no stack trace to client), and `asyncHandler` to forward async route rejections to the error middleware. Added `errors/HttpError.js` for operational errors via `next(err)`. Updated `app.js` to use extracted handlers; wrapped all route handlers in `routes/tickets.js` and `routes/users.js` with `asyncHandler`. Controllers left unchanged (still return 4xx inline). Ran `npm test -- --runInBand --forceExit` — 54/54 passed.

**Accepted:** `src/backend/errors/HttpError.js`, `src/backend/middleware/errorHandler.js` (`asyncHandler`, `notFoundHandler`, `errorHandler`), updated `src/backend/app.js`, `asyncHandler` wrappers in `src/backend/routes/tickets.js` and `src/backend/routes/users.js`.

**Changed:**

**Rejected:**

**Why:**

## Entry 17

**Prompt:** `/implement 4.1: Vite + React scaffold in src/frontend/, API client module, acting-user React context populated from GET /api/users. App loads with user dropdown.`

**AI Response Summary:** Created Vite + React scaffold in `src/frontend/` (`package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/App.css`). Added `src/api/client.js` with a shared `fetch` wrapper that surfaces `{ error: "..." }` from failed responses and `getUsers()` calling `GET /api/users`. Added `ActingUserProvider` / `useActingUser` in `src/context/ActingUserContext.jsx` (loads users on mount, defaults to first user, exposes `users`, `actingUser`, `actingUserId`, `setActingUser`, `loading`, `error`). Added `ActingUserSelector` header dropdown showing `Name (role)` per seeded user. `vite.config.js` proxies `/api` to `http://localhost:4000` (no backend CORS dependency). Attempted `npm create vite@latest . -- --template react` first, but the operation was cancelled because `src/frontend/` was not empty (`README.md` present); scaffold files were written manually instead. Ran `npm install` and `npm run build` — build succeeded. User started `npm run dev` (Vite on `http://localhost:5173/`).

**Accepted:** `src/frontend/package.json` (react 18.3.1, vite 5.4.11, `@vitejs/plugin-react` 4.3.4), `vite.config.js` (dev proxy to port 4000), `index.html`, `src/main.jsx` (wraps app in `ActingUserProvider`), `src/api/client.js` (`request`, `getUsers`), `src/context/ActingUserContext.jsx`, `src/components/ActingUserSelector.jsx`, `src/App.jsx` (header with title + selector, welcome line reflecting selected user), `src/index.css`, `src/App.css`, `package-lock.json` from `npm install`.

**Changed:** Scaffold created manually file-by-file after `create-vite` cancelled on the non-empty `src/frontend/` directory, rather than via the Vite CLI template output.

**Rejected:** `npm create vite@latest . -- --template react` in `src/frontend/` (operation cancelled; directory not empty).

**Why:** `create-vite` aborted when `src/frontend/` already contained `README.md`; manual scaffold matched the required structure without removing the existing readme.

## Entry 18

**Prompt:** `/implement Task 4.2: Ticket list page — table or cards, search box, status filter, priority filter. Wire to GET /api/tickets with query params.` Followed by review: (1) status badges same width with center-aligned text, (2) return assignee name from the API instead of client-side lookup in `TicketList.jsx` — update docs and relevant tests, (3) create frontend util functions for utilities that may be shared later.

**AI Response Summary:** Implemented `TicketList.jsx` with a table, debounced search, status/priority filter dropdowns, and `getTickets()` in `api/client.js` wired to `GET /api/tickets`. Added `StatusBadge.jsx`, `useDebounce` hook, and ticket constants. After review: updated status badge CSS (`min-width: 6.5rem`, `text-align: center`); extended backend list/detail read queries with `JOIN users assignee` and `assigneeName` in `mapTicketRow` (`repositories/tickets.js`, `utils/tickets.js`); updated `tests/tickets.test.js` and `tool-specific/cursor-workflow/spec.md`; removed client-side assignee lookup from `TicketList.jsx`; extracted `formatDate` to `src/frontend/src/utils/format.js`. Ran `npm run build` (frontend) and `npm test -- --runInBand --forceExit tests/tickets.test.js` (50/50 passed).

**Accepted:** `src/frontend/src/components/TicketList.jsx` (table, filters, debounced search, uses `ticket.assigneeName`), `StatusBadge.jsx`, `getTickets()` in `api/client.js`, `hooks/useDebounce.js`, `constants/tickets.js`, `utils/format.js`, badge CSS, backend JOIN + `assigneeName` on list/detail reads, test and `spec.md` updates.

**Changed:** Status badge styling updated post-review for uniform width and centered text; assignee display switched from `useActingUser().users.find(...)` to API-provided `assigneeName`; `formatDate` moved out of `TicketList.jsx` into shared util; backend read queries refactored to join `users` for assignee name.

**Rejected:** Client-side assignee name resolution via `getAssigneeName(assigneeId)` and `useActingUser().users` in `TicketList.jsx`; variable-width status badges without center alignment.

**Why:** User review asked for consistent badge layout, server-sourced assignee names (with docs/tests kept in sync), and reusable frontend utilities instead of inline helpers and client-side user lookups.

## Entry 19

**Prompt:** `/implement 4.3: Create ticket form — title, description, priority (default Medium), assignee dropdown. Show server validation errors inline on submit.` Followed by issues/requirement changes: (1) FE validations on blur, shown below input fields; (2) API validation errors and success messages in a toaster instead of above the form; (3) RU — only customer and admin can create tickets (hide button in UI + API validation); (4) RU — assignee dropdown shows only agents, enforced on backend too. Clarifying answers: assignees = agents only; backend enforces assignee role; in-house toast (no library).

**AI Response Summary:** Implemented `CreateTicketForm.jsx` with title, description, priority (default Medium), assignee dropdown, and `createTicket()` in API client; simple list/create view toggle in `App.jsx`. After review/RU: added inline blur validation below title, description, and assignee fields; built in-house toast system (`ToastContext.jsx`, `Toaster.jsx`, wired in `main.jsx`) for API errors/success; hid "Create Ticket" for agents via `canCreateTicket` in `utils/permissions.js`; filtered assignee dropdown to agents only; added backend `canCreateTicket`/`isAssignableUser` in `utils/permissions.js`, `findUsersByIds` in users repository, and enforcement in `createTicket` controller (403 for agent creators, 400 for non-agent assignees). Updated `spec.md`, `design-notes.md`, `acceptance-criteria.md` (+ tool-specific copy). Ran frontend build and full backend suite — 92/92 passed.

**Accepted:** `CreateTicketForm.jsx`, `createTicket()` in `api/client.js`, view toggle in `App.jsx`, inline blur validation with per-field errors, toast system, frontend `utils/permissions.js` + `constants/roles.js`, backend create-permission and assignee-role enforcement, doc updates for RU rules.

**Changed:** Server errors/success moved from inline form alert to toasts; create button hidden for agents; assignee dropdown filtered to agents; backend `POST /api/tickets` gained role checks beyond original Task 4.3 scope; docs updated for new business rules.

**Rejected:** Inline server-error banner above the form; showing "Create Ticket" to all roles; assignee dropdown listing all users; client-only enforcement of create/assignee rules without backend validation; adding a toast library dependency.

**Why:** User review required blur validation below fields, toast notifications for API feedback, and RU changes restricting ticket creation to customer/admin and assignees to agents only — with backend as source of truth per project conventions.

## Entry 20

**Prompt:** `/implement Task 4.4: Ticket detail page — fields, comments thread, add-comment form, edit/reassign form role-gated per spec. Show 403 errors when not permitted.` Followed by: Edit ticket form should not be visible to the agent and API validation should be there.

**AI Response Summary:** Implemented `TicketDetail.jsx` with `GET /api/tickets/:id` (fields, status badge, meta, description), comments thread with author names, add-comment form (`POST /api/tickets/:id/comments`), and role-gated edit/reassign form (`PATCH /api/tickets/:id`). Added `getTicketById`, `updateTicket`, `addComment` to API client; `canUpdateTicketFields` on frontend; `formatDateTime`, `utils/users.js`; clickable rows in `TicketList`; list/create/detail view toggle in `App.jsx`. API errors/success via toasts. After follow-up: removed agent branch from `canUpdateTicketFields` on backend and frontend (agents cannot edit fields — status transitions only); edit form hidden for agents; updated field-edit matrix in `spec.md`, `design-notes.md`, `acceptance-criteria.md` (+ tool-specific copy). Ran frontend build and full backend suite — 93/93 passed.

**Accepted:** `TicketDetail.jsx`, API client methods, `canUpdateTicketFields` (customer own tickets + admin any), comments thread + add-comment, edit form for permitted roles only, row-click navigation, toast on PATCH/comment errors, agent field-edit denial on backend and frontend, doc updates.

**Changed:** Initial 4.4 implementation allowed agents to edit tickets assigned to them (per original spec matrix); after user follow-up, agents were removed from field-edit permissions entirely — edit form no longer shown to agents and `PATCH` returns 403 for agents even on assigned tickets.

**Rejected:** Agent field-edit permission (`assignedTo === actingUserId`) in `canUpdateTicketFields`; showing Edit ticket section to agents.

**Why:** User required agents to work tickets via status transitions only, not general field updates; backend enforcement added so UI hiding alone is not relied on.

## Entry 21

**Prompt:** `/implement 4.5: Status action control — show only valid next states for acting user; remarks textarea when Resolved/Cancelled required. Display server errors from status endpoint.` Followed by: On the ticket details page use dropdown instead of a button for status change.

**AI Response Summary:** Implemented `StatusActions.jsx` on ticket detail with frontend `utils/stateMachine.js` mirroring backend (`getAllowedNextStatuses`, `canTransition`, `requiresRemarks`, `getPermittedNextStatuses`) to show only permitted transitions for the acting user. Added `updateTicketStatus()` in API client (`PATCH /api/tickets/:id/status`). Initial UI used one button per permitted status; for Resolved/Cancelled, clicking opened remarks textarea + Confirm/Cancel before submit. Server errors/success via toasts; detail reloads on success. After follow-up: replaced per-status buttons with a single "Change status to" dropdown listing permitted next statuses, remarks textarea shown inline when Resolved/Cancelled selected, single "Update status" submit button. Ran frontend build — passed.

**Accepted:** `StatusActions.jsx`, `utils/stateMachine.js`, `updateTicketStatus()` in API client, wired into `TicketDetail.jsx`, remarks required for Resolved/Cancelled, toast on status endpoint errors, dropdown-based status control (final UI).

**Changed:** Status action UI switched from per-status buttons with separate remarks confirm flow to a dropdown + conditional remarks field + single submit button after user follow-up.

**Rejected:** Per-status action buttons as the final status-change UI.

**Why:** User asked for a dropdown on the ticket detail page instead of buttons for status changes; permission logic and remarks requirement unchanged.
