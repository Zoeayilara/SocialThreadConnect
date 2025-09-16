import { config } from 'dotenv';
config();
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import session from 'express-session';
import SqliteStore from 'better-sqlite3-session-store';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// Debug logging
console.log('Environment variables loaded:', {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure persistent database path
const isProduction = process.env.NODE_ENV === 'production';
const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME;

let dbPath: string;
if (isProduction && isRailway) {
  // Use persistent volume path on Railway
  dbPath = '/app/data/database.db';
  console.log('🚂 Railway production: Using persistent storage at', dbPath);
} else {
  // Extract the file path from the DATABASE_URL for local development
  dbPath = process.env.DATABASE_URL.replace('file:', '');
  console.log('🏠 Local development: Using', dbPath);
}

// Ensure the directory exists
try {
  mkdirSync(dirname(dbPath), { recursive: true });
  console.log('📁 Database directory ensured:', dirname(dbPath));
} catch (error) {
  console.log('📁 Database directory already exists or created');
}

export const sqlite = new Database(dbPath);
console.log('✅ SQLite database initialized at:', dbPath);

// Create saved_posts table if it doesn't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS saved_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )
`);

export const db = drizzle(sqlite, { schema });

// Create session store using SQLite for persistence
const SqliteStoreSession = SqliteStore(session);
export const sessionStore = new SqliteStoreSession({
  client: sqlite,
  expired: {
    clear: true,
    intervalMs: 900000 // 15 minutes
  },
  table: 'sessions'
});