# Spec (Cursor Plan Mode Output)

_Generated via Cursor's Plan Mode, then edited until it's something you'd actually build from._

## Feature: Support Ticket Management System

A role-aware support ticket workflow where seeded users (customer, agent, admin) create and manage tickets through a React UI backed by an Express API and Postgres. Acting identity is selected via dropdown (no real auth). Tickets move through a state machine with role-based transition rules and mandatory remarks on certain status changes. Keyword search spans title, description, and comments; list view filters by status and priority. No delete operations — full history is preserved.

---

## Data Model

### User (seed-only, no CRUD UI)

| Field | Type | Notes |
|---|---|---|
| `id` | integer (PK) | Auto-generated |
| `name` | string | Required |
| `email` | string | Required, unique |
| `role` | enum | `customer` \| `agent` \| `admin` |

### Ticket

| Field | Type | Notes |
|---|---|---|
| `id` | integer (PK) | Auto-generated |
| `title` | string | Required, non-empty |
| `description` | string | Required, non-empty |
| `priority` | enum | `Low` \| `Medium` \| `High`; default `Medium` |
| `status` | enum | `Open` \| `In Progress` \| `Resolved` \| `Closed` \| `Cancelled`; default `Open` |
| `assignedTo` | integer (FK → User) | Required, not nullable |
| `createdBy` | integer (FK → User) | Auto-set from acting user on create |
| `updatedBy` | integer (FK → User) | Auto-set from acting user on every update/status change |
| `createdAt` | timestamp | Auto-set on create |
| `updatedAt` | timestamp | Auto-set on every update/status change |

### Comment

| Field | Type | Notes |
|---|---|---|
| `id` | integer (PK) | Auto-generated |
| `ticketId` | integer (FK → Ticket) | Required |
| `message` | string | Required, non-empty |
| `createdBy` | integer (FK → User) | Auto-set from acting user |
| `createdAt` | timestamp | Auto-set on create |

### Relationships
- Ticket `assignedTo` → User
- Ticket `createdBy` → User
- Ticket `updatedBy` → User
- Comment `ticketId` → Ticket
- Comment `createdBy` → User

### Internal Enums (type-safe constants)

```javascript
// Status — stored and returned as human-readable strings
const STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const ROLE = {
  CUSTOMER: 'customer',
  AGENT: 'agent',
  ADMIN: 'admin',
};
```

---

## Status Transition Logic

### Layer 1 — Base State Machine

Encode as a single lookup map (`currentStatus → allowedNextStatuses[]`):

| Current | Allowed Next |
|---|---|
| Open | In Progress, Cancelled |
| In Progress | Resolved, Cancelled |
| Resolved | Closed |
| Closed | _(none — terminal)_ |
| Cancelled | _(none — terminal)_ |

> Note: `Open → Resolved` is **not** in the base map and is always rejected. `Resolved → Closed` is the only Close transition; role restrictions apply in Layer 2.

### Layer 2 — Role & Actor Rules

| Transition | Allowed Actor | Mandatory Remarks |
|---|---|---|
| Open → In Progress | `actingUserId === assignedTo` OR role is `admin` | No |
| In Progress → Resolved | `actingUserId === assignedTo` OR role is `admin` | **Yes** → persisted as Comment |
| Open → Cancelled | `actingUserId === createdBy` OR role is `admin` | **Yes** → persisted as Comment |
| In Progress → Cancelled | `actingUserId === createdBy` OR role is `admin` | **Yes** → persisted as Comment |
| Resolved → Closed | `actingUserId === createdBy` OR role is `admin` | No |

### Layer 3 — Remarks Validation

- If target status is `Resolved` or `Cancelled`: `remarks` field is required, must be non-empty after trim.
- On success: create a Comment with `message = remarks`, `createdBy = actingUserId`, `ticketId = ticket.id` in the same database transaction as the status update.
- If target status is `Closed` or `In Progress`: remarks are not required.

### Pure Functions (unit-testable in isolation)

1. `getAllowedNextStatuses(currentStatus)` — returns array from base map.
2. `requiresRemarks(targetStatus)` — returns `true` for `Resolved` and `Cancelled`.
3. `canTransition({ actor, ticket, targetStatus })` — combines base map check + role/actor rules; returns `{ allowed: boolean, reason?: string }`.

---

## API Contract

Base URL: `/api`
All request/response bodies: JSON.
Acting user is passed as `actingUserId` in the request body (create, update, status change, add comment).

### Standard Error Response

```json
{
  "error": "Human-readable error message"
}
```

