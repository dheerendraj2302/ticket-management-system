# API Contract

Base URL: `http://localhost:4000` (or `PORT` from `.env`). All JSON request/response bodies use `Content-Type: application/json`.

## Conventions

### Acting user (no real auth)

Every mutating endpoint requires `actingUserId` in the request body — a positive integer referencing a seeded user. The API trusts this value (exercise limitation; no session or token).

### Error shape

All error responses:

```json
{ "error": "<human-readable message>" }
```

| Status | Meaning |
|--------|---------|
| `400` | Validation failure (missing/invalid field, bad enum, whitespace-only input, etc.) |
| `403` | Permission denied (role/actor rule) |
| `404` | Resource not found (ticket, user, or unknown route) |
| `409` | Invalid status transition (names current and attempted status) |
| `500` | Unexpected server/database failure (generic message; no stack trace) |

Malformed JSON body → `400` `{ "error": "Invalid JSON in request body" }`.  
Unknown route → `404` `{ "error": "Not found" }`.

### Shared enums

| Field | Valid values | Default |
|-------|--------------|---------|
| `priority` | `Low`, `Medium`, `High` | `Medium` (create only) |
| `status` | `Open`, `In Progress`, `Resolved`, `Closed`, `Cancelled` | `Open` (set server-side on create) |
| User `role` | `customer`, `agent`, `admin` | — |

### Field length limits

| Field | Max length |
|-------|------------|
| `title` | 255 characters |
| `description`, `message`, `remarks` | 10,000 characters |

Strings are trimmed before validation where noted below.

### Ticket object (camelCase)

List and detail responses include `assigneeName` (from a join). Create, update, and status-change responses return the ticket without `assigneeName`.

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
  "createdAt": "2026-07-22T10:00:00.000Z",
  "updatedAt": "2026-07-22T10:00:00.000Z"
}
```

### Comment object

```json
{
  "id": 1,
  "ticketId": 1,
  "message": "Investigating the login issue",
  "createdBy": 2,
  "createdAt": "2026-07-22T10:05:00.000Z"
}
```

Timestamps are ISO 8601 strings from Postgres `TIMESTAMPTZ`.

---

## Endpoint: Health check

**Method:** `GET`  
**Path:** `/health`  
**Purpose:** Verify the server is running.

### Request

No body or query parameters.

### Response

**`200 OK`**

```json
{ "status": "ok" }
```

### Validation Rules

None.

### Error Responses

None specific to this route (uses global handlers for unexpected failures).

---

## Endpoint: List users

**Method:** `GET`  
**Path:** `/api/users`  
**Purpose:** Return all seeded users (for acting-user selector in the UI).

### Request

No body or query parameters.

### Response

**`200 OK`** — array of users, ordered by `id`.

```json
[
  {
    "id": 1,
    "name": "Alice Customer",
    "email": "alice@example.com",
    "role": "customer"
  },
  {
    "id": 2,
    "name": "Bob Agent",
    "email": "bob@example.com",
    "role": "agent"
  },
  {
    "id": 3,
    "name": "Carol Admin",
    "email": "carol@example.com",
    "role": "admin"
  }
]
```

### Validation Rules

None.

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `500` | Database or unexpected failure | `{ "error": "Internal server error" }` |

---

## Endpoint: List tickets

**Method:** `GET`  
**Path:** `/api/tickets`  
**Purpose:** List tickets with optional keyword search and filters.

### Request

Query parameters (all optional):

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Case-insensitive substring match on `title`, `description`, or any comment `message` |
| `status` | string | Exact status filter |
| `priority` | string | Exact priority filter |

When multiple parameters are provided, they are combined with **AND** logic.

Example: `GET /api/tickets?search=billing&status=Open&priority=High`

### Response

**`200 OK`** — array of ticket objects (with `assigneeName`). Empty array when no matches.

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
    "createdAt": "2026-07-22T10:00:00.000Z",
    "updatedAt": "2026-07-22T10:00:00.000Z"
  }
]
```

### Validation Rules

- `search` — if present, must be a string (whitespace-only is ignored).
- `status` — if non-empty, must be a valid status enum.
- `priority` — if non-empty, must be a valid priority enum.

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `400` | Invalid `status` filter | `{ "error": "status must be one of: Open, In Progress, Resolved, Closed, Cancelled" }` |
| `400` | Invalid `priority` filter | `{ "error": "priority must be one of: Low, Medium, High" }` |
| `400` | Non-string `search` | `{ "error": "search must be a string" }` |
| `500` | Unexpected failure | `{ "error": "Internal server error" }` |

---

## Endpoint: Get ticket by ID

**Method:** `GET`  
**Path:** `/api/tickets/:id`  
**Purpose:** Return one ticket with nested comments.

### Request

Path parameter:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | positive integer | Ticket ID |

### Response

