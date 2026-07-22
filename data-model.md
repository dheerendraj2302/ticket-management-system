# Data Model

PostgreSQL schema defined in `database/schema-or-migrations/001_initial_schema.sql`. Seed data in `database/seed-data/seed.sql`.

The API returns camelCase field names; the database uses snake_case. Mapping is noted per entity below.

---

## Entities

### User (seed-only, no CRUD UI)

Represents a person who can act on tickets. Users are inserted via seed script only — there is no create/update/delete API or UI for users.

| DB column | API field | Type | Constraints |
|-----------|-----------|------|-------------|
| `id` | `id` | `SERIAL` | Primary key |
| `name` | `name` | `VARCHAR(255)` | NOT NULL |
| `email` | `email` | `VARCHAR(255)` | NOT NULL, UNIQUE |
| `role` | `role` | `user_role` enum | NOT NULL |

**`user_role` enum:** `customer`, `agent`, `admin`

**Seeded users** (`seed.sql`):

| id | name | email | role |
|----|------|-------|------|
| 1 | Alice Customer | alice@example.com | customer |
| 2 | Bob Agent | bob@example.com | agent |
| 3 | Carol Admin | carol@example.com | admin |

---

### Ticket

Core support request record.

| DB column | API field | Type | Constraints |
|-----------|-----------|------|-------------|
| `id` | `id` | `SERIAL` | Primary key |
| `title` | `title` | `VARCHAR(255)` | NOT NULL |
| `description` | `description` | `TEXT` | NOT NULL |
| `priority` | `priority` | `ticket_priority` enum | NOT NULL, default `Medium` |
| `status` | `status` | `ticket_status` enum | NOT NULL, default `Open` |
| `assigned_to` | `assignedTo` | `INTEGER` | NOT NULL, FK → `users(id)` |
| `created_by` | `createdBy` | `INTEGER` | NOT NULL, FK → `users(id)` |
| `updated_by` | `updatedBy` | `INTEGER` | NOT NULL, FK → `users(id)` |
| `created_at` | `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |
| `updated_at` | `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |

**`ticket_priority` enum:** `Low`, `Medium`, `High`

**`ticket_status` enum:** `Open`, `In Progress`, `Resolved`, `Closed`, `Cancelled`

**API-only field:** `assigneeName` — not stored on `tickets`; joined from `users.name` on list/detail queries where the assignee is loaded.

**Application rules (not enforced by DB constraints):**

- On create, `status` is always set to `Open` server-side; clients cannot supply a different initial status.
- `assigned_to` must reference a user with role `agent` (validated in the API).
- `created_by` and `updated_by` are set from `actingUserId` on create; `updated_by` and `updated_at` are refreshed on field updates and status changes.
- Valid status transitions are enforced in application code (see `src/shared/stateMachine.js`), not by database triggers.

---

### Comment

Text note attached to a ticket. Comments are also created automatically when a status transition to `Resolved` or `Cancelled` includes mandatory remarks.

| DB column | API field | Type | Constraints |
|-----------|-----------|------|-------------|
| `id` | `id` | `SERIAL` | Primary key |
| `ticket_id` | `ticketId` | `INTEGER` | NOT NULL, FK → `tickets(id)` |
| `message` | `message` | `TEXT` | NOT NULL |
| `created_by` | `createdBy` | `INTEGER` | NOT NULL, FK → `users(id)` |
| `created_at` | `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |

There is no `updated_at` on comments — comments are immutable after insert.

---

## Relationships

```
users ──┬──< tickets.assigned_to   (many tickets → one assignee user)
        ├──< tickets.created_by    (many tickets → one creator user)
        ├──< tickets.updated_by    (many tickets → one last-updater user)
        └──< comments.created_by   (many comments → one author user)

tickets ──< comments.ticket_id      (one ticket → many comments)
```

| Relationship | Cardinality | FK column | Notes |
|--------------|-------------|-----------|-------|
| User → Ticket (assignee) | 1:N | `tickets.assigned_to` | Assignee is always an agent in app logic |
| User → Ticket (creator) | 1:N | `tickets.created_by` | Typically the customer who opened the ticket |
| User → Ticket (last updater) | 1:N | `tickets.updated_by` | Set on every field or status mutation |
| Ticket → Comment | 1:N | `comments.ticket_id` | Ordered by `comments.id` in API responses |
| User → Comment (author) | 1:N | `comments.created_by` | May differ from ticket creator or assignee |

**Referential integrity:** All foreign keys reference `users(id)` or `tickets(id)`. The schema does not define `ON DELETE CASCADE` — deleting a user or ticket would fail if dependent rows exist. _(No delete APIs are implemented.)_

---

## Schema Notes

### Migration

- **File:** `database/schema-or-migrations/001_initial_schema.sql`
- **Run via:** `npm run migrate` from `src/backend/` (applies all `.sql` files in that folder in sorted order).
- **Idempotency:** The migration is not idempotent on its own — re-running against an existing schema will error. Use `database/setup-notes.md` for reset instructions.

### PostgreSQL enums

Three custom enums are created before tables:

1. `user_role` — `customer`, `agent`, `admin`
2. `ticket_priority` — `Low`, `Medium`, `High`
3. `ticket_status` — `Open`, `In Progress`, `Resolved`, `Closed`, `Cancelled`

Enum labels match the API and `src/backend/utils/tickets.js` constants exactly (including spaces in `In Progress`).

### Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `idx_comments_ticket_id` | `comments` | `ticket_id` | Fast lookup of comments per ticket |
| `idx_tickets_status` | `tickets` | `status` | Status filter on list endpoint |
| `idx_tickets_priority` | `tickets` | `priority` | Priority filter on list endpoint |

`users.email` has a unique constraint (implicit index).

### Defaults and timestamps

- New tickets default to `priority = Medium`, `status = Open`, `created_at = NOW()`, `updated_at = NOW()`.
- New comments default to `created_at = NOW()`.
- `updated_at` on tickets is set explicitly to `NOW()` in update queries (not a database trigger).

### Seed data

- **File:** `database/seed-data/seed.sql`
- **Run via:** `npm run seed` from `src/backend/`
- Truncates `comments`, `tickets`, and `users` with `RESTART IDENTITY CASCADE`, then inserts 3 users, 5 tickets (one per status), and 5 comments.
- Safe to re-run after migrate to restore a known baseline.

### API ↔ database mapping

Repositories map rows with `mapTicketRow` / `mapCommentRow` in `src/backend/utils/`. List and detail ticket queries join `users` on `assigned_to` to populate `assigneeName` in JSON responses.

### Uncertainties

- **`assigned_to` role:** The database allows any `users.id` as assignee; only the API enforces that the assignee must be an `agent`.
- **Comment on status remarks:** Remarks for `Resolved` / `Cancelled` transitions are stored as ordinary `comments` rows — there is no separate column or type distinguishing them from user-posted comments.
