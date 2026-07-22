# AI Prompts — Design

## Entry 1

**Prompt:** `/plan` — Fill `design-notes.md` from `tool-specific/cursor-workflow/spec.md` (architecture overview, frontend/backend/database design, validation strategy, error handling strategy). Keep the existing Mermaid state machine block. No implementation code. Then: `use defaults` (in response to four clarifying questions about read vs write access, comment permissions, priority filter scope, and API detail depth).

**AI Response Summary:** Read `requirements-analysis.md`, `design-notes.md`, `spec.md`, and `.cursor/rules/`. Produced a structured plan with 8 discrete tasks, risks/edge cases, and explicit out-of-scope items. Asked four clarifying questions (read-unrestricted/write-restricted, any user can comment, priority filter in scope, condensed API summary + pointers). After defaults were confirmed, filled all empty sections of `design-notes.md`: architecture overview with ASCII diagram, frontend design (screens, navigation, UX rules), backend design (layering, endpoint table, permission matrix, 3-layer status pipeline), database design (tables, FKs, `updated_by`, indexes), validation strategy (backend/frontend/DB layers), error handling strategy (status code table + edge cases). Preserved the existing Mermaid block unchanged.

**Accepted:**
- Read-unrestricted, write-restricted access model
- Any valid acting user may comment on any ticket
- Priority filter included in frontend and API design
- Condensed endpoint summary in design-notes with pointers to `spec.md` / `api-contract.md`
- Three-layer status transition pipeline (base map → role/actor → remarks)
- Mandatory remarks only for `Resolved` and `Cancelled`; not for `Closed`
- Field-edit permission matrix (customer / agent / admin)
- Standard error shape `{ "error": "..." }` with 400/403/404/409/500 mapping
- Mermaid state machine block kept exactly as-is
- Testing strategy link left pointing to `test-strategy.md`

