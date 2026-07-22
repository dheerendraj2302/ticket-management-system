# Tool Workflow

_Part A deliverable. Answers based on how the project was actually built — see `ai-prompts/` for session-level detail._

## Primary AI tool used

**Cursor** — used for requirement analysis, planning, implementation, testing, debugging, code review, and documentation across the full lifecycle. No secondary AI tools.

---

## How you provide project context to the tool

Context is layered so the agent does not need the full brief re-pasted each session:

**`.cursor/rules/` (persistent, version-controlled)**

| Rule file | When it applies | What it contains |
|-----------|-----------------|------------------|
| `project-overview.mdc` | Always | Stack (React/Vite, Express, Postgres, Jest), folder layout, coding conventions, scope limits |
| `state-machine.mdc` | Auto-attached to ticket/status files | Exact base transition table and terminal-state rules |
| `role-transitions.mdc` | Auto-attached to permission/transition files | Layer-2 role rules (assignee, creator, admin) |
| `testing-conventions.mdc` | Auto-attached to test files | Jest + Supertest, real test DB, naming, “done” criteria |
| `backend-api-conventions.mdc` | Added after Task 2.1 review | routes → controllers → validators → repositories layering, SQL constants, explicit status codes |

**`tool-specific/cursor-workflow/project-context.md`** — narrative summary of entities, constraints, and non-goals (stack pointer, state-machine intent, 8–12h Core budget).

**Task specs** — `spec.md` and `tasks.md` referenced in every `/implement` prompt so each session has a bounded scope and clear completion criteria.

**Why this works:** Business rules live in rules files the agent auto-loads; task files prevent scope drift; I only add chat context for one-off corrections or RU changes.

---

## How you use AI for requirement analysis

- Opened with a planning prompt: read existing artifacts (`acceptance-criteria.md`, `data-model.md`, state-machine rule) and **ask clarifying questions** before drafting.
- AI produced `requirements-analysis.md` after three Q&A rounds covering stack, acting-user model, search/filter scope, status endpoint design, role permissions, remarks, and delete policy.
- I corrected one major rule mid-session: Close only from `Resolved`, not from `Open`/`In Progress`. AI updated requirements, spec, tasks, and test expectations to match.
- Did not let AI silently assume — ambiguous business rules were resolved in chat first, then written into docs.

---

## How you use AI for planning and design

- **Plan mode / `/plan`** for `design-notes.md` (architecture, frontend screens, backend layering, DB schema summary, validation/error strategy). Confirmed defaults on four clarifying questions (read-unrestricted/write-restricted, comment permissions, priority filter in scope, condensed API table).
- AI drafted phased `tasks.md` (schema → backend → tests → frontend → docs) and expanded `acceptance-criteria.md` beyond Core into Validation, Error Handling, Testing, and Documentation checklists.
- `implementation-plan.md` captured milestones, AI usage plan, and risks — my document for time-boxing Core vs. artifacts.
- Mermaid state diagram in `design-notes.md` was pre-existing; AI filled prose sections around it without changing the diagram.

---

## How you use AI for code generation

- **Agent mode with `/implement`**, one task at a time from `tasks.md` (21 implementation entries in `ai-prompts/implementation.md`).
- Typical prompt shape: `/implement Task X.Y: <description>. Done when <verifiable outcome>.`
- Build order: backend infra → schema/seed → API endpoints → state-machine pure functions → status endpoint → frontend views.
- **Rejected early bad output:** Task 2.1 initially put handler logic in the router; I rejected that and asked for controller separation, which led to `backend-api-conventions.mdc` and the layered pattern used for all later endpoints.
- Mid-project RU changes (create permissions, agent field-edit denial) were explicit follow-up prompts; AI updated backend, frontend, tests, and docs in the same session.

---

## How you validate AI-generated code

