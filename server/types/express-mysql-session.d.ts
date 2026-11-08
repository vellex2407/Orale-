declare module 'express-mysql-session' {
  import type session from 'express-session';
  import type { Pool } from 'mysql2/promise';

  interface MySQLSessionStoreOptions {
    clearExpired?: boolean;
    checkExpirationInterval?: number;
    expiration?: number;
    createDatabaseTable?: boolean;
    schema?: {
      tableName?: string;
      columnNames?: {
        session_id?: string;
        expires?: string;
        data?: string;
      };
    };
  }

  interface MySQLSessionStore extends session.Store {
    onReady(): Promise<void>;
  }

  function createMySQLSessionStore(
    sessionModule: typeof session
  ): new (
    options: MySQLSessionStoreOptions,
    connection?: Pool
  ) => MySQLSessionStore;

  export = createMySQLSessionStore;
}
