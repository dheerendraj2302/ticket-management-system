const CREATE_TICKET_ROLES = ['customer', 'admin'];
const ASSIGNEE_ROLE = 'agent';

function canCreateTicket(actor) {
  return Boolean(actor) && CREATE_TICKET_ROLES.includes(actor.role);
}

function isAssignableUser(user) {
  return Boolean(user) && user.role === ASSIGNEE_ROLE;
}

function canUpdateTicketFields(actor, ticket) {
  if (!actor) {
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

module.exports = {
  CREATE_TICKET_ROLES,
  ASSIGNEE_ROLE,
  canCreateTicket,
  isAssignableUser,
  canUpdateTicketFields,
};
