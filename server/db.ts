import { config } from 'dotenv';
config();
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "../shared/schema";
import session from 'express-session';
// @ts-ignore - Type declaration exists but TypeScript may need restart
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

// Create orders table if it doesn't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    customer_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    size TEXT,
    total_amount REAL NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_reference TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending',
    payment_verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )
`);

// Clean up products without Paystack integration (one-time migration)
// This removes products created before the payment system was integrated
try {
  const productsWithoutPaystack = sqlite.prepare(`
    SELECT COUNT(*) as count FROM products WHERE paystack_subaccount_code IS NULL
  `).get() as any;
  
  if (productsWithoutPaystack.count > 0) {
    console.log(`🧹 Found ${productsWithoutPaystack.count} products without Paystack integration. Cleaning up...`);
    sqlite.prepare(`DELETE FROM products WHERE paystack_subaccount_code IS NULL`).run();
    console.log('✅ Old products without payment integration removed');
  }
} catch (error: any) {
  if (error.message.includes('no such column')) {
    console.log('⚠️ Products table needs paystack_subaccount_code column - will be added on next product creation');
  } else {
    console.error('Error cleaning up old products:', error);
  }
}

// Add theme column to users table if it doesn't exist
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'`);
  console.log('✅ Theme column added to users table');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('✅ Theme column already exists');
  } else {
    console.error('Error adding theme column:', error);
  }
}

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