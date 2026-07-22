# Tasks (Cursor Plan Mode Output)

_Break work into small, independently-testable tasks. Check items off as you go — this becomes evidence of your actual build order._

Build order: **schema → backend → tests → frontend → docs sync**.

---

## Phase 1 — Database & Project Scaffold

- [ ] **1.1** Initialize backend project (`src/backend/package.json`, Express entry point, dotenv loading from `.env.example`)
  - _Done when:_ `npm start` launches Express on `PORT` from env.

- [ ] **1.2** Postgres connection module + test DB helper (separate test database file, connect/disconnect/reset utilities)
  - _Done when:_ connection succeeds against `DATABASE_URL`; test helper can create and drop a clean test DB.

- [ ] **1.3** Schema: `users`, `tickets` (with `updatedBy`), `comments` tables + enum constraints for `role`, `priority`, `status`
  - _Done when:_ migration/init script runs without error; `\d` shows all tables and constraints.

- [ ] **1.4** Seed script: 3+ users (one per role: customer, agent, admin), tickets in each status, sample comments
  - _Done when:_ seed runs; querying tables returns expected rows.

- [ ] **1.5** Fill `database/setup-notes.md` with real setup/run commands
  - _Done when:_ another developer can follow the notes to create DB, seed, and verify persistence after restart.

---

## Phase 2 — Backend Core

Each task should have at least one passing Supertest case before moving on.

- [ ] **2.1** `GET /api/users` — return all seeded users (id, name, email, role)
  - _Done when:_ Supertest returns 200 with user array; includes all three roles.

- [ ] **2.2** `POST /api/tickets` — create with validation, defaults (`priority=Medium`, `status=Open`), auto-populate `createdBy`, `updatedBy`, timestamps
  - _Done when:_ valid create returns 201; missing title/description/assignedTo returns 400; invalid assignedTo returns 400.

- [ ] **2.3** `GET /api/tickets` — list all tickets (no filters yet)
  - _Done when:_ Supertest returns 200 with array of all seeded tickets.

- [ ] **2.4** `GET /api/tickets/:id` — detail with nested comments array
  - _Done when:_ existing ticket returns 200 with comments; non-existent ID returns 404.

- [ ] **2.5** `PATCH /api/tickets/:id` — partial field update/reassign; role scope checks; reject `status` field
  - _Done when:_ valid update returns 200 with `updatedBy`/`updatedAt` changed; customer updating another's ticket returns 403; request with `status` field returns 400.

- [ ] **2.6** Pure function: `getAllowedNextStatuses(currentStatus)` — base state machine lookup map
  - _Done when:_ unit tests cover all 5 statuses; terminal states return empty array.

- [ ] **2.7** Pure function: `canTransition({ actor, ticket, targetStatus })` — role/actor permission rules
  - _Done when:_ unit tests cover all 5 allowed role-based paths and at least 5 denial cases.

- [ ] **2.8** Pure function: `requiresRemarks(targetStatus)` — returns true for Resolved and Cancelled
  - _Done when:_ unit tests pass for all 5 status values.

- [ ] **2.9** `PATCH /api/tickets/:id/status` — base + role validation, mandatory remarks → Comment in same transaction
  - _Done when:_ valid transition returns 200; invalid transition returns 409 with current/attempted status; missing remarks on Resolved/Cancelled returns 400; remarks persisted as Comment.

- [ ] **2.10** `POST /api/tickets/:id/comments` — add standalone comment
  - _Done when:_ valid comment returns 201; empty message returns 400; non-existent ticket returns 404.

- [ ] **2.11** `GET /api/tickets?search=&status=&priority=` — keyword search (title, description, comment text) + status/priority filters (AND logic)
  - _Done when:_ search matches title, description, and comment text independently; filters work alone and combined; no matches returns empty array.

- [ ] **2.12** Centralized error handler — consistent JSON `{ error: "..." }` for 4xx/5xx
  - _Done when:_ all endpoints return the standard error shape; no unhandled rejections.

---

## Phase 3 — Integration Tests (Mandatory Tier)

