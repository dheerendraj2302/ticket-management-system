# AI Prompts — Planning

## Entry 1

**Prompt:** Build the Support Ticket Management System planning artifacts first — read `acceptance-criteria.md`, `data-model.md`, `.cursor/rules/state-machine.mdc`, `implementation-plan.md`, and the empty skeletons (`requirements-analysis.md`, `tool-specific/cursor-workflow/project-context.md`, `tool-specific/cursor-workflow/tasks.md`). Ask clarifying questions instead of assuming on business rules, stack, and scope. After answers, draft `requirements-analysis.md`, `tool-specific/cursor-workflow/spec.md`, and `tool-specific/cursor-workflow/tasks.md` as small, independently testable tasks in build order (schema first, frontend last). No implementation code. Later in the session: update the Close rule so the creator can only Close from `Resolved` (after the assignee resolves) — not from `Open` or `In Progress`.

**AI Response Summary:** Asked clarifying questions across three rounds (stack, acting-user model, priority values, search scope, status API design, assignee nullability, delete policy, scope boundaries, role permissions, remarks handling, required fields). Produced an initial plan and filled all three planning docs with role-aware transition rules, API contract, phased tasks, and assumptions. After the Close-rule change, produced a revision plan and updated all three docs: removed `Open → Closed` and `In Progress → Closed` as valid paths, kept only `Resolved → Closed` for creator/admin, aligned the base state machine with `state-machine.mdc`, and updated integration test tasks (5 valid paths, new 409 cases for premature Close, 403 for non-creator Close).

**Accepted:**
- Default stack: React/Vite, Express, Postgres, Jest + Supertest
- Acting user via seeded-user dropdowns (no auth)
- Roles: `customer`, `agent`, `admin` with different behavior
- Priority: `Low` / `Medium` / `High`, default `Medium`
- Required on create: `title`, `description`, `assignedTo`
- Auto-populated: `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- Keyword search across title, description, and comment text
- Filters: status + priority (scope extension beyond core)
- Assignee always required
- No delete for tickets or comments
- Dedicated `PATCH /api/tickets/:id/status` endpoint; general update cannot change status
- Mandatory remarks (persisted as Comment) for `Resolved` and `Cancelled` transitions
- `updatedBy` added to Ticket schema
- Five valid role-based transition paths in final docs
- Phased `tasks.md` build order: schema → backend → tests → frontend → docs sync
- Agent field-edit scope: agents only on assigned tickets; customers only on tickets they created; admin unrestricted

**Changed:**
- **Close rule tightened:** initial docs allowed creator/admin to Close from `Open`, `In Progress`, or `Resolved`; final docs restrict Close to `Resolved → Closed` only
- Invalid transitions updated: `Open → Closed` and `In Progress → Closed` are always 409 (not role-based 403)
- Integration test count reduced from 7 valid transition paths to 5
- `tasks.md` 3.2/3.3 updated with new invalid Close cases and `Resolved → Closed` permission failure test
