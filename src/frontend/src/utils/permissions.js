import { ASSIGNEE_ROLE, CREATE_TICKET_ROLES } from '../constants/roles.js';

export function canCreateTicket(user) {
  return Boolean(user) && CREATE_TICKET_ROLES.includes(user.role);
}

export function isAssignableUser(user) {
  return Boolean(user) && user.role === ASSIGNEE_ROLE;
}

export function canUpdateTicketFields(actor, ticket) {
  if (!actor || !ticket) {
    return false;
  }

  if (actor.role === 'admin') {
    return true;
  }

  if (actor.role === 'customer') {
    return ticket.createdBy === actor.id;
  }

  return false;
}
