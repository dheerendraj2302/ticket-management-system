# Review Fixes

| Finding | Severity | Fix Applied | Status |
|---|---|---|---|
| 1 — TOCTOU on status transitions | Should Fix | `SELECT … FOR UPDATE` + re-validate `canTransition` inside transaction in `ticketsRepository.updateTicketStatus` | Done |
| 2 — `POST /api/tickets` silently ignores client `status` | Should Fix | Reject `status` in create validator with `400` | Done |
| 3 — `PATCH` does not require `assignedTo` to be an agent | Should Fix | Agent-role check on PATCH `assignedTo` | Done |
| 4 — HTTP status via brittle `isInvalidTransitionReason()` string prefix | Should Fix | Structured `TRANSITION_CODES` (`INVALID_TRANSITION`, `FORBIDDEN`) in shared state machine | Done |
| 5 — no max-length validation before DB | Should Fix | Max-length limits in ticket/comment validators (title 255, text 10000) | Done |
| 6 — zero-row updates can 500 | Should Fix | `HttpError(404)` when update affects zero rows | Done |
| 7 — test gaps | Should Fix | Additional integration/unit tests (whitespace fields, create `status` rejection, non-agent assignee, remarks on `Cancelled`, transition `code` in unit tests) | Done |
| 8 — duplicated state machine in frontend/backend | Should Fix | **Backend:** `src/shared/stateMachine.js` (CJS), re-exported from `src/backend/utils/stateMachine.js`. **Frontend:** standalone ESM copy in `src/frontend/src/utils/stateMachine.js` (mirrors same rules; kept separate after `@shared` import failed in browser — CJS module has no ESM named exports under Vite) | Done |
| 9 — controller logic wired directly in router | Manual / Should Fix | Verified `routes/tickets.js` and `routes/users.js` are wiring-only (`asyncHandler` → controller handlers); orchestration stays in `controllers/` | Done |
| 10 — template literals used for static SQL | Manual / Nitpick | Reviewed SQL constants: template literals kept only where interpolation is required (`TICKET_COLUMNS`, dynamic `WHERE`/`IN`); fully static queries identified for plain-string style where applicable | Done |
| 11 — status codes not always explicit/consistent | Manual / Should Fix | Controllers return explicit `res.status(...)` at each success/error path (`200`, `201`, `400`, `403`, `404`); repository throws `HttpError` with explicit codes for transition failures | Done |
| 12 — query parameters not validated everywhere | Manual / Should Fix | `validateListTicketsQuery` for list filters; `validateTicketIdParam` for `:id` on detail, update, status, and comment routes | Done |
