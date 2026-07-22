# Reflection

## What I Built

A support ticket app that looks simple on the surface — list, create, detail, comments — but whose real complexity lives in the status state machine and who is allowed to do what. Three seeded users (customer, agent, admin) switch roles from a header dropdown; there is no real login. The backend is the authority: Express + PostgreSQL, 93 Jest/Supertest tests, transactions on status changes. The React UI is a thin layer on top — search, filters, toasts, a status dropdown that only shows transitions the current user can actually perform.

The part I'm most satisfied with is not any single screen. It's that invalid transitions fail loudly (`409` with both statuses named), permission mistakes return `403` with a reason, and remarks on Resolve/Cancel land as real comments in the same DB transaction. That took more iteration than the CRUD endpoints did.

---

## How I Used AI (across the lifecycle)

I used Cursor for everything — planning, code, tests, debugging, review, and most of the markdown artifacts. But I did not use it as a "generate the app" button.

The pattern that worked: set up `.cursor/rules/` and slash commands first, break work into small tasks in `tasks.md`, then one `/implement` or `/write-tests` prompt per task. Plan mode for the fuzzy upfront stuff (requirements, design notes). Agent mode when I already knew what file I wanted changed.

I logged sessions in `ai-prompts/` as I went. That was useful at the end — I didn't have to reconstruct two weeks of chat from memory.

---

## What AI Helped With Most

**Boilerplate and repetition.** Schema SQL, repository layers, Supertest suites, validator scaffolding — the kind of work that is correct but tedious. Once I rejected the first `GET /api/users` implementation for putting logic in the router, AI consistently followed the routes → controllers → validators → repositories pattern for every endpoint after that.

**Keeping docs aligned with code.** Drafting `api-contract.md` and `data-model.md` from the actual routes and migration file saved real time. I still had to read them — AI once documented behavior that had already changed — but starting from code beat starting from a blank page.

**The rules files paid off more than I expected.** Putting the transition table in `state-machine.mdc` meant I stopped re-pasting the same rules into every status-related prompt. That alone was worth the twenty minutes setting up `.cursor/rules/`.

---

## What AI Got Wrong

**It moved fast on structure before I corrected it.** Task 2.1 put the users handler inline in the router. Fine for a spike; wrong for a codebase I was going to live in for a week. I rejected it immediately and asked for controller separation — that became `backend-api-conventions.mdc` and shaped the rest of the backend.

**The state machine looked "done" before it actually was.** First version of `PATCH /api/tickets/:id/status` checked `canTransition` and then updated — no row lock, no re-check inside the transaction. A `/review` pass caught the TOCTOU race, brittle error-message parsing for HTTP codes, and thin test coverage on the status endpoint. I had to direct a second pass: `SELECT … FOR UPDATE`, structured `INVALID_TRANSITION` / `FORBIDDEN` codes, remarks in the same transaction, and the full integration test matrix (Tasks 3.1–3.4).

**Shared code across frontend and backend.** Post-review, we wired `src/shared/stateMachine.js` into the frontend via a Vite `@shared` alias. Tests passed. `npm run build` passed. The browser did not — `canTransition` is not a named export because the shared file is CommonJS and Vite does not interop first-party CJS the way it does for `node_modules`. I ended up with a mirrored ESM copy in the frontend. Backend still enforces everything; the frontend copy is UX only. I should have opened the app right after that refactor instead of assuming green tests meant green UI.

**Planning assumptions I had to fix.** Early docs allowed creator/admin to Close from `Open` or `In Progress`. That felt wrong for a support workflow — you close after resolution, not to skip steps. I corrected that mid-planning; AI updated spec, tasks, and tests. Later, mid-build, I tightened create permissions (only customer/admin) and removed agent field-edit entirely. Each RU change meant touching backend, frontend, tests, and docs in the same session — easy to miss a layer if you're not deliberate.

---

## How I Validated AI Output

- Read every diff before accepting. Especially permission checks and SQL.
- Ran `npm test -- --runInBand --forceExit` after backend changes. Final count: 93 tests, 7 suites.
- Clicked through the UI with each acting user — create as customer, work as agent, close as creator.
- Manually tried bad transitions (Open → Resolved, Closed → anything) via the UI and curl.
- `npm run build` on the frontend after cross-stack changes — this is what caught the CJS/ESM issue.
- Followed my own `README.md` mentally for setup steps before calling docs "done".

When tests failed after Phase 2, my first instinct was that I'd broken the API. It was Jest running seven suites in parallel against one test database — `maxWorkers: 1` fixed it. When `assigneeName` was missing in the browser but tests passed, the fix was restarting `npm start` because I'd been running plain `node index.js` without a watcher. Both times AI helped me not rewrite working code.

---

## What I Would Improve Next

1. **CI from day one** — same test command on every push. I relied on manual runs.
2. **One shared state-machine artifact** — either an ESM build of `src/shared/` or a small codegen step — so frontend and backend cannot drift.
3. **Frontend tests** — even a few component tests for `StatusActions` and create-form validation. I trusted manual clicks; that does not scale.
4. **Run `npm run build` after every cross-boundary change** — not just at the end.
5. **Per-worker test databases** instead of `maxWorkers: 1` — serial tests are fine for 93 cases but slow as the suite grows.

If this were production, I'd also add real auth and drop the acting-user dropdown. For this exercise, the dropdown was the right tradeoff — it kept scope small while still forcing role-aware logic everywhere.

---

## Reusable Workflow (prompts, rules, specs, templates)

What I'd carry to the next project:

| Asset | Why keep it |
|-------|-------------|
| `.cursor/rules/*.mdc` | Domain rules that must not drift (state machine, API layering, test conventions) |
| `.cursor/commands/` (`/plan`, `/implement`, `/write-tests`, `/debug`, `/review`, `/document`) | Consistent prompts per lifecycle stage; version-controlled |
| `tasks.md` with "done when" per task | Stops one-shot "build everything" prompts |
| `ai-prompts/` log with accepted/changed/rejected | Audit trail for business-rule decisions |
| Review-before-submit habit | AI code often looks finished before it handles concurrency, edge cases, or cross-stack wiring |

The workflow I'd *not* reuse blindly: generating large markdown artifacts before the code stabilizes. `api-contract.md` was most accurate when drafted from implemented routes, not from the initial spec.

Bottom line: AI was fastest on scaffolding and slowest on judgment calls. The judgment calls — who can close a ticket, when remarks are mandatory, what happens under concurrent status updates — still needed a human in the loop. The rules files and small tasks made that loop manageable instead of exhausting.
