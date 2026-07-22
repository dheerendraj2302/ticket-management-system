# AI Prompts — Testing

_Log real sessions as you go — don't reconstruct from memory at the end. Add one entry block per meaningful prompt/response exchange._

## Entry 1

**Prompt:** `/write-tests Task 3.1: integration tests for all 5 valid role-based transitions — Open→In Progress (assignee), In Progress→Resolved (assignee+remarks), Open→Cancelled (creator+remarks), In Progress→Cancelled (creator+remarks), Resolved→Closed (creator). Assert 200 and final status.` Follow testing-conventions.mdc; cover happy path and at least 2 failure/invalid-input cases; cover every row in the state-machine table (all valid and invalid transitions); do not modify implementation; report which tests are expected to fail.

**AI Response Summary:** Expanded the `PATCH /api/tickets/:id/status` suite in `tests/tickets.test.js` without touching backend code. Added `beforeEach` re-seeding via `seed.runSeed()` for order-independent tests, plus helpers (`createOpenTicket`, `createInProgressTicket`, `createResolvedTicket`, `transitionStatus`) to set up tickets at the right starting status. Wrote 28 integration tests in five groups: (1) five valid role-based transitions asserting `200` and final `status`; (2) fifteen invalid base transitions via `it.each` plus a no-op same-status case, all asserting `409` with messages naming current and target status; (3) three role/permission denials asserting `403`; (4) two remarks validation cases asserting `400` (missing remarks on resolve, whitespace-only on cancel); (5) two request validation cases (`400` missing status, `404` ticket not found). Ran `npm test -- --runInBand --forceExit tests/tickets.test.js -t "PATCH /api/tickets/:id/status"` — 28/28 passed. Reported no expected failures against current implementation.

**Accepted:** Full `PATCH /api/tickets/:id/status` test suite in `tests/tickets.test.js` — `beforeEach` re-seed, ticket-setup helpers, five valid-transition cases, sixteen invalid-transition cases (`it.each` + no-op), three `403` permission cases, two remarks `400` cases, two request-validation cases (`400`/`404`). No implementation files modified.

**Changed:** Replaced the prior single happy-path status test (`transitions ticket status and returns 200` on seeded ticket 1) with the expanded suite; moved seeding from `beforeAll` to `beforeEach` within that describe block so mutating tests do not interfere with each other.

## Entry 2

**Prompt:** `/write-tests Task 3.2: invalid base transitions — Open→Resolved, Open→Closed, In Progress→Closed, Resolved→Open, Closed→In Progress, Cancelled→Open. All must return 409 with clear error messages.` Follow testing-conventions.mdc; cover happy path and at least 2 failure/invalid-input cases; cover state-machine table if touching ticket status; do not modify implementation; report which tests are expected to fail.

**AI Response Summary:** Noted that all six Task 3.2 transitions were already covered inside Task 3.1's broader `it.each` invalid-transition block. Refactored `tests/tickets.test.js` to make Task 3.2 explicit: extracted a shared `assertRejectsInvalidTransition` helper (asserts `409` and `{ error: "Invalid transition from {from} to {target}" }`), added `describe('invalid base transitions (Task 3.2)')` with `it.each` for the six named cases (using seeded tickets 1–5 and `actingUserId: ADMIN_ID` so role rules do not mask base-transition failures), and moved the remaining nine invalid edges plus the no-op case into `describe('additional invalid base transitions')`. No backend code changed. Ran `npm test -- --runInBand --forceExit tests/tickets.test.js -t "invalid base"` — 16/16 passed (6 Task 3.2 + 10 additional). Reported no expected failures against current implementation.

**Accepted:** `assertRejectsInvalidTransition` helper; `describe('invalid base transitions (Task 3.2)')` with six `it.each` cases for Open→Resolved, Open→Closed, In Progress→Closed, Resolved→Open, Closed→In Progress, Cancelled→Open; `describe('additional invalid base transitions')` retaining full state-machine invalid-edge coverage and the no-op test. No implementation files modified.

**Changed:** Split the monolithic `describe('invalid base transitions')` from Entry 1 into the Task 3.2-focused block plus an additional-invalid block; deduplicated assertion logic into the shared helper instead of inlining the request/assert body in each `it.each` callback.

