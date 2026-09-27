require('dotenv').config();

const { pool } = require('../src/config/db');
const { runMigrations } = require('../src/config/migrations');

runMigrations(pool)
  .catch((error) => {
    console.error('Error aplicando migraciones:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
