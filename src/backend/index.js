const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createApp } = require('./app');
const db = require('./db');

const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;

if (!PORT) {
  console.error('Missing required environment variable: PORT');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}

async function main() {
  try {
    await db.connect();
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

main();
