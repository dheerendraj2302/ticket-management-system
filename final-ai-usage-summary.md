# Final AI Usage Summary

## Overall Tool and Approach

**Tool:** Cursor (primary IDE for the entire lifecycle).

**Approach:** Set up persistent context first (`.cursor/rules/*.mdc` and `.cursor/commands/*.md`), then worked in small, scoped tasks from `tool-specific/cursor-workflow/tasks.md` — one `/implement` or `/write-tests` prompt per task, not a single “build everything” session. Used Plan mode and `/plan` for upfront requirement and design work; Agent mode for code generation. Every diff was read and run before accepting; significant sessions were logged in `ai-prompts/` with accepted/changed/rejected notes.

**Outcome:** Full-stack Support Ticket Management System — Express API, React UI, PostgreSQL, 93 backend tests (7 suites), lifecycle documentation artifacts. AI generated most of the boilerplate and test scaffolding; I steered business rules, rejected bad structure early (e.g. handlers in routers), and enforced review fixes before submission.

---

## Requirement Analysis

- Started with a planning prompt to read `acceptance-criteria.md`, `data-model.md`, `.cursor/rules/state-machine.mdc`, and empty skeleton docs — **ask clarifying questions instead of assuming**.
- AI asked three rounds of questions (stack, acting-user model, search scope, status API design, role permissions, remarks handling, delete policy).
- Produced `requirements-analysis.md`, `tool-specific/cursor-workflow/spec.md`, and phased `tasks.md`.
- **Key correction I made:** tightened the Close rule so creator/admin can only Close from `Resolved` (not from `Open` or `In Progress`) — AI updated all planning docs and test tasks accordingly.

---

## Planning & Design

- `/plan` filled `design-notes.md` from `spec.md`: architecture overview, frontend/backend/database design, validation and error-handling strategy. Mermaid state diagram kept as-is.
- AI drafted Validation, Error Handling, Testing, and Documentation sections in `acceptance-criteria.md` from spec and requirements (Core section left unchanged).
- `implementation-plan.md` written to time-box Core vs. lifecycle artifacts and document the AI usage plan.
- **What I kept control of:** scope boundaries (no auth, no User CRUD, no Docker/CI), role-based transition rules, and mandatory remarks on Resolved/Cancelled.

---

## Implementation

- **Backend (Tasks 1.1–2.12):** 16 `/implement` sessions — health check, DB layer, schema/seed, full REST API, pure state-machine helpers, centralized error handler. AI proposed layered structure (routes → controllers → validators → repositories); I enforced this after rejecting inline router handlers on Task 2.1.
- **Frontend (Tasks 4.1–4.5):** 5 `/implement` sessions — Vite scaffold, ticket list with search/filters, create form, detail with comments/edit, status dropdown with remarks.
- **Business-rule changes mid-build:** restricted ticket creation to customer/admin only; assignee must be an agent; agents cannot edit ticket fields (status transitions only). I directed these RU changes and had AI update backend, frontend, tests, and docs together.
- **Rejected patterns:** handlers in router files, client-only permission checks, toast library dependency, per-status buttons (switched to dropdown per my request).

---

## Testing

- **5 `/write-tests` sessions** for state-machine integration (valid/invalid transitions, permissions, remarks) and search/filter coverage.
- Tests updated during implementation when rules changed (agent create denied, non-agent assignee, agent PATCH denied).
- AI generated Supertest suites and helpers (`postJson`, `patchJson`, `assertRejectsInvalidTransition`); I verified they fail on bad input and pass against the real API.
- **Final run:** 93 tests, 7 suites, ~46 s (`test-results.md`). Jest configured with `maxWorkers: 1` after parallel test-DB race was diagnosed.

---

## Debugging

Three real issues, all logged in `debugging-notes.md`:

