const { getAllowedNextStatuses, canTransition, requiresRemarks } = require('../src/backend/utils/stateMachine');

const customer = { id: 1, role: 'customer' };
const agent = { id: 2, role: 'agent' };
const admin = { id: 3, role: 'admin' };

function buildTicket(overrides) {
  return {
    id: 1,
    status: 'Open',
    assignedTo: 2,
    createdBy: 1,
    ...overrides,
  };
}

describe('getAllowedNextStatuses', () => {
  it.each([
    ['Open', ['In Progress', 'Cancelled']],
    ['In Progress', ['Resolved', 'Cancelled']],
    ['Resolved', ['Closed']],
    ['Closed', []],
    ['Cancelled', []],
  ])('returns allowed next statuses for %s', (currentStatus, expected) => {
    expect(getAllowedNextStatuses(currentStatus)).toEqual(expected);
  });

  it('returns an empty array for an unknown status', () => {
    expect(getAllowedNextStatuses('Invalid')).toEqual([]);
  });
});

describe('canTransition', () => {
  it.each([
    {
      name: 'Open to In Progress by assignee',
      actor: agent,
      ticket: buildTicket({ status: 'Open', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'In Progress',
    },
    {
      name: 'In Progress to Resolved by assignee',
      actor: agent,
      ticket: buildTicket({ status: 'In Progress', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Resolved',
    },
    {
      name: 'Open to Cancelled by creator',
      actor: customer,
      ticket: buildTicket({ status: 'Open', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Cancelled',
    },
    {
      name: 'In Progress to Cancelled by creator',
      actor: customer,
      ticket: buildTicket({ status: 'In Progress', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Cancelled',
    },
    {
      name: 'Resolved to Closed by creator',
      actor: customer,
      ticket: buildTicket({ status: 'Resolved', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Closed',
    },
  ])('allows $name', ({ actor, ticket, targetStatus }) => {
    expect(canTransition({ actor, ticket, targetStatus })).toEqual({ allowed: true });
  });

  it.each([
    {
      name: 'Open to In Progress by non-assignee customer',
      actor: customer,
      ticket: buildTicket({ status: 'Open', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'In Progress',
      reason: 'You do not have permission to perform this status transition',
    },
    {
      name: 'In Progress to Resolved by non-assignee customer',
      actor: customer,
      ticket: buildTicket({ status: 'In Progress', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Resolved',
      reason: 'You do not have permission to perform this status transition',
    },
    {
      name: 'Open to Cancelled by assignee agent',
      actor: agent,
      ticket: buildTicket({ status: 'Open', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Cancelled',
      reason: 'You do not have permission to perform this status transition',
    },
    {
      name: 'Resolved to Closed by assignee agent',
      actor: agent,
      ticket: buildTicket({ status: 'Resolved', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Closed',
      reason: 'You do not have permission to perform this status transition',
    },
    {
      name: 'Open to Resolved invalid base transition',
      actor: agent,
      ticket: buildTicket({ status: 'Open', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'Resolved',
      reason: 'Invalid transition from Open to Resolved',
    },
    {
      name: 'Closed to In Progress from terminal state',
      actor: admin,
      ticket: buildTicket({ status: 'Closed', assignedTo: 2, createdBy: 1 }),
      targetStatus: 'In Progress',
      reason: 'Invalid transition from Closed to In Progress',
    },
  ])('denies $name', ({ actor, ticket, targetStatus, reason }) => {
    const result = canTransition({ actor, ticket, targetStatus });
    const expectedCode = reason.startsWith('Invalid transition from')
      ? 'INVALID_TRANSITION'
      : 'FORBIDDEN';

    expect(result).toEqual({
      allowed: false,
      code: expectedCode,
      reason,
    });
  });

  it('allows admin to perform any valid base transition', () => {
    expect(
      canTransition({
        actor: admin,
        ticket: buildTicket({ status: 'Open', assignedTo: 2, createdBy: 1 }),
        targetStatus: 'In Progress',
      })
    ).toEqual({ allowed: true });
  });
});

describe('requiresRemarks', () => {
  it.each([
    ['Open', false],
    ['In Progress', false],
    ['Resolved', true],
    ['Closed', false],
    ['Cancelled', true],
  ])('when target status is %s, returns %s', (targetStatus, expected) => {
    expect(requiresRemarks(targetStatus)).toBe(expected);
  });
});
