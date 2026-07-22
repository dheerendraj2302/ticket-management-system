const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../src/backend/db');
const seed = require('../src/backend/seed');
const testDb = require('../src/backend/testDb');

describe('database seed script', () => {
  beforeAll(async () => {
    await testDb.setupTestDb();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('loads seed SQL files from database/seed-data', async () => {
    const files = seed.getSeedFiles();

    expect(files).toContain('seed.sql');
  });

  it('seeds at least one user per role', async () => {
    await seed.runSeed();

    const users = await db.query(`
      SELECT name, email, role
      FROM users
      ORDER BY id
    `);

    expect(users.rows).toEqual([
      {
        name: 'Alice Customer',
        email: 'alice@example.com',
        role: 'customer',
      },
      {
        name: 'Bob Agent',
        email: 'bob@example.com',
        role: 'agent',
      },
      {
        name: 'Carol Admin',
        email: 'carol@example.com',
        role: 'admin',
      },
    ]);
  });

  it('seeds tickets in every status', async () => {
    const tickets = await db.query(`
      SELECT status
      FROM tickets
      ORDER BY id
    `);

    expect(tickets.rows.map((row) => row.status)).toEqual([
      'Open',
      'In Progress',
      'Resolved',
      'Closed',
      'Cancelled',
    ]);
  });

  it('seeds sample comments linked to tickets', async () => {
    const comments = await db.query(`
      SELECT c.message, t.title AS ticket_title
      FROM comments c
      JOIN tickets t ON t.id = c.ticket_id
      ORDER BY c.id
    `);

    expect(comments.rowCount).toBe(5);
    expect(comments.rows[0]).toMatchObject({
      ticket_title: 'Login broken',
      message: 'Investigating the login issue and checking auth logs',
    });
  });

  it('can be re-run safely after clearing is handled in seed.sql', async () => {
    await seed.runSeed();

    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM tickets) AS tickets,
        (SELECT COUNT(*)::int FROM comments) AS comments
    `);

    expect(counts.rows[0]).toEqual({
      users: 3,
      tickets: 5,
      comments: 5,
    });
  });
});
