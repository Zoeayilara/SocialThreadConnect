// One-time helper to add media columns to posts table if they don't exist
const Database = require('better-sqlite3');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = dbUrl.replace('file:', '');
const db = new Database(dbPath);

function columnExists(table, column) {
  const stmt = db.prepare(`PRAGMA table_info(${table});`);
  const rows = stmt.all();
  return rows.some(r => r.name === column);
}

db.exec('BEGIN');
try {
  if (!columnExists('posts', 'media_urls')) {
    db.exec(`ALTER TABLE posts ADD COLUMN media_urls text;`);
    console.log('Added posts.media_urls');
  } else {
    console.log('posts.media_urls already exists');
  }

  if (!columnExists('posts', 'media_type')) {
    db.exec(`ALTER TABLE posts ADD COLUMN media_type text;`);
    console.log('Added posts.media_type');
  } else {
    console.log('posts.media_type already exists');
  }

  db.exec('COMMIT');
  console.log('Done.');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('Failed:', e.message);
  process.exit(1);
}


