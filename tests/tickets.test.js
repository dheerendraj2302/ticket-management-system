const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const request = require('supertest');

const { createApp } = require('../src/backend/app');
const { postJson, patchJson } = require('./helpers/http');
const seed = require('../src/backend/seed');
const testDb = require('../src/backend/testDb');

describe('GET /api/tickets', () => {
  let app;

  beforeAll(async () => {
    await testDb.setupTestDb();
    await seed.runSeed();
    app = createApp();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('returns all seeded tickets with 200', async () => {
    const response = await request(app).get('/api/tickets');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
    expect(response.body.map((ticket) => ticket.title)).toEqual([
      'Login broken',
      'Billing discrepancy',
      'Export report feature',
      'Email notifications not received',
      'Duplicate account setup',
    ]);
    expect(response.body.map((ticket) => ticket.status)).toEqual([
      'Open',
      'In Progress',
      'Resolved',
      'Closed',
      'Cancelled',
    ]);
    expect(response.body[0]).toMatchObject({
      id: 1,
      priority: 'High',
      assignedTo: 2,
      assigneeName: 'Bob Agent',
      createdBy: 1,
      updatedBy: 1,
    });
  });

  describe('search and filter (Task 3.5)', () => {
    it('filters tickets by keyword in title', async () => {
      const response = await request(app).get('/api/tickets').query({ search: 'billing' });

      expect(response.status).toBe(200);
      expect(response.body.map((ticket) => ticket.id)).toEqual([2]);
      expect(response.body[0]).toMatchObject({
        title: 'Billing discrepancy',
      });
    });

    it('filters tickets by keyword in description', async () => {
      const response = await request(app).get('/api/tickets').query({ search: 'subscription' });

      expect(response.status).toBe(200);
      expect(response.body.map((ticket) => ticket.id)).toEqual([2]);
      expect(response.body[0]).toMatchObject({
        description: 'Invoice total does not match the subscription plan',
      });
    });

    it('filters tickets by keyword in comment text', async () => {
      const response = await request(app).get('/api/tickets').query({ search: 'csv export' });

      expect(response.status).toBe(200);
      expect(response.body.map((ticket) => ticket.id)).toEqual([3]);
      expect(response.body[0]).toMatchObject({
        title: 'Export report feature',
      });
    });

    it('filters tickets by status alone', async () => {
      const response = await request(app).get('/api/tickets').query({ status: 'Open' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        title: 'Login broken',
        status: 'Open',
      });
    });

    it('filters tickets by priority alone', async () => {
      const response = await request(app).get('/api/tickets').query({ priority: 'High' });

      expect(response.status).toBe(200);
      expect(response.body.map((ticket) => ticket.id)).toEqual([1, 4]);
      expect(response.body.every((ticket) => ticket.priority === 'High')).toBe(true);
    });

    it('combines search, status, and priority filters with AND logic', async () => {
      const response = await request(app).get('/api/tickets').query({
        search: 'login',
        status: 'Open',
        priority: 'High',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        title: 'Login broken',
        status: 'Open',
        priority: 'High',
      });
    });

    it('returns 200 with an empty array when combined filters match no tickets', async () => {
      const response = await request(app).get('/api/tickets').query({
        search: 'login',
        status: 'Closed',
        priority: 'High',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns 400 when status filter is invalid', async () => {
      const response = await request(app).get('/api/tickets').query({ status: 'Invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'status must be one of: Open, In Progress, Resolved, Closed, Cancelled',
      });
    });

    it('returns 400 when priority filter is invalid', async () => {
      const response = await request(app).get('/api/tickets').query({ priority: 'Urgent' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'priority must be one of: Low, Medium, High',
      });
    });
  });
});

describe('GET /api/tickets/:id', () => {
  let app;

  beforeAll(async () => {
    await testDb.setupTestDb();
    await seed.runSeed();
    app = createApp();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('returns ticket detail with nested comments', async () => {
    const response = await request(app).get('/api/tickets/1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1,
      title: 'Login broken',
      description: 'Cannot log in after password reset',
      priority: 'High',
      status: 'Open',
      assignedTo: 2,
      assigneeName: 'Bob Agent',
      createdBy: 1,
      updatedBy: 1,
      comments: [
        {
          id: 1,
          ticketId: 1,
          message: 'Investigating the login issue and checking auth logs',
          createdBy: 2,
        },
      ],
    });
    expect(new Date(response.body.createdAt).toString()).not.toBe('Invalid Date');
    expect(new Date(response.body.comments[0].createdAt).toString()).not.toBe('Invalid Date');
  });

  it('returns 404 when ticket does not exist', async () => {
    const response = await request(app).get('/api/tickets/9999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Ticket not found' });
  });
});

describe('PATCH /api/tickets/:id', () => {
  let app;

  beforeAll(async () => {
    await testDb.setupTestDb();
    await seed.runSeed();
    app = createApp();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('updates allowed fields and returns 200', async () => {
    const response = await patchJson(app, '/api/tickets/1', {
      title: 'Updated login issue',
      actingUserId: 1,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1,
      title: 'Updated login issue',
      description: 'Cannot log in after password reset',
      updatedBy: 1,
    });
    expect(new Date(response.body.updatedAt).toString()).not.toBe('Invalid Date');
  });

  it('returns 403 when a customer updates another user ticket', async () => {
    const createResponse = await postJson(app, '/api/tickets', {
      title: 'Admin-owned ticket',
      description: 'Created by the admin acting user',
      assignedTo: 2,
      actingUserId: 3,
    });

    const response = await patchJson(app, `/api/tickets/${createResponse.body.id}`, {
      title: 'Unauthorized change',
      actingUserId: 1,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'You do not have permission to update this ticket',
    });
  });

  it('returns 403 when an agent updates a ticket assigned to them', async () => {
    const response = await patchJson(app, '/api/tickets/1', {
      title: 'Agent attempted edit',
      actingUserId: 2,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'You do not have permission to update this ticket',
    });
  });

  it('returns 400 when status is included in the request body', async () => {
    const response = await patchJson(app, '/api/tickets/1', {
      status: 'Closed',
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'status cannot be updated via this endpoint',
    });
  });

  it('returns 400 when title is whitespace-only', async () => {
    const response = await patchJson(app, '/api/tickets/1', {
      title: '   ',
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title must be non-empty' });
  });

  it('returns 400 when description is whitespace-only', async () => {
    const response = await patchJson(app, '/api/tickets/1', {
      description: '   ',
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'description must be non-empty' });
  });

  it('returns 400 when assignedTo is not an agent', async () => {
    const response = await patchJson(app, '/api/tickets/1', {
      assignedTo: 1,
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'assignedTo must reference an agent' });
  });
});

describe('PATCH /api/tickets/:id/status', () => {
  let app;

  const CUSTOMER_ID = 1;
  const AGENT_ID = 2;
  const ADMIN_ID = 3;

  beforeAll(async () => {
    await testDb.setupTestDb();
    app = createApp();
  });

  beforeEach(async () => {
    await seed.runSeed();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  async function createOpenTicket() {
    const response = await postJson(app, '/api/tickets', {
      title: 'Status transition ticket',
      description: 'Ticket for status integration tests',
      assignedTo: AGENT_ID,
      actingUserId: CUSTOMER_ID,
    });

    expect(response.status).toBe(201);
    return response.body;
  }

  async function transitionStatus(ticketId, body) {
    return patchJson(app, `/api/tickets/${ticketId}/status`, body);
  }

  async function createInProgressTicket() {
    const ticket = await createOpenTicket();
    const response = await transitionStatus(ticket.id, {
      status: 'In Progress',
      actingUserId: AGENT_ID,
    });

    expect(response.status).toBe(200);
    return ticket;
  }

  async function createResolvedTicket() {
    const ticket = await createInProgressTicket();
    const response = await transitionStatus(ticket.id, {
      status: 'Resolved',
      actingUserId: AGENT_ID,
      remarks: 'Issue has been fixed',
    });

    expect(response.status).toBe(200);
    return ticket;
  }

  describe('valid role-based transitions', () => {
    it('transitions Open to In Progress when the assignee acts', async () => {
      const ticket = await createOpenTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'In Progress',
        actingUserId: AGENT_ID,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'In Progress',
        updatedBy: AGENT_ID,
      });
    });

    it('transitions In Progress to Resolved when the assignee provides remarks', async () => {
      const ticket = await createInProgressTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Resolved',
        actingUserId: AGENT_ID,
        remarks: 'Root cause fixed and verified',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'Resolved',
        updatedBy: AGENT_ID,
      });
    });

    it('transitions Open to Cancelled when the creator provides remarks', async () => {
      const ticket = await createOpenTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Cancelled',
        actingUserId: CUSTOMER_ID,
        remarks: 'No longer needed',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'Cancelled',
        updatedBy: CUSTOMER_ID,
      });
    });

    it('transitions In Progress to Cancelled when the creator provides remarks', async () => {
      const ticket = await createInProgressTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Cancelled',
        actingUserId: CUSTOMER_ID,
        remarks: 'Customer withdrew the request',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'Cancelled',
        updatedBy: CUSTOMER_ID,
      });
    });

    it('transitions Resolved to Closed when the creator acts', async () => {
      const ticket = await createResolvedTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Closed',
        actingUserId: CUSTOMER_ID,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'Closed',
        updatedBy: CUSTOMER_ID,
      });
    });
  });

  async function assertRejectsInvalidTransition(from, ticketId, targetStatus) {
    const body = {
      status: targetStatus,
      actingUserId: ADMIN_ID,
    };

    if (targetStatus === 'Resolved' || targetStatus === 'Cancelled') {
      body.remarks = 'Attempting invalid transition';
    }

    const response = await transitionStatus(ticketId, body);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: `Invalid transition from ${from} to ${targetStatus}`,
    });
  }

  describe('invalid base transitions (Task 3.2)', () => {
    it.each([
      { from: 'Open', ticketId: 1, targetStatus: 'Resolved' },
      { from: 'Open', ticketId: 1, targetStatus: 'Closed' },
      { from: 'In Progress', ticketId: 2, targetStatus: 'Closed' },
      { from: 'Resolved', ticketId: 3, targetStatus: 'Open' },
      { from: 'Closed', ticketId: 4, targetStatus: 'In Progress' },
      { from: 'Cancelled', ticketId: 5, targetStatus: 'Open' },
    ])(
      'rejects transition from $from to $targetStatus with 409 and a clear error message',
      async ({ from, ticketId, targetStatus }) => {
        await assertRejectsInvalidTransition(from, ticketId, targetStatus);
      }
    );
  });

  describe('additional invalid base transitions', () => {
    it.each([
      { from: 'In Progress', ticketId: 2, targetStatus: 'Open' },
      { from: 'Resolved', ticketId: 3, targetStatus: 'In Progress' },
      { from: 'Resolved', ticketId: 3, targetStatus: 'Cancelled' },
      { from: 'Closed', ticketId: 4, targetStatus: 'Open' },
      { from: 'Closed', ticketId: 4, targetStatus: 'Resolved' },
      { from: 'Closed', ticketId: 4, targetStatus: 'Cancelled' },
      { from: 'Cancelled', ticketId: 5, targetStatus: 'In Progress' },
      { from: 'Cancelled', ticketId: 5, targetStatus: 'Resolved' },
      { from: 'Cancelled', ticketId: 5, targetStatus: 'Closed' },
    ])(
      'rejects transition from $from to $targetStatus with 409',
      async ({ from, ticketId, targetStatus }) => {
        await assertRejectsInvalidTransition(from, ticketId, targetStatus);
      }
    );

    it('rejects a no-op transition to the current status with 409', async () => {
      const response = await transitionStatus(1, {
        status: 'Open',
        actingUserId: ADMIN_ID,
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Invalid transition from Open to Open',
      });
    });
  });

  async function assertForbiddenTransition(ticketId, body) {
    const response = await transitionStatus(ticketId, body);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'You do not have permission to perform this status transition',
    });
  }

  describe('permission failures (Task 3.3)', () => {
    it('returns 403 when a non-creator non-admin tries to close a Resolved ticket', async () => {
      const ticket = await createResolvedTicket();

      await assertForbiddenTransition(ticket.id, {
        status: 'Closed',
        actingUserId: AGENT_ID,
      });
    });

    it('returns 403 when a customer tries to close another users Resolved ticket', async () => {
      const createResponse = await postJson(app, '/api/tickets', {
        title: 'Admin-owned resolved ticket',
        description: 'Created by the admin for permission testing',
        assignedTo: AGENT_ID,
        actingUserId: ADMIN_ID,
      });
      const ticket = createResponse.body;

      await transitionStatus(ticket.id, {
        status: 'In Progress',
        actingUserId: AGENT_ID,
      });
      await transitionStatus(ticket.id, {
        status: 'Resolved',
        actingUserId: AGENT_ID,
        remarks: 'Work completed by assignee',
      });

      await assertForbiddenTransition(ticket.id, {
        status: 'Closed',
        actingUserId: CUSTOMER_ID,
      });
    });

    it('returns 403 when a non-assignee non-admin tries to resolve an In Progress ticket', async () => {
      const createResponse = await postJson(app, '/api/tickets', {
        title: 'Ticket assigned to the agent',
        description: 'Customer is not the assignee',
        assignedTo: AGENT_ID,
        actingUserId: CUSTOMER_ID,
      });
      const ticket = createResponse.body;

      await transitionStatus(ticket.id, {
        status: 'In Progress',
        actingUserId: ADMIN_ID,
      });

      await assertForbiddenTransition(ticket.id, {
        status: 'Resolved',
        actingUserId: CUSTOMER_ID,
        remarks: 'Customer attempted resolution',
      });
    });

    it('returns 403 when a non-assignee tries to start work on an Open ticket', async () => {
      const ticket = await createOpenTicket();

      await assertForbiddenTransition(ticket.id, {
        status: 'In Progress',
        actingUserId: CUSTOMER_ID,
      });
    });
  });

  describe('additional permission denials', () => {
    it('returns 403 when a non-creator tries to cancel an Open ticket', async () => {
      const ticket = await createOpenTicket();

      await assertForbiddenTransition(ticket.id, {
        status: 'Cancelled',
        actingUserId: AGENT_ID,
        remarks: 'Agent attempted cancellation',
      });
    });
  });

  describe('remarks validation (Task 3.4)', () => {
    it('returns 400 when transitioning In Progress to Resolved without remarks', async () => {
      const ticket = await createInProgressTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Resolved',
        actingUserId: AGENT_ID,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Remarks are required when resolving or cancelling a ticket',
      });
    });

    it('returns 400 when transitioning Open to Cancelled without remarks', async () => {
      const ticket = await createOpenTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Cancelled',
        actingUserId: CUSTOMER_ID,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Remarks are required when resolving or cancelling a ticket',
      });
    });

    it('persists remarks as a Comment when transitioning In Progress to Resolved', async () => {
      const ticket = await createInProgressTicket();
      const remarks = 'Root cause identified and fixed';

      const response = await transitionStatus(ticket.id, {
        status: 'Resolved',
        actingUserId: AGENT_ID,
        remarks,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'Resolved',
        updatedBy: AGENT_ID,
      });

      const detailResponse = await request(app).get(`/api/tickets/${ticket.id}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.comments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ticketId: ticket.id,
            message: remarks,
            createdBy: AGENT_ID,
          }),
        ])
      );
    });

    it('persists remarks as a Comment when transitioning Open to Cancelled', async () => {
      const ticket = await createOpenTicket();
      const remarks = 'Customer withdrew the request';

      const response = await transitionStatus(ticket.id, {
        status: 'Cancelled',
        actingUserId: CUSTOMER_ID,
        remarks,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: ticket.id,
        status: 'Cancelled',
        updatedBy: CUSTOMER_ID,
      });

      const detailResponse = await request(app).get(`/api/tickets/${ticket.id}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.comments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ticketId: ticket.id,
            message: remarks,
            createdBy: CUSTOMER_ID,
          }),
        ])
      );
    });
  });

  describe('additional remarks validation', () => {
    it('returns 400 when cancelling with whitespace-only remarks', async () => {
      const ticket = await createOpenTicket();

      const response = await transitionStatus(ticket.id, {
        status: 'Cancelled',
        actingUserId: CUSTOMER_ID,
        remarks: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Remarks are required when resolving or cancelling a ticket',
      });
    });
  });

  describe('request validation', () => {
    it('returns 400 when status is missing', async () => {
      const response = await transitionStatus(1, {
        actingUserId: AGENT_ID,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'status is required' });
    });

    it('returns 404 when the ticket does not exist', async () => {
      const response = await transitionStatus(9999, {
        status: 'In Progress',
        actingUserId: AGENT_ID,
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Ticket not found' });
    });
  });
});

