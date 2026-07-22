# Implementation Plan

**File:** `implementation-plan.md`  
**Project:** Support Ticket Management System (backend-heavy)  
**Stack:** React (Vite) · Node.js/Express · PostgreSQL · Jest + Supertest

---

## Overview

Build a full-stack support ticket management system per the assessment brief. Seeded users act via an `actingUserId` selector (no real authentication). The backend enforces validation, role-based permissions, and a fixed ticket status state machine. The frontend provides list/search/filter, create, detail, field edit, status transitions, and comments.

**Assumptions**
- Project option: Support Ticket Management System (backend-heavy).
- Core development budget: 8–12 hours; remaining time reserved for lifecycle artifacts.
- Users are seed-only; no User CRUD UI.

**In scope**
- Full Core: tickets, comments, state machine, keyword search, status filter, backend validation, integration tests.
- Persistent Cursor context: `.cursor/rules/` and `.cursor/commands/`.
- Documentation artifacts: `api-contract.md`, `data-model.md`, `ui-flow.md`, `design-notes.md` (including Mermaid state diagram).
- UI polish: color-coded status badges.

**Out of scope (deferred)**
- Full authentication and protected routes.
- User CRUD and role-management UI.
- Pagination, sorting, and assignee filter beyond Core requirements.
- Docker, CI, and Swagger/OpenAPI.

**State machine (core business rule)**

| Transition | Valid? |
|---|---|
| Open → In Progress | Yes |
| In Progress → Resolved | Yes |
| Resolved → Closed | Yes |
| Open → Cancelled | Yes |
| In Progress → Cancelled | Yes |
| Open → Resolved / Closed | No |
| Resolved → Open | No |
| Closed → anything | No (terminal) |
| Cancelled → anything | No (terminal) |

Role-based rules extend the base machine (e.g. assignee starts work, creator closes from Resolved, admin override). Full rules live in `.cursor/rules/state-machine.mdc`.

**Definition of done**
- All Core acceptance criteria in `acceptance-criteria.md` pass.
- State-machine integration tests cover every valid and invalid transition row above.
- `README.md` works on a clean checkout; no secrets in the repo.
- Lifecycle artifacts (`test-results.md`, `debugging-notes.md`, `code-review-notes.md`, `ai-prompts/`, etc.) are complete.

---

## Task Breakdown

### Phase 0 — Kickoff and planning (~1.5h)
- Complete `candidate-info.md`.
- Draft `requirements-analysis.md`, `acceptance-criteria.md`, and `test-strategy.md`.
- Set up `.cursor/rules/*.mdc` and `.cursor/commands/*.md`.
- Write `tool-specific/cursor-workflow/project-context.md`, `spec.md`, and `tasks.md`.

### Phase 1 — Backend core (~4h)
- PostgreSQL schema and migrations for `User`, `Ticket`, `Comment`.
- Seed data (users in multiple roles, tickets in multiple statuses, comments).
- REST endpoints: create, list, detail, update ticket; add comment.
- Dedicated status endpoint (`PATCH /api/tickets/:id/status`) enforcing the state machine.
- Input validation, role checks, centralized JSON error handling.
- Keyword search and status (and priority) filter query params.
- `.env.example`; verify no credentials in source control.

### Phase 2 — Frontend core (~3h)
- Ticket list with search and filters.
- Ticket detail with comments and status controls (only valid next states shown).
- Create and edit forms with inline and server-side error display.
- Color-coded status badges.
- Manual walkthrough of every Core acceptance criterion.

### Phase 3 — Testing (~1.5h)
- Integration tests: all valid transitions succeed.
- Integration tests: invalid transitions and terminal states rejected with correct status codes.
- Integration tests: role/permission denials and mandatory-remarks cases.
- Unit tests for pure transition helpers (`getAllowedNextStatuses`, `canTransition`, `requiresRemarks`).
- Record output in `test-results.md`.

### Phase 4 — Debugging and code review (~1h)
- Document issues in `debugging-notes.md`.
- Run structured review (`/review`); log findings in `code-review-notes.md`.
- Apply fixes; record in `review-fixes.md`.

### Phase 5 — Documentation (~2h)
- `README.md`, `api-contract.md`, `data-model.md`, `ui-flow.md`, `design-notes.md`.
- Mermaid state diagram in `design-notes.md`.
- `pr-description.md` from the git diff.

### Phase 6 — Reflection and prompt history (~1h)
- `reflection.md`, `final-ai-usage-summary.md`, `tool-workflow.md`.
- Consolidate `ai-prompts/*.md` with accepted/changed/rejected notes per session.

### Phase 7 — Submission (~30 min)
- Verify repo access, project option, and tool selection for Part C.
- Use traceable commit messages for fixes referenced in the submission form.

---

## Milestones

