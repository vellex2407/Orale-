import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { closePool, getDatabaseConfig } from '../db';

const schemaPath = resolve(process.cwd(), 'database', 'schema.sql');

async function migrate(): Promise<void> {
  const sourceSchema = await readFile(schemaPath, 'utf8');
  const { host, port, user, password, database } = getDatabaseConfig();
  const schema = sourceSchema.replaceAll('orale_clinic', database);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    await connection.query(schema);
    console.log('MySQL schema created or verified successfully.');
  } finally {
    await connection.end();
    await closePool();
  }
}

migrate().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
