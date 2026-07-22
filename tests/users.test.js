const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const request = require('supertest');

const { createApp } = require('../src/backend/app');
const seed = require('../src/backend/seed');
const testDb = require('../src/backend/testDb');

describe('GET /api/users', () => {
  let app;

  beforeAll(async () => {
    await testDb.setupTestDb();
    await seed.runSeed();
    app = createApp();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('returns all seeded users with id, name, email, and role', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        name: 'Alice Customer',
        email: 'alice@example.com',
        role: 'customer',
      },
      {
        id: 2,
        name: 'Bob Agent',
        email: 'bob@example.com',
        role: 'agent',
      },
      {
        id: 3,
        name: 'Carol Admin',
        email: 'carol@example.com',
        role: 'admin',
      },
    ]);
    expect(new Set(response.body.map((user) => user.role))).toEqual(
      new Set(['customer', 'agent', 'admin'])
    );
  });
});
