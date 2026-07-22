const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createApp } = require('../src/backend/app');
const { postJson } = require('./helpers/http');
const seed = require('../src/backend/seed');
const testDb = require('../src/backend/testDb');

describe('POST /api/tickets/:id/comments', () => {
  let app;

  beforeAll(async () => {
    await testDb.setupTestDb();
    await seed.runSeed();
    app = createApp();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('creates a comment and returns 201', async () => {
    const response = await postJson(app, '/api/tickets/1/comments', {
      message: 'Customer confirmed the fix works',
      actingUserId: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ticketId: 1,
      message: 'Customer confirmed the fix works',
      createdBy: 1,
    });
    expect(response.body.id).toEqual(expect.any(Number));
    expect(new Date(response.body.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('returns 400 when message is empty', async () => {
    const response = await postJson(app, '/api/tickets/1/comments', {
      message: '   ',
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'message is required' });
  });

  it('returns 404 when ticket does not exist', async () => {
    const response = await postJson(app, '/api/tickets/9999/comments', {
      message: 'Comment on missing ticket',
      actingUserId: 1,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Ticket not found' });
  });
});
