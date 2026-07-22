# Acceptance Criteria (mirror of root `/acceptance-criteria.md` — keep in sync)

## Core
- [ ] A user can create a ticket via the UI
- [ ] A user can view all tickets from the database
- [ ] A user can open a ticket detail view
- [ ] A user can update ticket fields and reassign
- [ ] A user can add comments
- [ ] Status changes only through valid transitions; invalid ones are rejected
- [ ] Keyword search and status filter work
- [ ] Data remains available after restart
- [ ] Backend validation prevents invalid records
- [ ] No secrets committed to the repo
- [ ] State-machine integration tests pass

## Validation
- [ ] Create ticket rejects missing or whitespace-only `title`, `description`, or `assignedTo` (400)
- [ ] Create ticket rejects non-existent `assignedTo` (400) or `actingUserId` (404)
- [ ] Create ticket is restricted to `customer` and `admin` acting users; agents are rejected (403)
- [ ] Create ticket requires `assignedTo` to reference an `agent`; other roles rejected (400)
- [ ] Create ticket defaults `priority` to `Medium` when omitted; rejects invalid priority values (400)
- [ ] Create ticket always sets `status` to `Open`; client cannot supply a different initial status
- [ ] Create ticket auto-populates `createdBy`, `updatedBy`, `createdAt`, and `updatedAt` from acting user and current timestamp
- [ ] General ticket update (`PATCH /api/tickets/:id`) rejects a `status` field in the request body (400)
- [ ] General ticket update rejects whitespace-only `title` or `description` when provided (400)
- [ ] General ticket update rejects non-existent `assignedTo` or `actingUserId` (404)
- [ ] General ticket update enforces field-edit scope: customer only on tickets they created, admin on any ticket, agents denied (403); enforced on backend and edit form hidden for agents
- [ ] Status changes use only `PATCH /api/tickets/:id/status`; base state machine rejects invalid transitions (409)
- [ ] Status changes enforce role/actor rules (e.g. assignee or admin for Open → In Progress; creator or admin for Cancel/Close) (403)
- [ ] Transitions to `Resolved` or `Cancelled` require non-empty `remarks` after trim; whitespace-only remarks rejected (400)
- [ ] Transitions to `Resolved` or `Cancelled` persist remarks as a Comment in the same transaction as the status update
- [ ] Transitions to `Closed` or `In Progress` do not require mandatory remarks
- [ ] Terminal states (`Closed`, `Cancelled`) reject all further status transitions (409)
- [ ] Add comment rejects empty or whitespace-only `message` (400)
- [ ] All mutating requests require a valid `actingUserId` referencing a seeded user
- [ ] List/search query params reject invalid `status` or `priority` enum values when provided (400)

## Error Handling
- [ ] Every error response returns JSON `{ "error": "<human-readable message>" }`
- [ ] Validation failures return 400 with a clear message (missing fields, invalid enum, whitespace-only input, `status` on general PATCH, missing remarks)
- [ ] Permission failures on field update or status transition return 403 with an explicit reason
- [ ] Missing ticket or user returns 404 with a clear message
- [ ] Invalid status transitions return 409; message names both current and attempted status
- [ ] Unexpected server/database failures return 500 with a generic message (no stack trace leaked to client)
- [ ] Search or combined filters with no matches return 200 with an empty array (not an error)
- [ ] Frontend surfaces server validation/permission errors and success messages to the user via toast notifications
- [ ] Create ticket form validates required fields inline (below inputs) on blur
- [ ] Create ticket entry point is hidden for agents (only customer/admin can open the form); assignee dropdown lists only agents

## Testing
- [ ] Backend uses Jest + Supertest for API/integration tests against a real test Postgres database
- [ ] Integration tests cover all five valid state-machine transitions (Open → In Progress, In Progress → Resolved, Open → Cancelled, In Progress → Cancelled, Resolved → Closed)
- [ ] Integration tests cover invalid base transitions (e.g. Open → Resolved, Open → Closed, Resolved → Open, any transition out of Closed or Cancelled) with correct rejection status codes
- [ ] Integration tests cover role/permission denials (e.g. non-assignee starting work, non-creator closing, customer acting on another user's ticket)
- [ ] Integration tests cover mandatory-remarks cases for `Resolved` and `Cancelled` (missing and whitespace-only remarks rejected; remarks persisted as Comment)
- [ ] Integration tests cover general PATCH rejecting a `status` field and field-edit permission scope
- [ ] At least one backend test exists per major API feature (create, list, detail, update, status change, comment, search/filter)
- [ ] Pure transition helpers (`getAllowedNextStatuses`, `canTransition`, `requiresRemarks`) have unit tests where implemented
- [ ] Tests reset/seed the database between runs so they are order-independent
- [ ] Actual test run output is recorded in `test-results.md`

## Documentation
- [ ] `requirements-analysis.md` documents functional/non-functional requirements, assumptions, and edge cases
- [ ] `design-notes.md` includes architecture overview, frontend/backend/database design, validation and error-handling strategy, and the Mermaid state-machine diagram
- [ ] `api-contract.md` documents all implemented endpoints with request/response shapes and error cases
- [ ] `data-model.md` reflects the implemented schema (including `updatedBy` on Ticket)
- [ ] `ui-flow.md` describes screens, navigation, and key interactions
- [ ] `test-strategy.md` describes test scope, tiers, and what is intentionally not covered
- [ ] `database/setup-notes.md` has working setup, seed, and persistence-verification steps
- [ ] `README.md` includes setup, environment variables, run, and test commands verifiable on a clean checkout
- [ ] `.env.example` is present and in sync with required environment variables (no secrets committed)