describe('POST /api/tickets', () => {
  let app;

  beforeAll(async () => {
    await testDb.setupTestDb();
    await seed.runSeed();
    app = createApp();
  });

  afterAll(async () => {
    await testDb.teardownTestDb();
  });

  it('creates a ticket with defaults and returns 201', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Printer not working',
      description: 'Office printer on floor 2 is offline',
      assignedTo: 2,
      actingUserId: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Printer not working',
      description: 'Office printer on floor 2 is offline',
      priority: 'Medium',
      status: 'Open',
      assignedTo: 2,
      createdBy: 1,
      updatedBy: 1,
    });
    expect(response.body.id).toEqual(expect.any(Number));
    expect(new Date(response.body.createdAt).toString()).not.toBe('Invalid Date');
    expect(new Date(response.body.updatedAt).toString()).not.toBe('Invalid Date');
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await postJson(app, '/api/tickets', {
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
  });

  it('returns 400 when assignedTo does not reference an existing user', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Printer not working',
      description: 'Office printer on floor 2 is offline',
      assignedTo: 9999,
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'assignedTo does not reference an existing user',
    });
  });

  it('returns 403 when an agent tries to create a ticket', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Agent-created ticket',
      description: 'Agents are not allowed to create tickets',
      assignedTo: 2,
      actingUserId: 2,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'Only customers and admins can create tickets',
    });
  });

  it('returns 400 when assignedTo is not an agent', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Ticket assigned to a customer',
      description: 'Only agents can be assignees',
      assignedTo: 1,
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'assignedTo must reference an agent',
    });
  });

  it('returns 400 when client supplies status on create', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Ticket with custom status',
      description: 'Status must not be accepted from client',
      assignedTo: 2,
      actingUserId: 1,
      status: 'Closed',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'status cannot be set on create' });
  });

  it('returns 400 when title is whitespace-only', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: '   ',
      description: 'Valid description',
      assignedTo: 2,
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
  });

  it('returns 400 when description is whitespace-only', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Valid title',
      description: '   ',
      assignedTo: 2,
      actingUserId: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'description is required' });
  });

  it('returns 404 when actingUserId does not reference an existing user', async () => {
    const response = await postJson(app, '/api/tickets', {
      title: 'Valid title',
      description: 'Valid description',
      assignedTo: 2,
      actingUserId: 9999,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'actingUserId does not reference an existing user',
    });
  });
});