| HTTP Status | When |
|---|---|
| 400 | Validation failure (missing fields, invalid enum, whitespace-only input) |
| 403 | Permission denied (role/ownership check failed) |
| 404 | Ticket or user not found |
| 409 | Invalid status transition |
| 500 | Unexpected server error |

---

### GET /api/users

**Purpose:** List all seeded users for UI dropdowns.

**Response 200:**
```json
[
  { "id": 1, "name": "Alice Customer", "email": "alice@example.com", "role": "customer" },
  { "id": 2, "name": "Bob Agent", "email": "bob@example.com", "role": "agent" }
]
```

---

### GET /api/tickets

**Purpose:** List tickets with optional search and filters.

**Query params (all optional):**
| Param | Type | Description |
|---|---|---|
| `search` | string | Case-insensitive substring match on title, description, or comment text |
| `status` | string | Exact status filter (e.g. `Open`) |
| `priority` | string | Exact priority filter (e.g. `High`) |

Params combine with AND logic.

**Response 200:** Each ticket includes `assigneeName` (the assigned user's display name) alongside `assignedTo`.
```json
[
  {
    "id": 1,
    "title": "Login broken",
    "description": "Cannot log in after password reset",
    "priority": "High",
    "status": "Open",
    "assignedTo": 2,
    "assigneeName": "Bob Agent",
    "createdBy": 1,
    "updatedBy": 1,
    "createdAt": "2026-07-21T10:00:00.000Z",
    "updatedAt": "2026-07-21T10:00:00.000Z"
  }
]
```

---

### POST /api/tickets

**Purpose:** Create a new ticket.

**Request:**
```json
{
  "title": "Login broken",
  "description": "Cannot log in after password reset",
  "priority": "High",
  "assignedTo": 2,
  "actingUserId": 1
}
```

**Validation:**
- `title` — required, non-empty after trim
- `description` — required, non-empty after trim
- `assignedTo` — required, must reference an existing user **with role `agent`** (only agents can be assignees → 400 otherwise)
- `priority` — optional; defaults to `Medium`; must be `Low`, `Medium`, or `High`
- `actingUserId` — required, must reference an existing user; must have role `customer` or `admin` (agents cannot create tickets → 403)
- `status` — always set to `Open` (not accepted from client)
- `createdBy`, `updatedBy` — set to `actingUserId`
- `createdAt`, `updatedAt` — set to current timestamp

**Response 201:** Created ticket object.

**Error responses:**
- `403` — acting user is an `agent` (only customers and admins can create tickets).
- `400` — `assignedTo` is not an `agent`.

---

### GET /api/tickets/:id

**Purpose:** Get ticket detail with comments.

**Response 200:** Includes `assigneeName` (the assigned user's display name) alongside `assignedTo`.
```json
{
  "id": 1,
  "title": "Login broken",
  "description": "Cannot log in after password reset",
  "priority": "High",
  "status": "Open",
  "assignedTo": 2,
  "assigneeName": "Bob Agent",
  "createdBy": 1,
  "updatedBy": 1,
  "createdAt": "2026-07-21T10:00:00.000Z",
  "updatedAt": "2026-07-21T10:00:00.000Z",
  "comments": [
    {
      "id": 1,
      "ticketId": 1,
      "message": "Investigating the issue",
      "createdBy": 2,
      "createdAt": "2026-07-21T11:00:00.000Z"
    }
  ]
}
```

**Response 404:** Ticket not found.

---

### PATCH /api/tickets/:id

**Purpose:** Update ticket fields or reassign. **Cannot change status.**

**Request:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "Low",
  "assignedTo": 3,
  "actingUserId": 2
}
```

All fields except `actingUserId` are optional (partial update).

**Validation:**
- Reject if request includes `status` field (status changes use dedicated endpoint).
- `assignedTo` — if provided, must reference an existing user; cannot be null.
- `priority` — if provided, must be valid enum value.
- `title`, `description` — if provided, must be non-empty after trim.
- `actingUserId` — required, must reference an existing user.
- Permission: customer may update only tickets they created; admin may update any ticket; agents may not update fields (403).
- `updatedBy` — set to `actingUserId`; `updatedAt` — set to current timestamp.

**Response 200:** Updated ticket object.
**Response 403:** Permission denied.
**Response 404:** Ticket or user not found.

---

### PATCH /api/tickets/:id/status

**Purpose:** Change ticket status with role and remarks validation.

**Request:**
```json
{
  "status": "In Progress",
  "actingUserId": 2,
  "remarks": "Starting investigation"
}
```

**Validation:**
- `status` — required, must be a valid status enum value different from current status.
- `actingUserId` — required, must reference an existing user.
- Base transition check via `getAllowedNextStatuses`.
- Role/actor check via `canTransition`.
- If `requiresRemarks(targetStatus)`: `remarks` required, non-empty after trim → create Comment in same transaction.
- Update `status`, `updatedBy`, `updatedAt`.

**Response 200:** Updated ticket object (with new status).
**Response 403:** Permission denied (with reason).
**Response 404:** Ticket or user not found.
**Response 409:** Invalid transition (message names current and attempted status).

**Example 409:**
```json
{
  "error": "Invalid transition from Open to Resolved"
}
```

---

### POST /api/tickets/:id/comments

**Purpose:** Add a standalone comment to a ticket.

**Request:**
```json
{
  "message": "Customer confirmed the fix works",
  "actingUserId": 1
}
```

**Validation:**
- `message` — required, non-empty after trim.
- `actingUserId` — required, must reference an existing user.
- Ticket must exist.

**Response 201:** Created comment object.

---

## Frontend Screens

### 1. Global Acting-User Selector (header)
- Dropdown populated from `GET /api/users`.
- Selected user persisted in React context (session-level).
- Drives `actingUserId` on all create, update, status-change, and comment requests.
- Display selected user's name and role.

### 2. Ticket List Page
- Table/cards showing all tickets (title, status badge, priority, assignee name, created date).
- **Search box** — debounced keyword search (title, description, comments).
- **Status filter** — dropdown (All, Open, In Progress, Resolved, Closed, Cancelled).
- **Priority filter** — dropdown (All, Low, Medium, High).
- Filters and search combine (AND); query params sent to `GET /api/tickets`.
- "Create Ticket" button navigates to create form; shown only when the acting user's role is `customer` or `admin` (hidden for agents).
- Row click navigates to detail view.

### 3. Create Ticket Form
- Fields: title (text), description (textarea), priority (dropdown, default Medium), assignee (dropdown listing only `agent` users).
- `actingUserId` from global context; only customer/admin acting users can reach this form.
- Client-side field validation shown inline below each input on blur (title, description, and assignee required).
- Submit → `POST /api/tickets`.
- Server validation errors and success messages are shown as toast notifications (not inline above the form).

### 4. Ticket Detail Page
- Display all ticket fields with status badge and priority.
- **Edit mode** — inline or form for title, description, priority, reassign (subject to role permission).
- **Comments thread** — chronological list of comments with author name and timestamp.
- **Add comment** — text input + submit → `POST /api/tickets/:id/comments`.
- **Status actions** — show only valid next statuses for the current acting user (computed client-side for UX, enforced server-side). When target status requires remarks, show a remarks textarea before confirming.
- Display server errors (permission denied, invalid transition, missing remarks) prominently.

### 5. Status Badges (creative touch)
- Color-coded CSS badges per status:
  - Open — blue
  - In Progress — yellow/amber
  - Resolved — green
  - Closed — gray
  - Cancelled — red

---

## Field-Edit Permission Matrix

| Role | Can view/update fields on |
|---|---|
| customer | Tickets they created (`createdBy === actingUserId`) |
| agent | None — agents cannot edit ticket fields (403) |
| admin | Any ticket |

Agents work tickets through status transitions only (`PATCH /api/tickets/:id/status`); they cannot edit fields via `PATCH /api/tickets/:id`. Status changes always go through `PATCH /api/tickets/:id/status`, not the general update endpoint.

## Ticket Creation Permissions

| Role | Can create tickets | Can be an assignee |
|---|---|---|
| customer | Yes | No |
| agent | No | Yes |
| admin | Yes | No |

Enforced on the backend: `POST /api/tickets` returns `403` when the acting user is an agent, and `400` when `assignedTo` does not reference an agent.

---

## Out of Scope

- Real authentication / protected routes
- User CRUD UI
- Delete endpoints (tickets or comments)
- Assignee filter (only status + priority filters)
- Pagination and sorting
- Docker / CI pipeline
- Swagger / OpenAPI auto-docs
- Email notifications
- File attachments

---

## Open Questions

None blocking implementation. Two documented assumptions for review:

1. **Remarks on Close** — transitions to `Closed` do not require mandatory remarks. Only `Resolved` and `Cancelled` do. Change before implementation if Close should also require remarks.
2. **Agent field-edit scope** — agents may view/update field-level data only on tickets assigned to them. If agents should have read-only access to all tickets, adjust before frontend build.
