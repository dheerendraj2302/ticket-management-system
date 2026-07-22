# PR Description

**Branch:** `main`  
**Base commit:** `5092387` — Initial commit: Support Ticket Management System assessment submission  
**Scope:** Greenfield delivery (110 files, +16,092 lines)

---

## Summary

Delivers the full Support Ticket Management System for the AI capability exercise: a React (Vite) frontend and Express/PostgreSQL backend where seeded users act via an `actingUserId` selector (no real authentication). Tickets move through a fixed status state machine with role-based permissions, mandatory remarks on certain transitions, keyword search, and status/priority filters. Backend validation is enforced in integration tests (93 passing across 7 suites). Lifecycle artifacts (API contract, data model, UI flow, design notes, debugging/review logs, Cursor rules/commands) are included in the same commit.

---

## What Changed

### Backend (`src/backend/`)
- Express app with `/health`, `/api/users`, and `/api/tickets` routes.
- Ticket endpoints: list (search + filters), detail, create, field update (`PATCH /:id`), status update (`PATCH /:id/status`), add comment (`POST /:id/comments`).
- Layered structure: routes → controllers → validators → repositories → PostgreSQL (`pg` pool).
- Centralized `HttpError` + `errorHandler` middleware; all errors return `{ "error": "<message>" }`.
- Shared state machine in `src/shared/stateMachine.js` (CJS), re-exported from `src/backend/utils/stateMachine.js`.
- Status transitions use `SELECT … FOR UPDATE` inside a transaction to prevent TOCTOU races.
- Migrate/seed scripts reading from `database/schema-or-migrations/` and `database/seed-data/`.

### Frontend (`src/frontend/`)
- Three views: ticket list, create ticket, ticket detail (React Router).
- `ActingUserSelector` in header; role-gated create/edit/status actions.
- Debounced keyword search; status and priority filters on list.
- `StatusActions` shows only permitted next statuses; remarks required for Resolved/Cancelled.
- Toast notifications for success and server errors; color-coded `StatusBadge` components.
- Standalone ESM state-machine copy in `src/frontend/src/utils/stateMachine.js` (mirrors backend rules; separate file due to CJS/ESM interop under Vite).

### Database (`database/`)
- Initial migration: `users`, `tickets`, `comments` tables with Postgres enums for role, priority, and status.
- Seed data: 3 users (customer, agent, admin), 5 tickets in varied statuses, 5 comments.
- Indexes on `comments.ticket_id`, `tickets.status`, `tickets.priority`.

### Tests (`tests/`)
- 7 Jest + Supertest suites against a real test Postgres database (`TEST_DATABASE_URL`).
- Coverage: schema, seed, DB helpers, users API, tickets API (CRUD, search, filters, status, permissions, remarks), comments, state-machine unit tests.
- Recorded output in `test-results.md` (93 passed, 0 failed).

### Documentation and tooling
- Planning/design artifacts: `requirements-analysis.md`, `implementation-plan.md`, `acceptance-criteria.md`, `design-notes.md`, `test-strategy.md`.
- API and UI docs: `api-contract.md`, `data-model.md`, `ui-flow.md`, `README.md`.
- Process artifacts: `debugging-notes.md`, `code-review-notes.md`, `review-fixes.md` (12 findings, all Done).
- Cursor persistent context: `.cursor/rules/*.mdc`, `.cursor/commands/*.md`, `tool-specific/cursor-workflow/`.
- Prompt history stubs in `ai-prompts/`.

---

## Features Implemented

- Create ticket (customer/admin only; assignee must be an agent; defaults to `Open` / `Medium` priority).
- List tickets with keyword search (title, description, comment text) and status/priority filters.
- Ticket detail with comments, field edit, and status transitions.
- Role-based permissions: assignee starts/resolves work; creator closes from Resolved; admin override; agents cannot edit fields.
- Mandatory remarks on `Resolved` and `Cancelled` (persisted as a Comment in the same transaction).
- Terminal states (`Closed`, `Cancelled`) reject all further transitions.
- No ticket or comment deletion — history preserved.
- Data persists across server restarts (PostgreSQL).

---

## Technical Changes

| Area | Detail |
|---|---|
| **API** | REST JSON; explicit HTTP status codes (400, 403, 404, 409, 500) |
| **Validation** | Request-body and query-param validators; max-length limits (title 255, text 10,000) |
| **State machine** | `canTransition`, `getAllowedNextStatuses`, `requiresRemarks`; structured `TRANSITION_CODES` |
| **Concurrency** | `SELECT … FOR UPDATE` on status change |
| **Frontend proxy** | Vite dev server proxies `/api` → `http://localhost:4000` |
| **Env** | `.env.example` at repo root; `.env` gitignored |

---

## Database Changes

**Migration:** `database/schema-or-migrations/001_initial_schema.sql`

