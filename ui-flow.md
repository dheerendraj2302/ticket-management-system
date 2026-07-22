# UI Flow

Single-page React app (`src/frontend/`) with three views managed by local state in `App.jsx` — no URL routing. The header (title + acting-user selector) is always visible; the main area switches between list, create, and detail.

---

## Screens

### 1. Ticket list (default view)

**Component:** `TicketList.jsx`  
**Shown when:** `view === 'list'`

**Toolbar (above list):**
- **Create Ticket** button — visible only when the acting user is `customer` or `admin` (see Role-gated actions).
- **Search** — text input; debounced 300 ms; searches title, description, and comments via `GET /api/tickets?search=…`.
- **Status** filter — dropdown with “All” plus every ticket status.
- **Priority** filter — dropdown with “All” plus `Low`, `Medium`, `High`.

**Table columns:** Title, Status (badge), Priority, Assignee, Created date.

**States:**
- Loading → “Loading tickets…”
- Error → inline red message below filters
- Empty → “No tickets found.”
- Data → clickable rows open ticket detail

---

### 2. Create ticket

**Component:** `CreateTicketForm.jsx`  
**Shown when:** `view === 'create'` (only reachable if acting user can create tickets)

**Form fields:**

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| Title | text input | yes | Inline validation on blur |
| Description | textarea | yes | Inline validation on blur |
| Priority | select | no | Defaults to `Medium` |
| Assignee | select | yes | Lists **agents only**; inline validation on blur |

**Actions:**
- **Create Ticket** — submits to `POST /api/tickets` with `actingUserId`
- **Back to list** — returns to list without saving

**On success:** success toast, navigate back to list, list refreshes.

---

### 3. Ticket detail

**Component:** `TicketDetail.jsx`  
**Shown when:** `view === 'detail'` and a ticket id is selected

**Read-only summary card:**
- Title + status badge
- Priority, assignee name, created by, created date, last updated

**Status actions card** (`StatusActions.jsx`):
- Shown only when the acting user has at least one permitted next status (see Role-gated actions).
- Status dropdown (permitted targets only)
- Remarks textarea — appears when selected target is `Resolved` or `Cancelled`
- **Update status** button

**Comments card:**
- Thread of existing comments (author name, timestamp, message)
- **Add comment** textarea + **Post comment** button (available to all acting users)

**Edit ticket card:**
- Shown only when `canUpdateTicketFields` allows (see Role-gated actions).
- Fields: title, description, priority, assignee (agents only in dropdown)
- **Save changes** button

**Actions:**
- **Back to list** — returns to list and refreshes ticket data

**States:**
- Loading → “Loading ticket…”
- Error / not found → inline error + back button
- Loaded → full layout above

---

## Navigation

```
┌─────────────────────────────────────────────────────────┐
│  Header: "Support Ticket Management"  [Acting as ▼]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LIST VIEW (default)                                    │
│    [Create Ticket]*  →  CREATE VIEW                     │
│    click row         →  DETAIL VIEW                     │
│                                                         │
│  CREATE VIEW                                            │
│    Back to list      →  LIST VIEW                       │
│    success           →  LIST VIEW (refreshed)             │
│                                                         │
│  DETAIL VIEW                                            │
│    Back to list      →  LIST VIEW (refreshed)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
* Create Ticket button hidden for agent acting user
```

| From | Action | To |
|------|--------|-----|
| List | Click **Create Ticket** | Create (if allowed) |
| List | Click table row | Detail for that ticket |
| Create | **Back to list** or successful create | List |
| Detail | **Back to list** | List |
| Any | Change acting user to agent while on Create | Redirected to List (`useEffect` in `App.jsx`) |

Acting user is selected in the header via `ActingUserSelector` and applies globally to all API calls in the session. On first load, users are fetched from `GET /api/users`; the first user in the response is selected by default.

---

## Key Interactions

### Acting user selector

- Loads all seeded users on app mount.
- Dropdown label format: `Name (role)`.
- Selection is stored in `ActingUserContext` and sent as `actingUserId` on every mutating request.
- Not persisted across page reloads.

### Create ticket