- [ ] **3.1** Valid transitions — all 5 allowed paths in role matrix:
  - Open → In Progress (assignee)
  - In Progress → Resolved (assignee, with remarks)
  - Open → Cancelled (creator, with remarks)
  - In Progress → Cancelled (creator, with remarks)
  - Resolved → Closed (creator)
  - _Done when:_ all 5 tests pass with 200 and correct final status.

- [ ] **3.2** Invalid base transitions:
  - Open → Resolved (409)
  - Open → Closed by anyone (409)
  - In Progress → Closed by creator (409)
  - Resolved → Open (409)
  - Closed → In Progress (409)
  - Cancelled → Open (409)
  - _Done when:_ all 6 tests pass with expected status codes and error messages.

- [ ] **3.3** Permission failures:
  - Resolved → Closed by non-creator/non-admin (403)
  - Customer closing another user's ticket (403)
  - Agent resolving unassigned ticket (403)
  - Non-assignee attempting Open → In Progress (403)
  - _Done when:_ all 4 tests pass.

- [ ] **3.4** Remarks validation:
  - In Progress → Resolved without remarks (400)
  - Open → Cancelled without remarks (400)
  - Resolved with remarks → Comment created in DB (200 + comment exists)
  - _Done when:_ all 3 tests pass.

- [ ] **3.5** Search and filter tests:
  - Keyword found in title (200, match returned)
  - Keyword found in description (200, match returned)
  - Keyword found in comment text (200, match returned)
  - Status filter alone (200, correct subset)
  - Priority filter alone (200, correct subset)
  - Combined search + status + priority (200, AND logic)
  - _Done when:_ all 6 tests pass.

- [ ] **3.6** Record test output in `test-results.md`
  - _Done when:_ file contains genuine `npm test` output, not invented results.

---

## Phase 4 — Frontend (Last)

- [ ] **4.1** Vite + React scaffold in `src/frontend/`, API client module, acting-user React context
  - _Done when:_ app loads; acting-user dropdown populated from `GET /api/users`.

- [ ] **4.2** Ticket list page — table/cards, search box, status filter dropdown, priority filter dropdown
  - _Done when:_ list renders seeded tickets; search and both filters work against live API.

- [ ] **4.3** Create ticket form — title, description, priority (default Medium), assignee dropdown
  - _Done when:_ submitting creates a ticket; validation errors from server displayed inline.

- [ ] **4.4** Ticket detail page — display fields, comments thread, add-comment form, edit/reassign (role-gated)
  - _Done when:_ detail loads with comments; can add comment; can edit fields when permitted; 403 errors shown when not permitted.

- [ ] **4.5** Status action control — show only valid next states for current acting user; remarks textarea when required
  - _Done when:_ correct buttons shown per role; remarks required before Resolved/Cancelled; server errors displayed.

- [ ] **4.6** Manual acceptance pass against `acceptance-criteria.md`
  - _Done when:_ every Core checkbox in acceptance-criteria.md can be demonstrated in the running app.

---

## Phase 5 — Docs Sync (Post-Implementation)

- [ ] **5.1** Update `api-contract.md` from real implemented routes
  - _Done when:_ every endpoint documented with actual request/response shapes.

- [ ] **5.2** Update `data-model.md` from real schema (including `updatedBy`)
  - _Done when:_ entity fields match database columns exactly.

- [ ] **5.3** Update `ui-flow.md` from real screens
  - _Done when:_ screens, navigation, and interactions match the built UI.

- [ ] **5.4** Update `.cursor/rules/state-machine.mdc` or add companion `role-transitions.mdc` documenting role-layer rules
  - _Done when:_ agent has accurate transition table including role-based rules (creator/admin Close from Resolved only) and remarks requirements.

- [ ] **5.5** Update `README.md` with setup, env vars, seed, run, and test commands
  - _Done when:_ clean checkout can follow README to run app and tests.

- [ ] **5.6** Draft `pr-description.md` from actual git diff
  - _Done when:_ PR description summarizes real changes, not planned ones.
