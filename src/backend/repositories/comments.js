const db = require('../db');
const { mapCommentRow } = require('../utils/comments');

const LIST_COMMENTS_BY_TICKET_ID = `
  SELECT id, ticket_id, message, created_by, created_at
  FROM comments
  WHERE ticket_id = $1
  ORDER BY id
`;

const INSERT_COMMENT = `
  INSERT INTO comments (ticket_id, message, created_by)
  VALUES ($1, $2, $3)
  RETURNING id, ticket_id, message, created_by, created_at
`;

async function listCommentsByTicketId(ticketId) {
  const result = await db.query(LIST_COMMENTS_BY_TICKET_ID, [ticketId]);
  return result.rows.map(mapCommentRow);
}

async function insertComment(client, { ticketId, message, createdBy }) {
  const result = await client.query(INSERT_COMMENT, [ticketId, message, createdBy]);
  return mapCommentRow(result.rows[0]);
}

async function createComment({ ticketId, message, createdBy }) {
  const result = await db.query(INSERT_COMMENT, [ticketId, message, createdBy]);
  return mapCommentRow(result.rows[0]);
}

module.exports = {
  listCommentsByTicketId,
  insertComment,
  createComment,
};
