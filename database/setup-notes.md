# Database Setup Notes

## Database Choice

PostgreSQL (client/server). The backend connects via `DATABASE_URL` using the `pg` driver. You need a running Postgres instance — there is no Docker Compose or embedded DB in this repo.

## Prerequisites

- **Node.js** (to run the backend scripts)
- **PostgreSQL** installed and running locally (default port `5432`)
- **`psql`** on your PATH (used below to create the database and verify rows)

## Environment Variables

Copy the example env file at the repo root and adjust credentials to match your Postgres install:

```bash
cp .env.example .env
```

Relevant variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `PORT` | Express listen port (default `4000`) |
| `DATABASE_URL` | Main app database connection string |
| `TEST_DATABASE_URL` | Optional; used by Jest integration tests (defaults to `{DATABASE_URL}_test` if omitted) |

Example `DATABASE_URL`:

```
postgresql://postgres:password@localhost:5432/ticket_management
```

Replace `postgres`, `password`, host, port, and database name with your real values.

## Setup Instructions

### 1. Create the database

The migration script expects the database named in `DATABASE_URL` to already exist. Create it once:

```bash
psql -U postgres -c "CREATE DATABASE ticket_management;"
```

If your Postgres user or host differs, adjust the command (or create the database through pgAdmin / another tool).

**Optional — test database** (only needed for `npm test`):

```bash
psql -U postgres -c "CREATE DATABASE ticket_management_test;"
```

### 2. Install backend dependencies

```bash
cd src/backend
npm install
```

### 3. Apply the schema

From `src/backend/`:

```bash
npm run migrate
```

This runs `src/backend/migrate.js`, which loads `.env` from the repo root and applies every `*.sql` file in `database/schema-or-migrations/` in sorted filename order.

Expected output:

```
Applied 1 migration(s): 001_initial_schema.sql
```

**Note:** Migrations are not tracked in a migrations table. Re-running `npm run migrate` on a database that already has the schema will fail (e.g. `type "user_role" already exists`). For a clean slate, drop and recreate the database (see [Resetting the database](#resetting-the-database)).

### 4. Load seed data

From `src/backend/`:

```bash
npm run seed
```

This runs `src/backend/seed.js`, which applies every `*.sql` file in `database/seed-data/` in sorted order.

Expected output:

```
Applied 1 seed file(s): seed.sql
```

The seed script is safe to re-run: it `TRUNCATE`s existing rows and re-inserts them.

## Schema / Migration Script

- **Directory:** `database/schema-or-migrations/`
- **Current file:** `001_initial_schema.sql`
- **Creates:** enum types (`user_role`, `ticket_priority`, `ticket_status`), tables `users`, `tickets` (with `updated_by`), `comments`, and indexes on `comments.ticket_id`, `tickets.status`, `tickets.priority`
- **Runner:** `npm run migrate` in `src/backend/`

## Seed Data

- **Directory:** `database/seed-data/`
- **Current file:** `seed.sql`
- **Inserts:** 3 users (customer, agent, admin), 5 tickets (one per status), 5 comments
- **Runner:** `npm run seed` in `src/backend/`

## Steps to Run Locally

From a fresh checkout, after Postgres is running:

```bash
# 1. Env (repo root)
cp .env.example .env
# Edit .env so DATABASE_URL matches your Postgres user/password/database name

# 2. Create empty database (once)
psql -U postgres -c "CREATE DATABASE ticket_management;"

# 3. Backend setup
cd src/backend
npm install
npm run migrate
npm run seed
npm start
```

The server listens on `PORT` from `.env` (default `4000`). Verify it is up:

```bash
curl http://localhost:4000/health
```

Expected response: `{"status":"ok"}`

At the time of writing, ticket/user API routes are not wired yet — use `psql` (below) to inspect seeded data.

## Verifying Persistence

Data lives in PostgreSQL, not in the Node process. Stopping and restarting the API server should not remove rows.

### 1. Confirm seeded data

With migrate + seed already run, query the database (use your real connection string from `.env`):

```bash
psql "postgresql://postgres:password@localhost:5432/ticket_management" -c "SELECT COUNT(*) AS user_count FROM users;"
psql "postgresql://postgres:password@localhost:5432/ticket_management" -c "SELECT id, title, status FROM tickets ORDER BY id;"
```

Expected: **3** users and **5** tickets (statuses: Open, In Progress, Resolved, Closed, Cancelled).

### 2. Stop the server

In the terminal where `npm start` is running, press `Ctrl+C`.

### 3. Restart the server

```bash
cd src/backend
npm start
```

### 4. Confirm data is still there

Re-run the same `psql` queries. Counts and ticket rows should be unchanged.

Optionally, restart the PostgreSQL service itself and query again — data should still persist because it is stored on disk by Postgres.

## Resetting the database

To wipe everything and start over:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS ticket_management;"
psql -U postgres -c "CREATE DATABASE ticket_management;"
cd src/backend
npm run migrate
npm run seed
```

## Running tests

Integration tests use a separate database (`TEST_DATABASE_URL` or `ticket_management_test`). The test helper creates/drops that database automatically; you only need the Postgres server running and `npm install` completed in `src/backend/`.

```bash
cd src/backend
npm test -- --runInBand
```

Use `--runInBand` so parallel test suites do not race on test database create/drop.

## Uncertainties / things to adjust locally

- **Postgres credentials:** `.env.example` uses `postgres` / `password` — change these to match your install.
- **`psql` authentication:** On some systems you may need `-h localhost`, a different `-U` user, or `PGPASSWORD=...` depending on `pg_hba.conf`.
- **No automated main-DB creation:** Only the test DB is created programmatically (`src/backend/testDb.js`). The main `ticket_management` database must be created manually (step 1 above).
- **Migration re-runs:** There is no “already applied” check; use drop/recreate for a clean schema re-apply.
