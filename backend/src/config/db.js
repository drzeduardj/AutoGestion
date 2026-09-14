const { Pool } = require('pg');

// DATABASE_URL (Neon, Supabase, Vercel Postgres...) tiene prioridad sobre las variables DB_*.
// En Vercel cada funcion abre su propio pool, por eso se limita el numero de conexiones.
const isServerless = Boolean(process.env.VERCEL);
const useSsl = process.env.DB_SSL === 'true'
  || (process.env.DB_SSL !== 'false' && Boolean(process.env.DATABASE_URL) && isServerless);

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  };

const pool = new Pool({
  ...connectionConfig,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: isServerless ? 3 : 10,
  idleTimeoutMillis: isServerless ? 10000 : 30000
});

const query = (text, params = []) => pool.query(text, params);

const getClient = () => pool.connect();

const transaction = async (callback) => {
  const client = await getClient();

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
};

module.exports = {
  pool,
  query,
  getClient,
  transaction
};
