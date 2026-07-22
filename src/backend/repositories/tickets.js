const db = require('../db');
const commentsRepository = require('./comments');
const { HttpError } = require('../errors/HttpError');
const { mapTicketRow } = require('../utils/tickets');
const { canTransition, TRANSITION_CODES } = require('../utils/stateMachine');

const TICKET_COLUMNS = `
  id,
  title,
  description,
  priority,
  status,
  assigned_to,
  created_by,
  updated_by,
  created_at,
  updated_at
`;

const INSERT_TICKET = `
  INSERT INTO tickets (
    title,
    description,
    priority,
    status,
    assigned_to,
    created_by,
    updated_by
  ) VALUES ($1, $2, $3, $4, $5, $6, $6)
  RETURNING ${TICKET_COLUMNS}
`;

const TICKET_SELECT_COLUMNS = `
  t.id,
  t.title,
  t.description,
  t.priority,
  t.status,
  t.assigned_to,
  t.created_by,
  t.updated_by,
  t.created_at,
  t.updated_at,
  assignee.name AS assignee_name
`;

const TICKET_SELECT_BASE = `
  SELECT ${TICKET_SELECT_COLUMNS}
  FROM tickets t
  JOIN users assignee ON assignee.id = t.assigned_to
`;

const FIND_TICKET_BY_ID = `
  ${TICKET_SELECT_BASE}
  WHERE t.id = $1
`;

const FIND_TICKET_FOR_UPDATE = `
  ${TICKET_SELECT_BASE}
  WHERE t.id = $1
  FOR UPDATE OF t
`;

const UPDATE_TICKET_STATUS = `
  UPDATE tickets
  SET status = $2, updated_by = $3, updated_at = NOW()
  WHERE id = $1
  RETURNING ${TICKET_COLUMNS}
`;

async function insertTicket({
  title,
  description,
  priority,
  status,
  assignedTo,
  actingUserId,
}) {
  const result = await db.query(INSERT_TICKET, [
    title,
    description,
    priority,
    status,
    assignedTo,
    actingUserId,
  ]);

  return mapTicketRow(result.rows[0]);
}

function buildListTicketsQuery({ search, status, priority } = {}) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(`(
      t.title ILIKE $${paramIndex}
      OR t.description ILIKE $${paramIndex}
      OR EXISTS (
        SELECT 1
        FROM comments c
        WHERE c.ticket_id = t.id
          AND c.message ILIKE $${paramIndex}
      )
    )`);
    values.push(pattern);
    paramIndex += 1;
  }

  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    values.push(status);
    paramIndex += 1;
  }

  if (priority) {
    conditions.push(`t.priority = $${paramIndex}`);
    values.push(priority);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `${TICKET_SELECT_BASE} ${whereClause} ORDER BY t.id`;

  return { sql, values };
}

async function listTickets(filters = {}) {
  const { sql, values } = buildListTicketsQuery(filters);
  const result = await db.query(sql, values);
  return result.rows.map(mapTicketRow);
}

async function findTicketById(id) {
  const result = await db.query(FIND_TICKET_BY_ID, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapTicketRow(result.rows[0]);
}

async function updateTicket(id, updates, actingUserId) {
  const setClauses = [];
  const values = [id];
  let paramIndex = 2;

  if (updates.title !== undefined) {
    setClauses.push(`title = $${paramIndex}`);
    values.push(updates.title);
    paramIndex += 1;
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex}`);
    values.push(updates.description);
    paramIndex += 1;
  }

  if (updates.priority !== undefined) {
    setClauses.push(`priority = $${paramIndex}`);
    values.push(updates.priority);
    paramIndex += 1;
  }

  if (updates.assignedTo !== undefined) {
    setClauses.push(`assigned_to = $${paramIndex}`);
    values.push(updates.assignedTo);
    paramIndex += 1;
  }

  setClauses.push(`updated_by = $${paramIndex}`);
  values.push(actingUserId);
  paramIndex += 1;

  setClauses.push('updated_at = NOW()');

  const updateSql = `
    UPDATE tickets
    SET ${setClauses.join(', ')}
    WHERE id = $1
    RETURNING ${TICKET_COLUMNS}
  `;

  const result = await db.query(updateSql, values);

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Ticket not found');
  }

  return mapTicketRow(result.rows[0]);
}

async function updateTicketStatus(ticketId, targetStatus, actor, remarks) {
  return db.withTransaction(async (client) => {
    const findResult = await client.query(FIND_TICKET_FOR_UPDATE, [ticketId]);

    if (findResult.rowCount === 0) {
      throw new HttpError(404, 'Ticket not found');
    }

    const ticket = mapTicketRow(findResult.rows[0]);

    if (targetStatus === ticket.status) {
      throw new HttpError(
        409,
        `Invalid transition from ${ticket.status} to ${targetStatus}`
      );
    }

    const transition = canTransition({ actor, ticket, targetStatus });

    if (!transition.allowed) {
      const statusCode =
        transition.code === TRANSITION_CODES.INVALID_TRANSITION ? 409 : 403;
      throw new HttpError(statusCode, transition.reason);
    }

    const updateResult = await client.query(UPDATE_TICKET_STATUS, [
      ticketId,
      targetStatus,
      actor.id,
    ]);

    if (updateResult.rowCount === 0) {
      throw new HttpError(404, 'Ticket not found');
    }

    if (remarks) {
      await commentsRepository.insertComment(client, {
        ticketId,
        message: remarks,
        createdBy: actor.id,
      });
    }

    return mapTicketRow(updateResult.rows[0]);
  });
}

module.exports = {
  insertTicket,
  listTickets,
  findTicketById,
  updateTicket,
  updateTicketStatus,
};
