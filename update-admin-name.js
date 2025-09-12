import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to the database
const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

try {
  // Update admin user name
  const result = db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE email = ?')
    .run('EntreeFox', '', 'admin@socialconnect.com');
  
  if (result.changes > 0) {
    console.log('✅ Admin name updated to EntreeFox successfully!');
  } else {
    console.log('❌ No admin user found with email admin@socialconnect.com');
  }
} catch (error) {
  console.error('Error updating admin name:', error);
} finally {
  db.close();
}