- **Read every diff** before accepting — especially validators, permission checks, and SQL.
- **Run tests after backend changes:** `cd src/backend && npm test -- --runInBand --forceExit`.
- **Run the app manually** for frontend: acting-user switch, create/list/detail, invalid transitions, toast errors.
- **State machine:** manually tried invalid transitions via UI and curl; integration tests cover every row in the transition table.
- **Build check for frontend:** `cd src/frontend && npm run build` after cross-stack changes (caught the CJS/ESM shared-module failure).
- **Docs:** followed `README.md` and `database/setup-notes.md` steps mentally (or on clean checkout) before marking documentation done.
- Never committed `.env`; only `.env.example` in repo.

---

## How you use AI for testing

- **`/write-tests`** with explicit task IDs (3.1–3.5): valid transitions, invalid base transitions, permission denials, remarks validation, search/filter.
- Prompts included: follow `testing-conventions.mdc`, do not modify implementation, report expected failures.
- AI generated Supertest suites, setup helpers (`createOpenTicket`, `transitionStatus`), and shared assertion helpers.
- When business rules changed (agent cannot create, agent cannot PATCH fields), I updated tests in implementation sessions rather than separate `/write-tests` prompts — still logged in `ai-prompts/testing.md`.
- Recorded real output in `test-results.md` (93 passed, 7 suites, Jul 2026).

---

## How you use AI for debugging

- **`/debug`** with the actual error message and context (test output, browser console, network response).
- Instructed AI to **diagnose root cause before proposing fixes** — worked well for:
  - Jest parallel workers racing on test DB create/drop → `maxWorkers: 1`
  - Stale `npm start` process serving old code without `assigneeName` → restart server
  - Vite CJS/ESM import failure on shared state machine → separate frontend ESM copy
- Logged each issue in `debugging-notes.md` (Problem / Investigation / AI help / Validation / Fix).
- Rejected fixes that changed application logic when the issue was environmental (stale server) or tooling (Jest workers).

---

## How you use AI for code review

- **`/review`** on specific areas first (status endpoint + transition helpers), then full diff before submission.
- First review: findings only, no code changes (TOCTOU, test gaps, brittle error mapping identified).
- Second review: directed AI to **fix points 1–8** — transactional row lock, create `status` rejection, assignee agent check, structured transition codes, max-length validation, zero-row update handling, expanded tests, shared state machine.
- Findings 9–12 addressed in a manual follow-up (router wiring, SQL style, explicit status codes, query-param validation).
- Accepted/rejected suggestions recorded in `code-review-notes.md` and `review-fixes.md` (12 findings, all Done).
- Rejected unifying frontend/backend shared module after Vite build failed — kept separate ESM copy with backend as source of truth.

---

## What information you avoid sharing unnecessarily with AI tools

- **Credentials:** database passwords, API keys, tokens — use `.env` locally only; never paste into chat or commit.
- **Real personal data:** seed users are synthetic (Alice, Bob, Carol).
- **Unrelated proprietary code** or context outside this assessment.
- **Production connection strings** or deployment secrets (not applicable here, but same rule would apply).

---

## How you would reuse this workflow in a real project

1. **Invest upfront in `.cursor/rules/`** for domain rules that must never drift (state machines, authz, API contracts).
2. **Maintain `tasks.md` (or equivalent)** and implement one verifiable slice per agent session.
3. **Use slash commands** (`/plan`, `/implement`, `/write-tests`, `/debug`, `/review`, `/document`) as team-wide prompt templates — version-controlled in the repo.
4. **Require test + build pass** before accepting any AI diff; treat AI output as a draft PR, not finished code.
5. **Log significant prompts** in `ai-prompts/` or ticket comments for audit trail on business-rule decisions.
6. **Add CI** (missing here) to run the same test command on every push.
7. **Plan shared-code strategy early** for monorepos (CJS/ESM, package boundaries) to avoid duplicating business logic across frontend and backend.

This workflow scaled well for a backend-heavy exercise with a complex state machine. The main lesson: persistent context + small tasks + mandatory review beats large one-shot generation.
