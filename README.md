# Support Ticket Management System

A small full-stack support ticket app built for an AI capability exercise. Customers and admins create tickets; agents work them through a fixed status state machine.

## Stack

- **Frontend:** React 18 + Vite (`src/frontend/`)
- **Backend:** Node.js + Express (`src/backend/`)
- **Database:** PostgreSQL (`database/`)
- **Tests:** Jest + Supertest against a real test Postgres database (`tests/`)

## Prerequisites

- **Node.js** (LTS recommended)
- **PostgreSQL** installed and running (default port `5432`)
- **`psql`** on your PATH (to create the application database)

There is no Docker Compose or embedded database in this repo — you need a local Postgres server.

---

## Setup (clean checkout)

### 1. Clone and configure environment

From the repository root:

```bash
cp .env.example .env
```

Edit `.env` so `DATABASE_URL` matches your Postgres user, password, host, port, and database name.

### 2. Create the PostgreSQL database

The migration script expects the database in `DATABASE_URL` to already exist. Create it once:

```bash
psql -U postgres -c "CREATE DATABASE ticket_management;"
```

On some systems you may need `-h localhost` or a different `-U` user. Adjust to match your install.

The **test** database is created automatically by the test helper when you run `npm test`. You can optionally create it yourself:

```bash
psql -U postgres -c "CREATE DATABASE ticket_management_test;"
```

### 3. Install dependencies and initialize the database

```bash
cd src/backend
npm install
npm run migrate
npm run seed
```

- **`npm run migrate`** — applies `database/schema-or-migrations/*.sql` (tables, enums, indexes).
- **`npm run seed`** — loads `database/seed-data/seed.sql` (3 users, 5 tickets, 5 comments). Safe to re-run.

Expected migrate output: `Applied 1 migration(s): 001_initial_schema.sql`  
Expected seed output: `Applied 1 seed file(s): seed.sql`

### 4. Install frontend dependencies

In a new terminal, from the repo root:

```bash
cd src/frontend
npm install
```

---

## Environment variables

Copy from `.env.example` at the repo root. The backend loads this file from `src/backend/` via a relative path to the repo root.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | yes | Express listen port (default `4000`) |
| `DATABASE_URL` | yes | PostgreSQL connection string for the app |
| `TEST_DATABASE_URL` | no | Test DB connection string; defaults to app DB name + `_test` if omitted |

Example:

```
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/ticket_management
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/ticket_management_test
```

Never commit `.env` — it is listed in `.gitignore`.

---

## Running the app

Run **backend** and **frontend** in separate terminals.

### Backend API

```bash
cd src/backend
npm start
```

Server listens on `PORT` from `.env` (default `http://localhost:4000`).

Verify:

```bash
curl http://localhost:4000/health
```

Expected: `{"status":"ok"}`

Optional dev mode with auto-restart:

```bash
npm run dev
```

### Frontend UI

```bash
cd src/frontend
npm run dev
```

Vite serves the UI (default `http://localhost:5173`) and proxies `/api` requests to `http://localhost:4000`. The backend must be running for API calls to work.

Open the UI in your browser, pick an acting user from the header dropdown, and use the ticket list, create form, and detail view.

---

## Running tests

From `src/backend/` with Postgres running:

```bash
npm test -- --runInBand --forceExit
```

- **`--runInBand`** — runs tests serially to avoid races on test database setup/teardown.
- **`--forceExit`** — exits Jest cleanly if open handles remain after tests (observed with the `pg` pool).

Tests use `TEST_DATABASE_URL` (or derive `{DATABASE_URL}_test`), reset schema, and seed data per suite. See `test-results.md` for the latest recorded run.

---

## Resetting the database

Migrations are not tracked in a migrations table. Re-running `npm run migrate` on an existing schema will fail. To start fresh:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS ticket_management;"
psql -U postgres -c "CREATE DATABASE ticket_management;"
cd src/backend
npm run migrate
npm run seed
```

---

## Project structure

```
src/frontend/     React app (Vite)
src/backend/      Express API
src/shared/       Shared state machine (used by backend + frontend)
database/         Schema migrations, seed SQL, setup notes
tests/            Backend integration tests (Jest + Supertest)
```

## Further documentation

| Document | Contents |
|----------|----------|
| `api-contract.md` | REST endpoints, request/response shapes, errors |
| `data-model.md` | Tables, relationships, enums |
| `ui-flow.md` | Screens, navigation, role-gated UI |
| `database/setup-notes.md` | Detailed DB setup and persistence verification |
| `acceptance-criteria.md` | Feature checklist |

## Troubleshooting

- **`Missing required environment variable: DATABASE_URL`** — create `.env` at repo root from `.env.example`.
- **`database "ticket_management" does not exist`** — run the `CREATE DATABASE` step above.
- **Frontend API errors** — ensure the backend is running on port `4000` (or update `vite.config.js` proxy target).
- **Migration errors on re-run** — drop and recreate the database (see Resetting the database).
