# AI Prompts — Code Review

_Log real sessions as you go — don't reconstruct from memory at the end. Add one entry block per meaningful prompt/response exchange._

## Entry 1

**Prompt:** `/review PATCH /api/tickets/:id/status and the transition helper functions — check state machine enforcement, SQL injection, and error response shape.`

**AI Response Summary:** Reviewed `updateTicketStatus` controller, `canTransition`/`getAllowedNextStatuses`/`requiresRemarks` in `stateMachine.js`, validators, repositories, and tests. Found 0 Must Fix, 5 Should Fix, 6 Nitpick. State machine base map and role rules match `state-machine.mdc`; SQL uses parameterized queries (no injection risk found); error shape is consistent `{ error: "..." }`. Key gaps: no integration tests for `409`/`400`/`403` on the status endpoint; happy-path test does not verify remark/comment persistence; TOCTOU race (validate then update without row lock/re-read in transaction); no max length on `remarks`; `isInvalidTransitionReason()` relies on brittle string-prefix matching for status-code selection. No secrets found. No code changes made — review only.

**Accepted:** Review delivered as numbered findings (Must Fix / Should Fix / Nitpick); no code modifications from this session.

**Changed:**

**Rejected:**

**Why:**

## Entry 2

**Prompt:** `/review the full diff — backend validation, state machine, SQL safety, error handling, secrets, frontend not bypassing server rules, clean architecture.` Then: `Fix points 1 - 8 Ignore the rest, and run the integration test afterwards.`

**AI Response Summary:** First, reviewed the full implementation (no git commits yet — entire codebase). Found 0 Must Fix, 7 Should Fix, 5 Nitpick. Strengths: state machine map matches `state-machine.mdc`, parameterized SQL, backend permission enforcement, remarks-in-transaction, solid test coverage. Key Should Fix items: (1) TOCTOU on status transitions — validate-then-update outside a locked read; (2) `POST /api/tickets` silently ignores client `status`; (3) `PATCH` does not require `assignedTo` to be an agent; (4) HTTP status for transition errors via brittle `isInvalidTransitionReason()` string prefix; (5) no max-length validation before DB; (6) zero-row updates can 500; (7) test gaps; (8) duplicated state machine in frontend/backend. Then implemented fixes 1–8 only (ignored 9–12): shared `src/shared/stateMachine.js` with `TRANSITION_CODES`; repository `SELECT … FOR UPDATE` + re-validate inside transaction; reject `status` on create; agent check on PATCH `assignedTo`; max-length limits (title 255, text 10000); `HttpError(404)` on zero-row updates; new integration/unit tests; frontend imports shared module via `@shared` Vite alias. Ran `npm test -- --runInBand --forceExit` — **101 passed, 0 failed**.

**Accepted:** All eight review fixes landed as proposed: transactional status update with row lock and re-validation; `400` for client `status` on create; `assignedTo` agent enforcement on PATCH; structured `INVALID_TRANSITION` / `FORBIDDEN` codes replacing string-prefix status selection; max-length validation in ticket/comment validators; zero-row update handling; expanded tests (whitespace fields, create `status` rejection, non-existent `actingUserId`, PATCH non-agent assignee, remarks persisted on `Cancelled`, transition `code` in unit tests); shared state machine module wired to backend re-export and frontend.

**Changed:** None identified — implementation followed the review recommendations for items 1–8 without material deviation.

**Rejected:** Review nitpicks 9–12 left unfixed per instruction to ignore the rest: (9) no-op `PATCH` with only `actingUserId`; (10) redundant `try/catch` in controllers already wrapped by `asyncHandler`; (11) `api-contract.md` and `data-model.md` still empty/out of date; (12) no change to local `.env` handling (already gitignored).

**Why:** User scoped the follow-up to “Fix points 1–8” only; remaining items were nitpicks or documentation hygiene with no impact on core correctness, security, or acceptance-criteria behavior, so they were deliberately deferred.

## Entry 3

**Prompt:** Browser console error on the base page: `Uncaught SyntaxError: The requested module '.../src/shared/stateMachine.js' does not provide an export named 'canTransition'`. Then: `let's keep the validations separately for now` and `update the review docs as well after the above change`.

**AI Response Summary:** Diagnosed CJS/ESM mismatch: `src/shared/stateMachine.js` uses `module.exports` (backend CommonJS), while the frontend imported named exports via Vite's `@shared` alias. Vite does not apply CJS→ESM interop to first-party source files, so the browser saw no `canTransition` export. First attempted default import from shared module; production build still failed (`"default" is not exported`). Per user direction, reverted to separate validations: replaced `src/frontend/src/utils/stateMachine.js` with a standalone ESM implementation mirroring backend transition rules (`getAllowedNextStatuses`, `canTransition`, `requiresRemarks`, `getPermittedNextStatuses`). Left `src/shared/stateMachine.js` and backend re-export unchanged. Ran `npm run build` in `src/frontend` — passed. Updated review docs (`code-review-notes.md`, `review-fixes.md`, this file).

**Accepted:** Standalone frontend ESM state machine in `src/frontend/src/utils/stateMachine.js`; backend continues using shared CJS module; frontend build passes; review documentation updated to reflect finding 8 no longer uses `@shared` import.

**Changed:** Finding 8 fix deviated from Entry 2 — shared module is backend-only; frontend keeps a separate mirrored copy instead of `@shared` alias wiring.

**Rejected:** Converting `src/shared/stateMachine.js` to ESM or adding Vite `commonjsOptions` for the shared folder (deferred; user chose to keep validations separate).

**Why:** User explicitly asked to keep frontend/backend validations separate after the import failure; separate copy is the minimal fix within that constraint and backend still enforces all transitions server-side.