1. Customer or admin opens create form.
2. Fills title, description, priority, assignee.
3. Client validates required fields on blur and on submit.
4. Server may reject (e.g. agent acting user) → error toast with API message.

### View ticket list (search + filters)

1. List loads on mount and whenever debounced search, status, or priority changes.
2. Filters combine with AND logic (server-side).
3. Click a row to open detail.

### View ticket detail + comments

1. Detail loads ticket + nested comments.
2. Comment thread is read-only except for the add-comment form at the bottom.

### Update ticket fields / reassign

1. Available only when edit card is visible (permission check).
2. Submit sends all edit fields to `PATCH /api/tickets/:id`.
3. No client-side inline validation on edit fields — server errors surface via toast.
4. Assignee dropdown lists agents only.

### Change status

1. `StatusActions` computes permitted next statuses from shared state machine + role rules.
2. User picks target status; remarks field appears for `Resolved` / `Cancelled`.
3. Client blocks submit if no status selected or required remarks are empty (toast).
4. On success, detail reloads (comments may include new remarks comment).

### Add comment

1. Any acting user can post a comment on any ticket.
2. Empty message blocked client-side with error toast.
3. On success, comment list reloads and textarea clears.

---

## Role-gated actions

UI restrictions mirror backend rules but are **not** a security boundary — the API enforces permissions independently.

| Action | Customer | Agent | Admin |
|--------|----------|-------|-------|
| See ticket list & detail | yes | yes | yes |
| **Create ticket** (button + form) | yes | **hidden** | yes |
| **Edit ticket** form | own tickets only | **hidden** | any ticket |
| **Status actions** | per transition rules* | per transition rules* | any valid transition |
| Add comment | yes | yes | yes |

\*Status dropdown shows only transitions allowed by `getPermittedNextStatuses` in `src/frontend/src/utils/stateMachine.js` (shared rules with backend):

| Transition | Shown when acting user is… |
|------------|----------------------------|
| Open → In Progress | assignee or admin |
| In Progress → Resolved | assignee or admin |
| Open / In Progress → Cancelled | ticket creator or admin |
| Resolved → Closed | ticket creator or admin |

If no transitions are permitted (e.g. terminal `Closed` / `Cancelled`, or wrong actor), the **Status actions** card is not rendered.

Assignee dropdowns (create + edit) filter to users with role `agent` via `isAssignableUser`.

---

## Error and feedback display

### Toast notifications (`ToastContext` + `Toaster.jsx`)

Global overlay (`aria-live="polite"`). Used for mutation outcomes:

| Type | When | Example message |
|------|------|-----------------|
| Success | Create, update, status change, comment | “Ticket created successfully.” |
| Error | API failure or client validation on mutations | Server `{ "error": "…" }` message |

- Auto-dismiss after **4 seconds**; user can dismiss early with ×.
- API errors use `body.error` from the JSON response (`api/client.js`).

### Inline errors (screen-specific)

| Location | When | Display |
|----------|------|---------|
| Acting user selector | `GET /api/users` fails | Red text in header: error message |
| Ticket list | `GET /api/tickets` fails | `.ticket-list__error` paragraph; table cleared |
| Ticket detail | `GET /api/tickets/:id` fails | `.ticket-detail__error` paragraph + back button |
| Create ticket form | Blur/submit validation | `.form-field__error` below title, description, or assignee |

### What is not validated inline in the UI

- **Edit ticket** form — no blur validation; whitespace-only title/description sent to server; errors returned as toasts.
- **Comment** form — only empty-check via toast before submit (no field-level inline message).
- **Status remarks** — empty required remarks blocked via toast, not inline field error.

### Loading states

- Acting users: “Loading users…”
- Ticket list: “Loading tickets…”
- Ticket detail: “Loading ticket…”
- Submit buttons show in-progress label (“Creating…”, “Saving…”, “Updating…”, “Posting…”) and disable inputs while submitting.

---

## Uncertainties

- **No URL routing:** Refreshing the browser returns to the list view; deep links to a ticket are not supported.
- **Acting user default:** First user returned by the API (typically id 1, Alice Customer) — order depends on `ORDER BY id` in the backend.
- **Comments:** No role gate in the UI; any acting user can comment on any ticket, matching the API.
