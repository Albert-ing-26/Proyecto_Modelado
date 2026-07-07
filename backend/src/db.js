import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'GestorCitasMedicas',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    useUTC: false,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let poolPromise;

export function getPool() {
  if (!poolPromise) {
    console.log(`[Database] Connecting to SQL Server at ${dbConfig.server}:${dbConfig.port}...`);
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then(pool => {
        console.log('[Database] Connected to SQL Server successfully.');
        return pool;
      })
      .catch(err => {
        console.error('[Database] Connection failed!', err.message);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Ejecuta una consulta SQL con parámetros.
 * @param {string} queryStr - Consulta SQL
 * @param {Object} params   - Parámetros { clave: valor }
 */
export async function execQuery(queryStr, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, val] of Object.entries(params)) {
    request.input(key, val);
  }
  return request.query(queryStr);
}

export { sql };
