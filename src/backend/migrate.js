const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('./db');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/schema-or-migrations');

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function runMigrations() {
  const files = getMigrationFiles();

  if (files.length === 0) {
    throw new Error(`No migration files found in ${MIGRATIONS_DIR}`);
  }

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    if (!sql.trim()) {
      throw new Error(`Migration file is empty: ${file}`);
    }

    await db.query(sql);
  }

  return files;
}

async function main() {
  try {
    await db.connect();
    const files = await runMigrations();
    console.log(`Applied ${files.length} migration(s): ${files.join(', ')}`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  MIGRATIONS_DIR,
  getMigrationFiles,
  runMigrations,
};
