const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../src/backend/db');
const migrate = require('../src/backend/migrate');
const testDb = require('../src/backend/testDb');

describe('database schema migrations', () => {
  beforeAll(async () => {
    await testDb.setupTestDb();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('applies SQL migration files from database/schema-or-migrations', async () => {
    const files = migrate.getMigrationFiles();

    expect(files).toContain('001_initial_schema.sql');
  });

  it('creates users, tickets, and comments tables', async () => {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      'comments',
      'tickets',
      'users',
    ]);
  });

  it('defines enum constraints for role, priority, and status', async () => {
    const enums = await db.query(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);

    const enumMap = enums.rows.reduce((acc, row) => {
      if (!acc[row.enum_name]) {
        acc[row.enum_name] = [];
      }
      acc[row.enum_name].push(row.enum_value);
      return acc;
    }, {});

    expect(enumMap.user_role).toEqual(['customer', 'agent', 'admin']);
    expect(enumMap.ticket_priority).toEqual(['Low', 'Medium', 'High']);
    expect(enumMap.ticket_status).toEqual([
      'Open',
      'In Progress',
      'Resolved',
      'Closed',
      'Cancelled',
    ]);
  });

  it('includes updated_by on tickets with foreign keys to users', async () => {
    const columns = await db.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tickets'
      ORDER BY ordinal_position
    `);

    expect(columns.rows.map((row) => row.column_name)).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'status',
      'assigned_to',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    ]);

    const updatedBy = columns.rows.find((row) => row.column_name === 'updated_by');
    expect(updatedBy.is_nullable).toBe('NO');

    const foreignKeys = await db.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'tickets'
      ORDER BY kcu.column_name
    `);

    expect(foreignKeys.rows).toEqual(
      expect.arrayContaining([
        { column_name: 'assigned_to', foreign_table_name: 'users' },
        { column_name: 'created_by', foreign_table_name: 'users' },
        { column_name: 'updated_by', foreign_table_name: 'users' },
      ])
    );
  });

  it('rejects invalid enum values at the database layer', async () => {
    await expect(
      db.query(
        `
          INSERT INTO users (name, email, role)
          VALUES ('Invalid Role User', 'invalid-role@example.com', 'superuser')
        `
      )
    ).rejects.toThrow(/invalid input value for enum user_role/);

    const user = await db.query(`
      INSERT INTO users (name, email, role)
      VALUES ('Schema Test User', 'schema-test@example.com', 'customer')
      RETURNING id
    `);

    const userId = user.rows[0].id;

    await expect(
      db.query(
        `
          INSERT INTO tickets (
            title,
            description,
            priority,
            status,
            assigned_to,
            created_by,
            updated_by
          )
          VALUES (
            'Test ticket',
            'Test description',
            'Urgent',
            'Open',
            $1,
            $1,
            $1
          )
        `,
        [userId]
      )
    ).rejects.toThrow(/invalid input value for enum ticket_priority/);
  });
});
