const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../src/backend/db');
const testDb = require('../src/backend/testDb');

describe('database connection module', () => {
  beforeAll(async () => {
    await testDb.setupTestDb();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('connects to the test database and runs a query', async () => {
    const result = await db.query('SELECT 1 AS value');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].value).toBe(1);
  });

  it('reset drops all tables in the public schema', async () => {
    await db.query('CREATE TABLE reset_check (id integer PRIMARY KEY)');

    let tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'reset_check'
    `);
    expect(tables.rowCount).toBe(1);

    await testDb.resetTestDb();

    tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'reset_check'
    `);
    expect(tables.rowCount).toBe(0);
  });

  it('recreates a clean test database via setup and teardown helpers', async () => {
    await testDb.disconnectTestDb();
    await testDb.setupTestDb();

    const result = await db.query('SELECT current_database() AS name');
    expect(result.rows[0].name).toBe(new URL(testDb.getTestDatabaseUrl()).pathname.replace(/^\//, ''));
  });
});
