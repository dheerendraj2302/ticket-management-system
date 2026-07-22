const ALLOWED_TRANSITIONS = {
  Open: ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed'],
  Closed: [],
  Cancelled: [],
};

const ROLE_TRANSITION_RULES = {
  'Open->In Progress': (actor, ticket) => actor.id === ticket.assignedTo,
  'In Progress->Resolved': (actor, ticket) => actor.id === ticket.assignedTo,
  'Open->Cancelled': (actor, ticket) => actor.id === ticket.createdBy,
  'In Progress->Cancelled': (actor, ticket) => actor.id === ticket.createdBy,
  'Resolved->Closed': (actor, ticket) => actor.id === ticket.createdBy,
};

const TRANSITION_CODES = {
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  FORBIDDEN: 'FORBIDDEN',
};

const STATUSES_REQUIRING_REMARKS = new Set(['Resolved', 'Cancelled']);

function getTransitionKey(currentStatus, targetStatus) {
  return `${currentStatus}->${targetStatus}`;
}

export function getAllowedNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

export function canTransition({ actor, ticket, targetStatus }) {
  const allowedNextStatuses = getAllowedNextStatuses(ticket.status);

  if (!allowedNextStatuses.includes(targetStatus)) {
    return {
      allowed: false,
      code: TRANSITION_CODES.INVALID_TRANSITION,
      reason: `Invalid transition from ${ticket.status} to ${targetStatus}`,
    };
  }

  if (actor.role === 'admin') {
    return { allowed: true };
  }

  const roleRule = ROLE_TRANSITION_RULES[getTransitionKey(ticket.status, targetStatus)];

  if (roleRule && roleRule(actor, ticket)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: TRANSITION_CODES.FORBIDDEN,
    reason: 'You do not have permission to perform this status transition',
  };
}

export function requiresRemarks(targetStatus) {
  return STATUSES_REQUIRING_REMARKS.has(targetStatus);
}

export function getPermittedNextStatuses(actor, ticket) {
  if (!actor || !ticket) {
    return [];
  }

  return getAllowedNextStatuses(ticket.status).filter(
    (targetStatus) => canTransition({ actor, ticket, targetStatus }).allowed
  );
}
