import mysql, { type Pool } from 'mysql2/promise';

let pool: Pool | undefined;

function getDatabaseConfig() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE || 'orale_clinic';
  const password = process.env.MYSQL_PASSWORD;
  const port = Number(process.env.MYSQL_PORT || '3306');

  if (
    !host ||
    !user ||
    !/^[a-zA-Z0-9_]+$/.test(database) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('Configure MYSQL_HOST, MYSQL_USER, a valid MYSQL_DATABASE, and a valid MYSQL_PORT in .env.');
  }

  return { host, user, database, password, port };
}

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...getDatabaseConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      timezone: 'Z',
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export { getDatabaseConfig };