| Table | Key columns |
|---|---|
| `users` | `id`, `name`, `email`, `role` (`customer` \| `agent` \| `admin`) |
| `tickets` | `title`, `description`, `priority`, `status`, `assigned_to`, `created_by`, `updated_by`, timestamps |
| `comments` | `ticket_id`, `message`, `created_by`, `created_at` |

**Seed:** `database/seed-data/seed.sql` — 3 users, 5 tickets, 5 comments.

---

## Testing Done

```bash
cd src/backend && npm test -- --runInBand --forceExit
```

| Metric | Result |
|---|---|
| Test suites | 7 passed |
| Tests | 93 passed, 0 failed |
| Time | ~46 s |
| Recorded in | `test-results.md` (23 Jul 2026) |

**Suites:** `tickets`, `users`, `comments`, `schema`, `seed`, `db`, `stateMachine`.

**Post-review additions verified by tests:** create rejects client-supplied `status`; `assignedTo` must be agent; agent field-edit denied (403); whitespace validation; transition `code` in unit tests.

---

## Test Plan

Manual and automated checks for reviewers:

### Setup
- [ ] Clone repo; `cp .env.example .env` and set `DATABASE_URL`
- [ ] Create database: `psql -U postgres -c "CREATE DATABASE ticket_management;"`
- [ ] `cd src/backend && npm install && npm run migrate && npm run seed && npm start`
- [ ] `cd src/frontend && npm install && npm run dev`
- [ ] `curl http://localhost:4000/health` → `{"status":"ok"}`

### Core UI flows
- [ ] Select **customer** acting user → create a ticket assigned to the agent → appears in list
- [ ] Open ticket detail → add a standalone comment
- [ ] Select **agent** → start work (Open → In Progress) on assigned ticket
- [ ] Agent resolves (In Progress → Resolved) with mandatory remarks
- [ ] Select **customer** (ticket creator) → close (Resolved → Closed)
- [ ] Search by keyword; filter by status and priority
- [ ] Restart backend → tickets and comments still present

### Validation and permissions
- [ ] Agent acting user cannot see create-ticket entry point
- [ ] Invalid transition (e.g. Open → Resolved via API) returns 409 with clear message
- [ ] Transition to Resolved/Cancelled without remarks returns 400
- [ ] Customer cannot edit another customer's ticket (403)
- [ ] `PATCH /api/tickets/:id` with `status` in body returns 400
- [ ] Terminal ticket (Closed) rejects any status change (409)

### Automated
- [ ] `cd src/backend && npm test -- --runInBand --forceExit` — all 93 tests pass
- [ ] `cd src/frontend && npm run build` — production build succeeds

### Security
- [ ] No `.env` or secrets in the committed tree (only `.env.example`)

---

## AI Usage Summary

- **Tool:** Cursor (Agent mode for implementation; Plan mode for upfront planning).
- **Persistent context:** `.cursor/rules/` (project overview, state machine, role transitions, testing conventions) and slash commands (`/plan`, `/implement`, `/write-tests`, `/debug`, `/review`, `/document`).
- **Workflow:** Scoped prompts per feature from `tool-specific/cursor-workflow/tasks.md`; every diff reviewed and run before commit.
- **Review loop:** `/review` produced 12 findings in `review-fixes.md` (TOCTOU fix, validation gaps, test coverage, explicit status codes); all addressed.
- **Known AI miss:** Shared CJS state machine could not be imported in Vite ESM frontend — resolved with a mirrored frontend copy (documented in `code-review-notes.md`).

---

## Screenshots / Demo Notes

1. Open `http://localhost:5173` with backend running on port 4000.
2. Use the header **Acting user** dropdown to switch between seeded customer, agent, and admin.
3. **List view:** search box, status/priority filters, color-coded status badges, click a row for detail.
4. **Create view:** visible for customer/admin only; assignee dropdown lists agents.
5. **Detail view:** field edit (role-gated), status action buttons (only valid next states), remarks modal for Resolved/Cancelled, comment thread, toast feedback.

No screenshots are embedded in this PR; the above steps reproduce the demo locally.

---

## Known Limitations

- No real authentication — identity is simulated via `actingUserId` query/body parameter.
- Users are seed-only; no User CRUD UI.
- Frontend state-machine rules are duplicated in a separate ESM file (backend remains source of truth).
- No pagination, sorting, or Docker/CI in this submission.
- Migrations are not version-tracked in a migrations table; re-run requires drop/recreate (documented in `README.md`).

---

## Future Improvements

- Add authentication and replace the acting-user selector with real sessions.
- Unify frontend/backend state machine (ESM build of shared module or code-generation step).
- Add pagination and assignee filter on the ticket list.
- Docker Compose for one-command local setup.
- CI workflow running migrate + test on push.
- Frontend component/integration tests (currently backend-only test coverage).
