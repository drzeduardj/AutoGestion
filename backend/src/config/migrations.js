const fs = require('fs');
const path = require('path');

// Aplica en orden todas las migraciones SQL de db/migrations. Son idempotentes, por eso se
// ejecutan todas cada vez. La usan `npm run migrate` y `autogestion.exe --migrate`.
const migrationsDir = path.resolve(__dirname, '../../db/migrations');

const runMigrations = async (pool) => {
  if (!fs.existsSync(migrationsDir)) {
    console.log('No hay carpeta de migraciones.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No hay migraciones SQL para aplicar.');
    return;
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    console.log(`Aplicando migracion: ${file}`);
    await pool.query(sql);
  }

  console.log('Migraciones aplicadas correctamente.');
};

module.exports = { runMigrations };
