import 'dotenv/config';
import type { RowDataPacket } from 'mysql2';
import { closePool, getPool } from '../db';

type CountRow = RowDataPacket & { count: number | string };

async function getCount(sql: string, values: string[] = []): Promise<number> {
  const [rows] = await getPool().query<CountRow[]>(sql, values);
  return Number(rows[0]?.count || 0);
}

async function migrateAuth(): Promise<void> {
  const database = process.env.MYSQL_DATABASE || 'orale_clinic';
  const pool = getPool();

  const patientTableCount = await getCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'patients'`,
    [database]
  );
  if (patientTableCount === 0) {
    throw new Error('Run the base database migration before the auth migration.');
  }

  const duplicateUserIdGroups = await getCount(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT user_id
       FROM patients
       WHERE user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) > 1
     ) AS duplicate_user_ids`
  );
  const usersTableCount = await getCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'users'`,
    [database]
  );
  const orphanedUserReferences = usersTableCount > 0
    ? await getCount(
        `SELECT COUNT(*) AS count
         FROM patients p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.user_id IS NOT NULL AND u.id IS NULL`
      )
    : await getCount(
        'SELECT COUNT(*) AS count FROM patients WHERE user_id IS NOT NULL'
      );

  if (duplicateUserIdGroups > 0 || orphanedUserReferences > 0) {
    throw new Error(
      `Auth migration stopped before adding constraints: ${duplicateUserIdGroups} duplicate user ID groups and ${orphanedUserReferences} orphaned patient references were found. Resolve records manually; this migration does not alter or link patient records.`
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      email VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('patient', 'dentist', 'admin') NOT NULL DEFAULT 'patient',
      status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const duplicateEmailGroups = await getCount(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT email
       FROM users
       GROUP BY email
       HAVING COUNT(*) > 1
     ) AS duplicate_emails`
  );
  if (duplicateEmailGroups > 0) {
    throw new Error(
      `Auth migration stopped before adding the email constraint: ${duplicateEmailGroups} duplicate email groups were found in users.`
    );
  }

  const userEmailIndexCount = await getCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'users'
       AND index_name = 'uq_users_email'`,
    [database]
  );
  if (userEmailIndexCount === 0) {
    await pool.query(
      'ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)'
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
      expires INT(11) UNSIGNED NOT NULL,
      data MEDIUMTEXT COLLATE utf8mb4_bin,
      PRIMARY KEY (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
  `);

  const patientUserIndexCount = await getCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'patients'
       AND index_name = 'uq_patients_user_id'`,
    [database]
  );
  if (patientUserIndexCount === 0) {
    await pool.query(
      'ALTER TABLE patients ADD UNIQUE KEY uq_patients_user_id (user_id)'
    );
  }

  const patientUserForeignKeyCount = await getCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.table_constraints
     WHERE constraint_schema = ? AND table_name = 'patients'
       AND constraint_name = 'fk_patients_user' AND constraint_type = 'FOREIGN KEY'`,
    [database]
  );
  if (patientUserForeignKeyCount === 0) {
    await pool.query(`
      ALTER TABLE patients
      ADD CONSTRAINT fk_patients_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
    `);
  }

  console.log(
    'Patient authentication tables and account-link constraints are ready. Existing patient records were preserved.'
  );
}

migrateAuth()
  .catch((error: unknown) => {
    console.error('Patient authentication migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
