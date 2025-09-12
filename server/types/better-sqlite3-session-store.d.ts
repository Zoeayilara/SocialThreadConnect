declare module 'better-sqlite3-session-store' {
  import { Store } from 'express-session';
  import Database from 'better-sqlite3';

  interface SqliteStoreOptions {
    client: Database.Database;
    expired?: {
      clear?: boolean;
      intervalMs?: number;
    };
    table?: string;
  }

  class SqliteStore extends Store {
    constructor(options: SqliteStoreOptions);
  }

  function SqliteStoreFactory(session: any): typeof SqliteStore;
  export = SqliteStoreFactory;
}