| Milestone | Deliverables | Target |
|---|---|---|
| M1 — Planning complete | Requirements, acceptance criteria, test strategy, Cursor rules/commands, `tasks.md` | Day 1 (~1.5h) |
| M2 — Backend API done | Schema, seed, all endpoints, validation, state machine | Days 2–3 (~4h) |
| M3 — Frontend done | List, create, detail, status UI, badges; manual AC walkthrough | Days 3–4 (~3h) |
| M4 — Tests green | Integration + unit tests; `test-results.md` recorded | Day 4 (~1.5h) |
| M5 — Review complete | `debugging-notes.md`, `code-review-notes.md`, `review-fixes.md` | Day 5 (~1h) |
| M6 — Docs complete | README, API contract, data model, UI flow, design notes | Days 5–6 (~2h) |
| M7 — Submission ready | Reflection, AI usage summary, prompt history, Part C form | Day 7 |

Core development (M1–M5) is budgeted at ~11 hours within the 8–12 hour band. M6–M7 cover lifecycle artifacts and submission.

---

## AI Usage Plan

**Primary tool:** Cursor (Agent mode for implementation; Plan mode for upfront planning).

### Providing context
- **`.cursor/rules/`** — always-on project standards:
  - `project-overview.mdc` — stack, folder layout, conventions.
  - `state-machine.mdc` — exact transition table, auto-attached to backend ticket/status files.
  - `testing-conventions.mdc` — Jest/Supertest expectations, auto-attached to test files.
- **`tool-specific/cursor-workflow/project-context.md`** — narrative description of entities, constraints, and scope decisions.
- **`tasks.md` and `spec.md`** — scoped work units referenced in each implementation prompt.

### Requirement analysis and planning
- Use **Plan mode** (or `/plan`) against the brief and `acceptance-criteria.md` before writing code.
- Ask clarifying questions on business rules (status transitions, role permissions, remarks) rather than assuming.
- Output: `requirements-analysis.md`, phased `tasks.md`, and updated acceptance criteria.

### Design
- Draft `design-notes.md` architecture sections and the Mermaid state diagram from the implemented rules.
- Generate `api-contract.md` and `data-model.md` from actual route and schema code to keep docs accurate.

### Code generation
- Use **Agent mode** (or `/implement`) one feature at a time from `tasks.md` — not a single "build everything" prompt.
- Typical order: database schema → backend routes → shared state machine → frontend views.
- Review every diff before accepting; run the server and hit the endpoint or screen under change.

### Validating AI output
- Run `npm test` after backend changes; manually exercise invalid state transitions in the UI or via curl.
- Follow `README.md` on a clean mental model (or fresh checkout) before marking docs done.
- Reject generated code that bypasses backend validation or hardcodes secrets.

### Testing
- Use `/write-tests` with explicit cases: valid transitions, invalid transitions, terminal states, role denials, mandatory remarks.
- Verify tests fail on bad input before accepting them as meaningful coverage.
- Record real output in `test-results.md`.

### Debugging
- Use `/debug` with the failing test output or error message; require root-cause explanation before applying a fix.
- Log each real issue in `debugging-notes.md` (problem, investigation, resolution).

### Code review
- Use `/review` on completed diffs for validation gaps, SQL injection risk, missing error handling, and N+1 queries.
- Record accepted vs. rejected suggestions with rationale in `code-review-notes.md`.

### Documentation
- Use `/document` to draft markdown from the current codebase; edit for accuracy.
- Write `reflection.md` and `final-ai-usage-summary.md` personally after the work is complete.

### Prompt history
- Log significant sessions in `ai-prompts/` (planning, design, implementation, testing, debugging, code review, documentation).
- Note what was accepted, changed, or rejected and why.

### Information not shared with AI
- Real credentials, API keys, or production connection strings (use `.env` locally only).
- Personal data beyond synthetic seed users.
- Unrelated proprietary code or context outside this assessment.

---

## Risks

| # | Risk | Impact |
|---|---|---|
| R1 | AI-generated code accepted without review | Bugs, validation gaps, or security issues in Core |
| R2 | Core work exceeds the 12-hour budget | Lifecycle artifacts rushed or incomplete |
| R3 | State-machine edge case missed | Invalid transitions accepted in production path |
| R4 | Prompt history reconstructed at the end | Weak evidence of iterative AI use |
| R5 | Secrets committed to the repository | Security failure; automatic disqualification on review |
| R6 | Scope creep from optional features | Time stolen from mandatory tests and documentation |
| R7 | Frontend and backend state-machine drift | UI offers transitions the API rejects |
| R8 | Documentation written before code stabilizes | `api-contract.md` / `data-model.md` out of sync with implementation |

---

## Mitigation

| Risk | Mitigation |
|---|---|
| R1 | Read every diff; run app and tests before each commit; manually test invalid transitions |
| R2 | Time-box phases; defer out-of-scope items (see Overview) rather than skipping artifacts |
| R3 | Integration test every row in the state-machine table; mirror rules in `state-machine.mdc` and shared helper |
| R4 | Log prompts in `ai-prompts/` after each session; use Cursor agent transcript search to recover history |
| R5 | Add `.env` to `.gitignore` in the first commit; use `.env.example` only; recheck before submission |
| R6 | Stick to Core acceptance criteria; cap optional polish (badges, diagram) to Phase 5–6 time |
| R7 | Share transition logic via `src/shared/stateMachine.js` (backend); keep frontend copy in sync after CJS/ESM resolution |
| R8 | Generate API and data-model docs from implemented routes and schema; verify against running tests |
