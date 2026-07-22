const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const DEFAULT_PRIORITY = 'Medium';

const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'];
const DEFAULT_STATUS = 'Open';

const MAX_TITLE_LENGTH = 255;
const MAX_TEXT_LENGTH = 10000;

function mapTicketRow(row) {
  const ticket = {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.assignee_name !== undefined) {
    ticket.assigneeName = row.assignee_name;
  }

  return ticket;
}

function parseRequiredPositiveInteger(value, fieldName) {
  if (value === undefined || value === null) {
    return { error: `${fieldName} is required` };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${fieldName} must be a valid user id` };
  }

  return { value: parsed };
}

function parseOptionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return { value: undefined };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string` };
  }

  return { value };
}

function validateMaxLength(value, fieldName, maxLength) {
  if (value.length > maxLength) {
    return { error: `${fieldName} must be at most ${maxLength} characters` };
  }

  return { value };
}

module.exports = {
  VALID_PRIORITIES,
  DEFAULT_PRIORITY,
  VALID_STATUSES,
  DEFAULT_STATUS,
  MAX_TITLE_LENGTH,
  MAX_TEXT_LENGTH,
  mapTicketRow,
  parseRequiredPositiveInteger,
  parseOptionalString,
  validateMaxLength,
};
