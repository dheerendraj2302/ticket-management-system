# Code Review Notes

## AI-Assisted Review Summary
_Output of the `/review` command against your diff._

Entry 2 (`ai-prompts/code-review.md`) reviewed the full implementation and applied fixes 1–8. Finding 8 originally called for deduplicating the state machine by sharing `src/shared/stateMachine.js` with the frontend via a Vite `@shared` alias. That wiring caused a runtime module error in the browser (see below); frontend validation was kept as a separate ESM copy in `src/frontend/src/utils/stateMachine.js` that mirrors the backend rules. Backend still uses `src/shared/stateMachine.js` via `src/backend/utils/stateMachine.js`. Manual review findings 9–12 were addressed afterward.

## My Review Observations

- Backend remains the source of truth for transition enforcement; the frontend copy is UI-only (permitted next statuses).
- `src/shared/stateMachine.js` is CommonJS (`module.exports`); the frontend is ESM (`"type": "module"` + Vite). Vite does not apply CJS→ESM interop to first-party source files, so `import { canTransition } from '@shared/stateMachine.js'` fails at runtime.

### Manual Review Findings (addressed)

These map to findings 9–12 in `review-fixes.md`.

9. **Separate controller from router.** Confirmed `routes/*.js` only maps paths to `asyncHandler(controller)`; request orchestration remains in `controllers/`.
10. **Remove unnecessary template literals for static queries.** Reviewed repository SQL: interpolation reserved for shared column lists and dynamic `WHERE`/`IN` clauses; static query style documented and accepted.
11. **Return proper status codes for readability.** All controller handlers use explicit `res.status(code)`; repositories use `HttpError` with explicit status for transition and not-found cases.
12. **Validate query parameters wherever necessary.** List endpoint uses `validateListTicketsQuery`; ticket `:id` routes use `validateTicketIdParam` before DB access.

## Changes Made After Review

Finding numbers match `review-fixes.md`.

| Finding | Original fix (Entry 2) | Current state | Status |
|---|---|---|---|
| 8 — duplicated state machine in frontend/backend | Shared `src/shared/stateMachine.js`; frontend imports via `@shared` alias | Frontend reverted to standalone ESM in `src/frontend/src/utils/stateMachine.js` (same rules, separate file). Shared module retained for backend only. | Done |
| 9 — controller vs router | Separate orchestration from routing | Routes are wiring-only; controllers own request flow | Done |
| 10 — static SQL template literals | Plain strings for static queries | Reviewed; templates kept only where interpolation is needed | Done |
| 11 — explicit status codes | Readable status at call sites | Explicit `res.status` / `HttpError` throughout | Done |
| 12 — query param validation | Validate wherever params are read | List query + ticket id param validators in place | Done |

**Browser error that triggered the change:** `Uncaught SyntaxError: The requested module '.../src/shared/stateMachine.js' does not provide an export named 'canTransition'`.

**Verification:** `cd src/frontend && npm run build` passes; base page loads without the console SyntaxError.

## Suggestions Rejected (and why)

- **Unifying frontend/backend on the shared module (post-review):** Rejected after hitting CJS/ESM interop limits in Vite for first-party `src/shared` files. Chose separate frontend validation copy instead of converting the shared module to ESM or adding Vite `commonjsOptions` for this assessment scope.

