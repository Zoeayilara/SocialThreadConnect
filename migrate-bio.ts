import Database from 'better-sqlite3';
import path from 'path';

// Open the database
const dbPath = path.join(process.cwd(), 'dev.db');
const db = new Database(dbPath);

try {
  console.log('Adding bio, link, and isPrivate columns to users table...');
  
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  if (!columnNames.includes('bio')) {
    db.exec('ALTER TABLE users ADD COLUMN bio TEXT;');
    console.log('Added bio column');
  }
  
  if (!columnNames.includes('link')) {
    db.exec('ALTER TABLE users ADD COLUMN link TEXT;');
    console.log('Added link column');
  }
  
  if (!columnNames.includes('is_private')) {
    db.exec('ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0;');
    console.log('Added is_private column');
  }
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
