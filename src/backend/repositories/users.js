const db = require('../db');

const LIST_USERS = `
  SELECT id, name, email, role
  FROM users
  ORDER BY id
`;

const FIND_USER_BY_ID = `
  SELECT id, name, email, role
  FROM users
  WHERE id = $1
`;

async function listUsers() {
  const result = await db.query(LIST_USERS);
  return result.rows;
}

async function findUserById(id) {
  const result = await db.query(FIND_USER_BY_ID, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

async function findExistingUserIds(ids) {
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) {
    return new Set();
  }

  const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
  const result = await db.query(
    `SELECT id FROM users WHERE id IN (${placeholders})`,
    uniqueIds
  );

  return new Set(result.rows.map((row) => row.id));
}

async function findUsersByIds(ids) {
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
  const result = await db.query(
    `SELECT id, name, email, role FROM users WHERE id IN (${placeholders})`,
    uniqueIds
  );

  return new Map(result.rows.map((row) => [row.id, row]));
}

module.exports = {
  listUsers,
  findUserById,
  findExistingUserIds,
  findUsersByIds,
};
