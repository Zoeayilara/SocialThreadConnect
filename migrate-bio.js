const Database = require('better-sqlite3');
const path = require('path');

// Open the database
const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

try {
  console.log('Adding bio, link, and isPrivate columns to users table...');
  
  // Add the new columns
  db.exec(`
    ALTER TABLE users ADD COLUMN bio TEXT;
    ALTER TABLE users ADD COLUMN link TEXT;
    ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0;
  `);
  
  console.log('Migration completed successfully!');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Columns already exist, skipping migration.');
  } else {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
} finally {
  db.close();
}
