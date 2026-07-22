const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('./db');
const { runMigrations } = require('./migrate');

const ADMIN_DATABASE = 'postgres';

function getTestDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  const baseUrl = process.env.DATABASE_URL;

  if (!baseUrl) {
    throw new Error('Missing required environment variable: TEST_DATABASE_URL or DATABASE_URL');
  }

  const url = new URL(baseUrl);
  const databaseName = url.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name');
  }

  url.pathname = `/${databaseName}_test`;

  return url.toString();
}

function getAdminDatabaseUrl() {
  const url = new URL(getTestDatabaseUrl());
  url.pathname = `/${ADMIN_DATABASE}`;
  return url.toString();
}

function getTestDatabaseName() {
  const url = new URL(getTestDatabaseUrl());
  return url.pathname.replace(/^\//, '');
}

async function withAdminPool(callback) {
  const adminPool = new Pool({ connectionString: getAdminDatabaseUrl() });

  try {
    return await callback(adminPool);
  } finally {
    await adminPool.end();
  }
}

async function createTestDatabase() {
  const testDatabaseName = getTestDatabaseName();

  await withAdminPool(async (adminPool) => {
    const existing = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDatabaseName]
    );

    if (existing.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${testDatabaseName}"`);
    }
  });
}

async function dropTestDatabase() {
  const testDatabaseName = getTestDatabaseName();

  await db.disconnect();

  await withAdminPool(async (adminPool) => {
    await adminPool.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
      [testDatabaseName]
    );

    await adminPool.query(`DROP DATABASE IF EXISTS "${testDatabaseName}"`);
  });
}

async function connectTestDb() {
  await createTestDatabase();
  return db.connect(getTestDatabaseUrl());
}

async function disconnectTestDb() {
  return db.disconnect();
}

async function resetTestDb() {
  return db.reset();
}

async function setupTestDb() {
  await connectTestDb();
  await resetTestDb();
  await runMigrations();
}

async function teardownTestDb() {
  await dropTestDatabase();
}

module.exports = {
  getTestDatabaseUrl,
  createTestDatabase,
  dropTestDatabase,
  connectTestDb,
  disconnectTestDb,
  resetTestDb,
  setupTestDb,
  teardownTestDb,
};
