const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('./db');

const SEED_DATA_DIR = path.resolve(__dirname, '../../database/seed-data');

function getSeedFiles() {
  if (!fs.existsSync(SEED_DATA_DIR)) {
    throw new Error(`Seed data directory not found: ${SEED_DATA_DIR}`);
  }

  return fs
    .readdirSync(SEED_DATA_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function runSeed() {
  const files = getSeedFiles();

  if (files.length === 0) {
    throw new Error(`No seed files found in ${SEED_DATA_DIR}`);
  }

  for (const file of files) {
    const filePath = path.join(SEED_DATA_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    if (!sql.trim()) {
      throw new Error(`Seed file is empty: ${file}`);
    }

    await db.query(sql);
  }

  return files;
}

async function main() {
  try {
    await db.connect();
    const files = await runSeed();
    console.log(`Applied ${files.length} seed file(s): ${files.join(', ')}`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  SEED_DATA_DIR,
  getSeedFiles,
  runSeed,
};
