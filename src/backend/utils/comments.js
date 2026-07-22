function mapCommentRow(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    message: row.message,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

module.exports = {
  mapCommentRow,
};