**Rejected:**


**Why:**

## Entry 3

**Prompt:** `/write-tests Task 3.3: permission failures — Resolved→Closed by non-creator/non-admin (403), customer closing another user's ticket (403), agent resolving unassigned ticket (403), non-assignee Open→In Progress (403).` Follow testing-conventions.mdc; do not modify implementation; report which tests are expected to fail.

**AI Response Summary:** Noted that two of four Task 3.3 scenarios (non-creator closing Resolved, non-assignee Open→In Progress) were already present in Task 3.1's `role and permission denials` block. Refactored `tests/tickets.test.js` to make Task 3.3 explicit: added `assertForbiddenTransition` helper (asserts `403` with permission error message), created `describe('permission failures (Task 3.3)')` with four dedicated cases — agent closing customer-created Resolved ticket, customer closing agent-created Resolved ticket (new setup: agent creates/transitions to Resolved, customer attempts Close), agent resolving ticket assigned to customer not agent (new setup: admin moves to In Progress, agent attempts Resolve), customer attempting Open→In Progress on agent-assigned ticket — and moved the extra Open→Cancelled-by-agent case into `describe('additional permission denials')`. No backend code changed. Ran `npm test -- --runInBand --forceExit tests/tickets.test.js -t "permission"` — 5/5 passed (4 Task 3.3 + 1 additional). Reported no expected failures against current implementation.

**Accepted:** `assertForbiddenTransition` helper; `describe('permission failures (Task 3.3)')` with four tests for Resolved→Closed by non-creator/non-admin, customer closing another user's Resolved ticket, agent resolving unassigned ticket, and non-assignee Open→In Progress; `describe('additional permission denials')` retaining the non-creator cancel case. No implementation files modified.

**Changed:** Renamed/replaced `describe('role and permission denials')` from Entry 1 with the Task 3.3-focused block plus additional-permission block; added two new test setups (agent-created Resolved ticket closed by customer; customer-assigned In Progress ticket resolved by agent) that were not in the prior suite; deduplicated `403` assertion logic into the shared helper.

**Rejected:**


**Why:**

## Entry 4

**Prompt:** `/write-tests Task 3.4: remarks validation — In Progress→Resolved without remarks (400), Open→Cancelled without remarks (400), Resolved with remarks creates Comment in DB (200).` Follow testing-conventions.mdc; do not modify implementation; report which tests are expected to fail.

**AI Response Summary:** Noted that In Progress→Resolved without remarks was already covered in Task 3.1's `remarks validation` block. Refactored `tests/tickets.test.js` to make Task 3.4 explicit: created `describe('remarks validation (Task 3.4)')` with three cases — `400` when resolving without remarks (renamed/clarified), `400` when cancelling without remarks (new: Open→Cancelled with no `remarks` field), and `200` plus Comment persistence when resolving with remarks (new: asserts status update then `GET /api/tickets/:id` confirms `comments` contains the remarks `message`, `ticketId`, and `createdBy`) — and moved the whitespace-only cancel case into `describe('additional remarks validation')`. No backend code changed. Ran `npm test -- --runInBand --forceExit tests/tickets.test.js -t "remarks"` — 7/7 matched tests passed (3 Task 3.4 + 1 additional + 3 valid-transition cases whose names contain "remarks"). Reported no expected failures against current implementation.

**Accepted:** `describe('remarks validation (Task 3.4)')` with three tests for In Progress→Resolved without remarks (`400`), Open→Cancelled without remarks (`400`), and In Progress→Resolved with remarks persisting a Comment (`200` + `GET` detail verification); `describe('additional remarks validation')` retaining the whitespace-only cancel case. No implementation files modified.

**Changed:** Renamed/replaced `describe('remarks validation')` from Entry 1 with the Task 3.4-focused block plus additional-remarks block; added Open→Cancelled-without-remarks test and comment-persistence verification via ticket detail endpoint that were not in the prior suite.

**Rejected:**


**Why:**

## Entry 5

**Prompt:** `/write-tests Task 3.5: search and filter — keyword in title, description, comment text; status filter alone; priority filter alone; combined search+status+priority with AND logic.` Follow testing-conventions.mdc; do not modify implementation; report which tests are expected to fail.

