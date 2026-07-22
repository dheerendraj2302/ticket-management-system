# Candidate Information

Name: Dheerendra Joshi  
Role: Senior Software Engineer  
Primary Technology Stack: Node.js, Express, React (Vite), PostgreSQL, Jest + Supertest  
Primary AI Tool Used: Cursor  
Project Option Selected: Support Ticket Management System (Backend-heavy)

Assessment Start Date: 15-Jul-2026  
Submission Date: 22-Jul-2026

## Project Summary

Built a full-stack support ticket management system where seeded users (customer, agent, admin) act on tickets via an `actingUserId` selector — no real authentication. The backend exposes a REST API with strict validation, role-based permissions, and a fixed ticket status state machine enforced in PostgreSQL-backed integration tests. The React frontend provides list/search/filter, create, detail, field edit, status transitions, and comments with toast-based feedback.

**Key deliverables:**
- Express API (`src/backend/`) — tickets, comments, users, health check
- React UI (`src/frontend/`) — three views (list, create, detail) with role-gated actions
- PostgreSQL schema + seed data (`database/`)
- 101 backend integration/unit tests (`tests/`)
- Documentation: `api-contract.md`, `data-model.md`, `ui-flow.md`, `README.md`, design/requirements artifacts

**Notable implementation details:**
- Status transitions use `src/shared/stateMachine.js` on the backend (with `SELECT … FOR UPDATE` inside transactions)
- Frontend mirrors transition rules in a separate ESM copy (`src/frontend/src/utils/stateMachine.js`) after a CJS/ESM import issue under Vite
- Post-review fixes documented in `review-fixes.md` (12 findings, all Done)

## Tools Used

| Tool | Purpose |
|------|---------|
| **Cursor** | Primary AI IDE — implementation, testing, debugging, code review, documentation via slash commands and project rules (`.cursor/rules/`) |
| **Node.js / npm** | Backend runtime and scripts (`start`, `migrate`, `seed`, `test`) |
| **Vite** | Frontend dev server and build; proxies `/api` to Express |
| **PostgreSQL** | Persistent data store; separate test database for Jest |
| **Jest + Supertest** | Backend API/integration tests against real Postgres |
| **Git** | Version control (assessment submission) |

## Setup Summary

From a clean checkout (see `README.md` for full steps):

1. `cp .env.example .env` and set `DATABASE_URL` / `PORT`
2. Create Postgres database: `psql -U postgres -c "CREATE DATABASE ticket_management;"`
3. Backend: `cd src/backend && npm install && npm run migrate && npm run seed && npm start`
4. Frontend: `cd src/frontend && npm install && npm run dev`
5. Tests: `cd src/backend && npm test -- --runInBand --forceExit` (101 tests, 7 suites — see `test-results.md`)

Health check: `curl http://localhost:4000/health` → `{"status":"ok"}`
