const path = require('path');

// Empaquetado con pkg (autogestion.exe): .env y uploads/ viven junto al ejecutable, sin importar
// desde donde se lance (doble clic, acceso directo o servicio de Windows).
if (process.pkg) {
  process.chdir(path.dirname(process.execPath));
}

require('dotenv').config();

const { pool } = require('./config/db');

// `autogestion.exe --migrate` (o `node src/server.js --migrate`) aplica las migraciones y termina.
if (process.argv.includes('--migrate')) {
  const { runMigrations } = require('./config/migrations');

  runMigrations(pool)
    .catch((error) => {
      console.error('Error aplicando migraciones:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
} else {
  const app = require('./app');

  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST || '0.0.0.0';

  const server = app.listen(port, host, () => {
    console.log(`API escuchando en http://${host}:${port}`);
    console.log(`En red local usa http://IP_DEL_EQUIPO:${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