**`200 OK`** — ticket object plus `comments` array (ordered by comment `id`).

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
  "createdAt": "2026-07-22T10:00:00.000Z",
  "updatedAt": "2026-07-22T10:00:00.000Z",
  "comments": [
    {
      "id": 1,
      "ticketId": 1,
      "message": "Investigating the login issue and checking auth logs",
      "createdBy": 2,
      "createdAt": "2026-07-22T10:05:00.000Z"
    }
  ]
}
```

### Validation Rules

- `id` — must be a positive integer.

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `400` | Invalid `id` | `{ "error": "id must be a valid ticket id" }` |
| `404` | Ticket not found | `{ "error": "Ticket not found" }` |
| `500` | Unexpected failure | `{ "error": "Internal server error" }` |

---

## Endpoint: Create ticket

**Method:** `POST`  
**Path:** `/api/tickets`  
**Purpose:** Create a new ticket (always starts as `Open`).

### Request

```json
{
  "title": "Printer not working",
  "description": "Office printer on floor 2 is offline",
  "assignedTo": 2,
  "actingUserId": 1,
  "priority": "Medium"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `title` | yes | Non-empty after trim; max 255 characters |
| `description` | yes | Non-empty after trim; max 10,000 characters |
| `assignedTo` | yes | Positive integer; must reference an **agent** |
| `actingUserId` | yes | Positive integer; must reference an existing user |
| `priority` | no | Defaults to `Medium` |
| `status` | **not accepted** | Rejected if present in body |

### Response

**`201 Created`** — ticket object (no `assigneeName`).

```json
{
  "id": 6,
  "title": "Printer not working",
  "description": "Office printer on floor 2 is offline",
  "priority": "Medium",
  "status": "Open",
  "assignedTo": 2,
  "createdBy": 1,
  "updatedBy": 1,
  "createdAt": "2026-07-23T04:00:00.000Z",
  "updatedAt": "2026-07-23T04:00:00.000Z"
}
```

Server sets: `status` = `Open`, `createdBy` = `actingUserId`, `updatedBy` = `actingUserId`, `createdAt`, `updatedAt`.

### Validation Rules

- `status` must not appear in the request body.
- `title`, `description` — required, non-empty after trim; length limits apply.
- `assignedTo`, `actingUserId` — required positive integers.
- `priority` — if provided, must be `Low`, `Medium`, or `High`.
- **Permissions:** only `customer` and `admin` acting users may create tickets.
- **Assignee:** `assignedTo` must reference a user with role `agent`.

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `400` | Missing `title` | `{ "error": "title is required" }` |
| `400` | Whitespace-only `title` / `description` | `{ "error": "title is required" }` |
| `400` | Client supplied `status` | `{ "error": "status cannot be set on create" }` |
| `400` | Invalid `priority` | `{ "error": "priority must be one of: Low, Medium, High" }` |
| `400` | `assignedTo` not an agent | `{ "error": "assignedTo must reference an agent" }` |
| `400` | `assignedTo` user does not exist | `{ "error": "assignedTo does not reference an existing user" }` |
| `400` | Field too long | `{ "error": "title must be at most 255 characters" }` |
| `403` | Agent tries to create | `{ "error": "Only customers and admins can create tickets" }` |
| `404` | `actingUserId` not found | `{ "error": "actingUserId does not reference an existing user" }` |
| `500` | Unexpected failure | `{ "error": "Internal server error" }` |

---

## Endpoint: Update ticket fields

**Method:** `PATCH`  
**Path:** `/api/tickets/:id`  
**Purpose:** Partial update of ticket fields (not status).

### Request

```json
{
  "title": "Updated login issue",
  "description": "Updated description",
  "priority": "High",
  "assignedTo": 2,
  "actingUserId": 1
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `actingUserId` | yes | Positive integer |
| `title` | no | If provided, non-empty after trim; max 255 |
| `description` | no | If provided, non-empty after trim; max 10,000 |
| `priority` | no | Valid enum |
| `assignedTo` | no | Positive integer; must reference an **agent**; cannot be `null` |
| `status` | **not accepted** | Use `PATCH /api/tickets/:id/status` instead |

At least `actingUserId` is required; other fields are optional partial updates.

### Response

**`200 OK`** — updated ticket object (no `assigneeName`).

### Validation Rules

- `status` must not appear in the request body.
- Provided `title` / `description` must be non-empty after trim; length limits apply.
- `assignedTo` cannot be `null`.
- **Permissions:** `admin` may update any ticket; `customer` may update only tickets they created; `agent` cannot update fields.
- **Assignee:** if `assignedTo` is provided, must reference an existing **agent**.

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `400` | Invalid ticket `id` | `{ "error": "id must be a valid ticket id" }` |
| `400` | `status` in body | `{ "error": "status cannot be updated via this endpoint" }` |
| `400` | Whitespace-only `title` / `description` | `{ "error": "title must be non-empty" }` |
| `400` | `assignedTo` not an agent | `{ "error": "assignedTo must reference an agent" }` |
| `400` | `assignedTo` is null | `{ "error": "assignedTo cannot be null" }` |
| `403` | Insufficient permission | `{ "error": "You do not have permission to update this ticket" }` |
| `404` | Ticket not found | `{ "error": "Ticket not found" }` |
| `404` | `actingUserId` or `assignedTo` user not found | `{ "error": "actingUserId does not reference an existing user" }` |
| `500` | Unexpected failure | `{ "error": "Internal server error" }` |

---

## Endpoint: Update ticket status

**Method:** `PATCH`  
**Path:** `/api/tickets/:id/status`  
**Purpose:** Change ticket status via the state machine (exclusive endpoint for status changes).

### Request

```json
{
  "status": "In Progress",
  "actingUserId": 2,
  "remarks": "Optional or required depending on target status"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `status` | yes | Target status; must differ from current |
| `actingUserId` | yes | Positive integer |
| `remarks` | conditional | Required (non-empty after trim) when target is `Resolved` or `Cancelled`; optional otherwise — if provided and non-empty, persisted as a comment in the same transaction |

### Response

**`200 OK`** — updated ticket object (no `assigneeName`).

### State machine (valid transitions)

| From | Allowed to |
|------|------------|
| `Open` | `In Progress`, `Cancelled` |
| `In Progress` | `Resolved`, `Cancelled` |
| `Resolved` | `Closed` |
| `Closed` | _(none — terminal)_ |
| `Cancelled` | _(none — terminal)_ |

All other transitions are rejected with `409`.

### Role / actor rules (after base transition check)

| Transition | Allowed actors (non-admin) |
|------------|----------------------------|
| `Open` → `In Progress` | Assignee (`assignedTo`) |
| `In Progress` → `Resolved` | Assignee |
| `Open` → `Cancelled` | Creator (`createdBy`) |
| `In Progress` → `Cancelled` | Creator |
| `Resolved` → `Closed` | Creator |

`admin` may perform any **valid** base transition regardless of assignee/creator.

Status validation uses a row lock (`SELECT … FOR UPDATE`) inside a transaction and re-checks the transition against the current status before updating.

When remarks are required, they are stored as a new comment in the same database transaction as the status update.

### Validation Rules

- `status` — required; valid enum; must differ from current status.
- `remarks` — required and non-empty (after trim, max 10,000) for `Resolved` and `Cancelled`.
- `actingUserId` — required positive integer; must reference an existing user.

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `400` | Missing `status` | `{ "error": "status is required" }` |
| `400` | Missing/whitespace remarks for `Resolved` / `Cancelled` | `{ "error": "Remarks are required when resolving or cancelling a ticket" }` |
| `400` | Invalid enum / field | `{ "error": "status must be one of: Open, In Progress, Resolved, Closed, Cancelled" }` |
| `403` | Actor not permitted | `{ "error": "You do not have permission to perform this status transition" }` |
| `404` | Ticket or `actingUserId` not found | `{ "error": "Ticket not found" }` |
| `409` | Invalid or no-op transition | `{ "error": "Invalid transition from Open to Resolved" }` |
| `500` | Unexpected failure | `{ "error": "Internal server error" }` |

---

## Endpoint: Add comment

**Method:** `POST`  
**Path:** `/api/tickets/:id/comments`  
**Purpose:** Add a comment to a ticket.

### Request

```json
{
  "message": "Customer confirmed the fix works",
  "actingUserId": 1
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `message` | yes | Non-empty after trim; max 10,000 characters |
| `actingUserId` | yes | Positive integer; must reference an existing user |

### Response

**`201 Created`**

```json
{
  "id": 2,
  "ticketId": 1,
  "message": "Customer confirmed the fix works",
  "createdBy": 1,
  "createdAt": "2026-07-23T04:10:00.000Z"
}
```

### Validation Rules

- `message` — required, non-empty after trim; max 10,000 characters.
- `actingUserId` — required positive integer.
- Ticket must exist.
- **Note:** No role-based permission check on comments — any existing user may comment on any ticket. _(Unsure if this is intentional long-term; it matches current code.)_

### Error Responses

| Status | Condition | Example body |
|--------|-----------|----------------|
| `400` | Invalid ticket `id` | `{ "error": "id must be a valid ticket id" }` |
| `400` | Empty/whitespace `message` | `{ "error": "message is required" }` |
| `400` | Message too long | `{ "error": "message must be at most 10000 characters" }` |
| `404` | Ticket not found | `{ "error": "Ticket not found" }` |
| `404` | `actingUserId` not found | `{ "error": "actingUserId does not reference an existing user" }` |
| `500` | Unexpected failure | `{ "error": "Internal server error" }` |

---

## Uncertainties

- **Comment permissions:** Any seeded user can comment on any ticket; there is no creator/assignee/admin gate in the controller.
- **`assigneeName` inconsistency:** Present on list/detail responses only; absent on create, field-update, and status-update responses (depends on whether the repository query joins `users`).
- **Optional `remarks` on non-terminal transitions:** If provided and non-empty for transitions that do not require remarks (e.g. `Open` → `In Progress`), the server persists them as a comment — behavior is implemented but not surfaced in the UI.
