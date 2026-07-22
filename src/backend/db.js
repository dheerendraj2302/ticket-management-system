const { Pool } = require('pg');

let pool = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  return databaseUrl;
}

async function connect(connectionString) {
  if (pool) {
    return pool;
  }

  const url = connectionString || getDatabaseUrl();
  pool = new Pool({ connectionString: url });

  const client = await pool.connect();
  client.release();

  return pool;
}

async function disconnect() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}

function getPool() {
  return pool;
}

async function query(text, params) {
  if (!pool) {
    throw new Error('Database not connected. Call connect() first.');
  }

  return pool.query(text, params);
}

async function withTransaction(callback) {
  if (!pool) {
    throw new Error('Database not connected. Call connect() first.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reset() {
  await query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
    GRANT ALL ON SCHEMA public TO CURRENT_USER;
  `);
}

module.exports = {
  connect,
  disconnect,
  getPool,
  query,
  withTransaction,
  reset,
  getDatabaseUrl,
};
