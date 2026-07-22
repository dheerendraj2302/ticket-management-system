# Requirement Analysis

## Selected Project Option
Support Ticket Management System (Backend-heavy)

## My Understanding (in your own words)

This is a small full-stack support ticket app for an AI capability exercise. Users are seeded in the database (no auth, no user CRUD UI). The UI lets an operator pick an acting user from a dropdown; that identity drives who creates tickets, who updates them, and who performs status transitions.

Tickets have title, description, priority, status, assignee, and audit fields. Comments can be added manually on a ticket detail view, and are also created automatically when a status transition requires mandatory remarks (Resolved or Cancelled).

Status changes are the core business rule: a base state machine governs valid transitions, extended by role-based rules. Customers may cancel only tickets they created (from Open or In Progress), and may close only tickets they created that have already been Resolved by the assignee; agents (assignees) may start work and resolve tickets assigned to them; admins may perform any allowed transition on any ticket. Invalid transitions, permission violations, and missing mandatory remarks are rejected by the backend with clear error messages.

The ticket list supports keyword search (title, description, comment text) and filters by status and priority. Tickets and comments cannot be deleted — history is preserved. Data persists in Postgres across server restarts.

## Functional Requirements

### 1. Tickets
- **Create** a ticket via the UI with required fields: `title`, `description`, `assignedTo`.
- **Default** `priority` to `Medium` when not specified; allow `Low`, `Medium`, `High`.
- **Auto-populate** `createdBy`, `updatedBy`, `createdAt`, `updatedAt` from the acting seeded user and current timestamp.
- **Default** new ticket `status` to `Open`.
- **List** all tickets from the database.
- **View** a single ticket detail including its comments.
- **Update** ticket fields (`title`, `description`, `priority`, `assignedTo`) and reassign — but **not** status via the general update endpoint.
- **No delete** — tickets are never removed.

### 2. Comments
- **Add** a standalone comment on a ticket detail view.
- **Auto-create** a comment when a status transition to `Resolved` or `Cancelled` is performed (mandatory remarks).
- Comments record `ticketId`, `message`, `createdBy`, `createdAt`.
- **No delete** — comments are never removed.

### 3. Status Changes
- Status changes use a **dedicated endpoint** (`PATCH /api/tickets/:id/status`), separate from field updates.
- Enforce the **base state machine** (see `.cursor/rules/state-machine.mdc`) plus **role-based rules** (creator/admin may Close only from `Resolved`, after the assignee has resolved the ticket).
- **Reject** invalid transitions with a 4xx response naming current status and attempted status.
- **Reject** transitions the acting user is not permitted to perform (role/ownership checks).
- **Require** non-empty remarks (persisted as a Comment) for transitions to `Resolved` and `Cancelled`.
- Terminal states (`Closed`, `Cancelled`) accept no further transitions.

### 4. Search & Filter
- **Keyword search** matches tickets where the term appears in title, description, or any linked comment text (case-insensitive substring).
- **Filter by status** — optional; omit to return all statuses.
- **Filter by priority** — optional; omit to return all priorities.
- Search and filters combine with **AND** logic.
- Return an empty list (200) when nothing matches.

### 5. Users
- Users are **seed-only** — no CRUD UI.
- Expose seeded users via API for dropdown population.
- Roles: `customer`, `agent`, `admin`.
- Acting user is selected in the UI and sent to the API on create, update, and status-change requests.

### 6. Persistence
- Store all data in **Postgres**.
- Data remains available after server restart.

## Non-Functional Requirements

- **Backend is source of truth** — all validation, state machine, and permission checks enforced server-side; frontend restrictions are UX only.
- **Clear error responses** — every failure returns a JSON body with a human-readable message and the correct HTTP status (4xx for client errors, 5xx for server errors). Status transition errors name current and attempted status; permission and remarks failures are explicit.
- **No secrets in repo** — credentials via `.env`; `.env.example` kept in sync.
- **Typed status/priority values** — human-readable display strings (`"In Progress"`) backed by internal enum/constants for type safety.
- **Testability** — at least one backend test per new feature; mandatory integration test tier for all valid and invalid state-machine transitions plus role/remarks cases.
- **Scope discipline** — core app targets ~8–12 focused hours; lifecycle artifacts are not sacrificed for extra features.

## Assumptions