1. **Jest parallel workers vs. shared test DB** — `duplicate key` and `database does not exist` errors. AI diagnosed TOCTOU on `CREATE DATABASE`; fix was `"maxWorkers": 1` in Jest config (not application code).
2. **Stale backend process** — `assigneeName` missing in live API but tests passed. AI pointed to long-running `node index.js` without file watching; fix was restart, no code change.
3. **CJS/ESM state machine import** — frontend `@shared` import of CommonJS module failed in Vite. AI diagnosed interop limits; I chose separate frontend ESM copy mirroring backend rules (backend remains authoritative).

---

## Code Review

- **Entry 1:** `/review` on status endpoint only — found TOCTOU, missing tests, brittle error-code mapping. Review-only, no code changes.
- **Entry 2:** Full-diff `/review` → 7 Should Fix items. Directed AI to fix points 1–8: transactional `SELECT … FOR UPDATE`, reject client `status` on create, agent check on assignee, structured transition codes, max-length validation, zero-row update handling, expanded tests, shared state machine module.
- **Entry 3:** After shared-module frontend import failed, updated review docs; finding 8 revised to separate frontend ESM copy.
- Manual review findings 9–12 (router/controller separation, SQL style, explicit status codes, query-param validation) also addressed and logged in `review-fixes.md`.

---

## Documentation

- AI drafted `database/setup-notes.md`, `acceptance-criteria.md` sections, and later lifecycle docs via `/document` (`api-contract.md`, `data-model.md`, `ui-flow.md`, `README.md`, `pr-description.md`).
- Docs generated from **actual code** where possible so they stay accurate.
- `reflection.md` and parts of `tool-workflow.md` intended to be written personally (this summary synthesizes logged sessions).

---

## Biggest Win

**Persistent rules + scoped `/implement` tasks.** Putting the state machine, role transitions, and API conventions in `.cursor/rules/*.mdc` meant I rarely had to re-explain business rules in chat. One feature per prompt with a clear “done when” kept diffs reviewable and let me catch bad patterns early (e.g. rejecting router-inline handlers before they spread).

---

## Biggest Miss / Correction

**1. Assuming the shared CJS state machine could be imported in the Vite frontend.** Post-review fix #8 wired `@shared` alias; browser failed with `does not export named 'canTransition'`. Vite does not CJS-interop first-party source. Correction: standalone ESM copy in `src/frontend/src/utils/stateMachine.js` — UI-only; backend still enforces all rules. Should have validated `npm run build` immediately after the shared-module wiring.

**2. State-transition checks were thinner than they looked on first pass.** The initial `PATCH /api/tickets/:id/status` implementation validated `canTransition` then updated outside a locked read — a TOCTOU race if two requests hit the same ticket. `/review` also flagged brittle HTTP status selection via string-prefix matching on error messages, and missing integration coverage for `409`/`403`/`400` on the status endpoint. Corrections added in review fixes 1, 4, and 7:

- **`SELECT … FOR UPDATE`** on the ticket row inside a transaction, with **`canTransition` re-run** before the update (not just at the start of the request).
- **Structured transition codes** (`INVALID_TRANSITION` → `409`, `FORBIDDEN` → `403`) in `src/shared/stateMachine.js` instead of parsing error-message prefixes.
- **Mandatory remarks** for `Resolved`/`Cancelled` persisted as a Comment in the **same transaction** as the status update.
- **Integration tests** for all five valid transitions, every invalid base edge, terminal states, role denials, and remarks validation (`tests/tickets.test.js` Tasks 3.1–3.4).

The lesson: getting the state-machine *map* right early (via `.cursor/rules/state-machine.mdc`) was not enough — concurrency, status-code mapping, and test coverage for the status endpoint still needed a dedicated review pass before the transitions were truly safe to ship.

---

## Would I Reuse This Workflow in a Real Project?

**Yes, with the same guardrails:**

- `.cursor/rules/` for non-negotiable standards (state machines, API layering, test conventions).
- Slash commands as reusable prompt templates per lifecycle stage.
- Small scoped tasks with explicit acceptance criteria.
- Mandatory human review + test run before merge.
- Log prompt history for auditability on complex domains.

**I'd add:** CI running tests on push, a single source of truth for shared logic (ESM build step or code generation instead of duplicated frontend copy), and stricter “build must pass” gate after any cross-stack refactor.
