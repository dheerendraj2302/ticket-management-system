# Test Strategy

## Test Scope

Testing focuses on the **backend API and state machine** — the authoritative layer for validation, permissions, and transitions. The React frontend is verified manually against `ui-flow.md` and acceptance criteria; there are no automated frontend/component tests in this repo.

| Tier | Framework | Location | Database |
|------|-----------|----------|----------|
| Unit | Jest | `tests/stateMachine.test.js` | None (pure functions) |
| Integration / API | Jest + Supertest | `tests/*.test.js` | Real Postgres test DB |
| Schema / infra | Jest | `tests/db.test.js`, `tests/schema.test.js`, `tests/seed.test.js` | Real Postgres test DB |
| Frontend | Manual | — | — |

**Latest run:** 101 passed, 0 failed, 7 suites (`test-results.md` may lag; re-run to refresh).

**Command:**

```bash
cd src/backend && npm test -- --runInBand --forceExit
```

**Test DB:** `TEST_DATABASE_URL` from `.env`, or derived as `{DATABASE_URL}_test`. `src/backend/testDb.js` creates/drops the test database; Jest runs with `"maxWorkers": 1` to avoid parallel create/drop races.

---

## Unit Tests

**File:** `tests/stateMachine.test.js`  
**Target:** `src/shared/stateMachine.js` (via `src/backend/utils/stateMachine.js`)

| Helper | Coverage |
|--------|----------|
| `getAllowedNextStatuses` | All five statuses + unknown status → `[]` |
| `canTransition` | All five valid role-based transitions allowed; permission denials; invalid base transitions (`409` reason text); admin override; denied results include `code` (`INVALID_TRANSITION` / `FORBIDDEN`) |
| `requiresRemarks` | `Resolved` and `Cancelled` → `true`; others → `false` |

No database access — fast, isolated checks on the transition table and actor rules in `.cursor/rules/state-machine.mdc` and `.cursor/rules/role-transitions.mdc`.

---

## Component Tests

**Not implemented.** The Vite/React UI is exercised manually:

- Acting-user selector and role-gated create/edit/status UI
- Create form inline validation on blur
- Toast success/error messages
- Search debounce and filters

Rationale: assessment scope is backend-heavy; API integration tests cover business rules. Frontend mirrors state machine for UX only.

---

## API / Integration Tests

_Mandatory tier: state-machine transitions — see `.cursor/rules/state-machine.mdc` and `.cursor/rules/role-transitions.mdc`._

### `tests/tickets.test.js` (largest suite)

| Endpoint | What's tested |
|----------|----------------|
| `GET /api/tickets` | List seeded tickets; search by title, description, comment text; status/priority filters; combined AND filters; empty results `200 []`; invalid filter enums `400` |
| `GET /api/tickets/:id` | Detail with nested comments; `404` missing ticket; invalid id `400` |
| `POST /api/tickets` | Create with defaults; missing fields; non-agent assignee; agent creator `403`; client `status` rejected; whitespace-only title/description; non-existent `actingUserId` `404` |
| `PATCH /api/tickets/:id` | Field update; customer on another user's ticket `403`; agent edit `403`; `status` in body rejected; whitespace title/description; non-agent `assignedTo` |
| `PATCH /api/tickets/:id/status` | **All five valid transitions** with correct actors and remarks where required |
| | Invalid base transitions → `409` (Open→Resolved, terminal states, etc.) |
| | Permission denials → `403` (non-assignee start/resolve, non-creator cancel/close) |
| | Remarks validation: missing/whitespace for Resolved/Cancelled `400`; remarks persisted as Comment (Resolved and Cancelled paths) |
| | Missing status, missing ticket `404` |

Status tests use `beforeEach` seed reset so each case starts from a known DB state.

### `tests/comments.test.js`

- `POST /api/tickets/:id/comments` — create `201`; empty message `400`; missing ticket `404`

### `tests/users.test.js`

- `GET /api/users` — returns all seeded users with id, name, email, role

### `tests/db.test.js`

- Test DB helper: connect, reset schema, disconnect

### `tests/schema.test.js`

- Migration applies expected tables, enums, and indexes

### `tests/seed.test.js`

- Seed data row counts and sample ticket statuses after `runSeed()`

### Conventions (from `.cursor/rules/testing-conventions.mdc`)

- One test file per resource area
- Assert on status codes **and** response body shapes/messages
- No DB mocking for integration tests
- Test names describe behavior, not implementation
- Database reset/seed between runs for order independence

---

## Edge Case Tests

Covered in integration/unit suites:

| Area | Examples |
|------|----------|
| State machine | Invalid transitions from terminal states; no-op transition to current status `409` |
| Permissions | Admin bypass; customer on another user's ticket; agent cannot create or edit fields |
| Validation | Whitespace-only strings; client-supplied `status` on create; `status` on general PATCH |
| Remarks | Required for Resolved/Cancelled; persisted in same transaction as status update |
| Search/filter | Combined filters with zero matches → `200 []` |
| Concurrency (infra) | Jest `maxWorkers: 1` prevents test DB create/drop races (see `debugging-notes.md` Issue 2) |

**Not covered in automated tests:** concurrent status updates on the same ticket (TOCTOU fix is implemented with row lock but not stress-tested); max-length field overflow (validators exist, no dedicated integration cases); optional remarks on non-required transitions creating comments.

---

## Tests Not Covered (and why)

| Area | Why omitted |
|------|-------------|
| **Frontend (React)** | Out of scope for backend-heavy assessment; manual verification sufficient |
| **E2E (browser automation)** | No Playwright/Cypress in stack; API tests cover business rules |
| **Load / performance** | Not required for exercise |
| **Auth / sessions** | Exercise uses trusted `actingUserId`; no login flow to test |
| **User CRUD** | Users are seed-only |
| **Health endpoint** | Trivial; verified via `curl` in README |
| **Concurrent API requests** | Row-lock behavior not load-tested |
| **Frontend state machine drift** | Backend unit tests are authoritative; frontend copy checked manually and via build |

---

## Related artifacts

- `test-results.md` — captured test run output
- `acceptance-criteria.md` — checklist mapped to tests and manual checks
- `debugging-notes.md` — test DB parallel race (Issue 2), stale server (Issue 3)