- **No real authentication** — the acting user is client-declared via dropdown. This is an accepted exercise limitation; the API trusts `actingUserId` from the request body/header.
- **Single assignee** — each ticket has exactly one `assignedTo`; assignee is required at creation and cannot be cleared.
- **Search semantics** — case-insensitive substring match; no full-text ranking or pagination in v1.
- **No pagination or sorting** in v1 (beyond status and priority filters).
- **Schema extension** — `updatedBy` is added to the Ticket entity (not in the original `data-model.md` skeleton).
- **Remarks on Close** — transitions to `Closed` do **not** require mandatory remarks (only `Resolved` and `Cancelled` do). See Clarifications.
- **Agent field-edit scope** — agents may view/update field-level data only on tickets assigned to them; customers only on tickets they created; admin unrestricted. Status still changes only via the dedicated endpoint.
- **Admin audit** — when an admin performs an action, `actingUserId` is the admin's user ID.

## Clarifications (questions for a product owner)

All questions from the planning session are resolved:

| Topic | Decision |
|---|---|
| Stack | React/Vite, Express, Postgres, Jest + Supertest |
| Acting user (no auth) | Dropdowns from seeded users |
| Priority values | `Low`, `Medium`, `High`; default `Medium` |
| Required on create | `title`, `description`, `assignedTo` |
| Auto-populated fields | `createdBy`, `updatedBy`, `createdAt`, `updatedAt` |
| Search scope | Title, description, and comment text |
| Filters | Status (core) + priority (scope extension) |
| Assignee | Always required; not nullable |
| Delete policy | No delete for tickets or comments |
| Status API | Dedicated `PATCH /tickets/:id/status`; general update cannot change status |
| Status format | Human-readable display; internal enum/constants |
| Remarks | Mandatory Comment on transitions to `Resolved` or `Cancelled` |
| Roles | `customer`, `agent`, `admin` with behavior differences |
| Open → In Progress | Assigned user or admin only |
| In Progress → Resolved | Assigned user or admin; mandatory remarks |
| Creator Close | Creator or admin may Close only from `Resolved` (after assignee resolves) |
| Creator Cancel | Creator or admin may Cancel from `Open` or `In Progress`; mandatory remarks |
| Customer scope | Customer role may create tickets and close/cancel only tickets they created |
| `updatedBy` field | Add to Ticket schema |

### Role-Based Transition Matrix

| Transition | Allowed Actor | Mandatory Comment |
|---|---|---|
| Open → In Progress | Assigned user (`assignedTo`) or admin | No |
| In Progress → Resolved | Assigned user or admin | **Yes** |
| Open → Cancelled | Ticket creator (`createdBy`) or admin | **Yes** |
| In Progress → Cancelled | Creator or admin | **Yes** |
| Resolved → Closed | Creator or admin | No |
| Closed / Cancelled → anything | Nobody (terminal) | — |

**Invalid base transitions** (always rejected regardless of role): Open → Resolved, Open → Closed, In Progress → Closed, Resolved → Open, any transition out of Closed or Cancelled, and any path not listed above. **Permission failures** (valid transition path but wrong actor): Resolved → Closed by non-creator/non-admin → 403.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Invalid transition (e.g. Open → Resolved) | 4xx with message naming current and attempted status |
| Creator attempts Close from Open or In Progress | 409 — invalid transition (Close only allowed from Resolved) |
| Non-creator/non-admin attempts Resolved → Closed | 403 permission error |
| Non-assignee/non-admin attempts Open → In Progress | 4xx permission error |
| Non-assignee/non-admin attempts In Progress → Resolved | 4xx permission error |
| Customer attempts close/cancel on another user's ticket | 4xx permission error |
| Transition to Resolved or Cancelled without remarks | 4xx — remarks required |
| Empty or whitespace-only remarks when required | 4xx validation error |
| Transition on ticket in terminal state (Closed/Cancelled) | 4xx — no transitions allowed |
| Acting user ID not in seed data | 4xx — user not found |
| Create/update with missing required fields | 4xx validation error |
| Empty or whitespace title or description | 4xx validation error |
| Reassign to non-existent user ID | 4xx — user not found |
| Update ticket status via general PATCH endpoint | 4xx or silently ignore status field (spec: reject status change on general update) |
| Search with no matches | 200 with empty array |
| Combined status + priority + search filters with no matches | 200 with empty array |
| Ticket ID not found | 404 |
| Server/database failure | 5xx with generic error message (no stack trace leaked) |