**AI Response Summary:** Noted that all six Task 3.5 scenarios were already present in `GET /api/tickets` tests from an earlier implementation task, but keyword search was bundled into one test. Refactored `tests/tickets.test.js` to make Task 3.5 explicit: created `describe('search and filter (Task 3.5)')` with nine tests — separate keyword-in-title (`search=billing` → ticket 2), keyword-in-description (`search=subscription` → ticket 2), keyword-in-comment (`search=csv export` → ticket 3), status-alone (`status=Open` → ticket 1), priority-alone (`priority=High` → tickets 1 and 4), combined AND (`search=login` + `status=Open` + `priority=High` → ticket 1), plus three new failure/edge cases: combined filters with no matches (`200` + `[]`), invalid `status` (`400`), invalid `priority` (`400`). Left the baseline `returns all seeded tickets with 200` test outside the Task 3.5 block. No backend code changed. Ran `npm test -- --runInBand --forceExit tests/tickets.test.js -t "search and filter"` — 9/9 passed. Reported no expected failures against current implementation.

**Accepted:** `describe('search and filter (Task 3.5)')` with nine tests covering keyword search in title/description/comment, status filter alone, priority filter alone, combined AND logic, empty-result combined filters, and invalid status/priority query params. No implementation files modified.

**Changed:** Split the prior single bundled keyword-search test and separate status/priority/combined tests into the Task 3.5-focused block with one test per search surface; added three new cases (no-match empty array, invalid status `400`, invalid priority `400`) not in the prior suite.

**Rejected:**


**Why:**

## Entry 6

**Prompt:** (No separate `/write-tests` command — test updates made during implementation review/RU for create-ticket permissions: only customer/admin may create; `assignedTo` must be an agent.)

**AI Response Summary:** Updated `tests/tickets.test.js` to match new `POST /api/tickets` rules. Added two cases: agent creating a ticket → `403` (`Only customers and admins can create tickets`); `assignedTo` referencing a customer → `400` (`assignedTo must reference an agent`). Fixed three existing setups that violated the new rules: PATCH 403 test now creates ticket as admin (not agent); status permission test for customer closing another user's Resolved ticket now creates as admin; repurposed "agent resolves unassigned ticket" to "non-assignee non-admin (customer) tries to resolve" because with one seeded agent and assignees-must-be-agents, a true agent-not-assignee create scenario is impossible without a second agent in seed data. Ran full suite — 92/92 passed (up from 90). Updated `test-results.md`.

**Accepted:** Two new `POST /api/tickets` tests; three adjusted test setups in PATCH/status permission blocks; `test-results.md` updated to 92 passed.

**Changed:** "Agent resolves ticket not assigned to them" repurposed to customer attempting resolve (non-assignee denial) because new assignee rules make the original scenario unreachable with current seed data; ticket-creation in permission tests switched from `actingUserId: AGENT_ID` to `ADMIN_ID` where needed.

**Rejected:** Leaving agent-as-creator setups unchanged (would fail under new 403 rule); adding a second seeded agent solely to preserve the old agent-not-assignee test (not done — noted as optional follow-up).

**Why:** Backend now rejects agent creators and non-agent assignees; tests had to align with enforced rules rather than expect the pre-RU behavior.

## Entry 7

**Prompt:** (No separate `/write-tests` command — test update during Task 4.4 follow-up: agents denied field edits on `PATCH /api/tickets/:id`.)

**AI Response Summary:** Added `tests/tickets.test.js` case: agent (`actingUserId: 2`) PATCH on ticket 1 (assigned to them) → `403` with `You do not have permission to update this ticket`. Aligns with removal of agent branch from `canUpdateTicketFields`. Ran full suite — 93/93 passed (up from 92). Updated `test-results.md`.

**Accepted:** New PATCH 403 case for agent field-edit denial; `test-results.md` updated to 93 passed.

**Changed:**

**Rejected:** Keeping a passing test that asserted agents could PATCH tickets assigned to them (would contradict new rule).

**Why:** Field-edit permission rule changed — agents no longer have update scope on `PATCH /api/tickets/:id`; test suite must assert the denial.