import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to the database
const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

// Admin user credentials
const adminEmail = 'admin@socialconnect.com';
const adminPassword = 'Admin123!@#';
const adminFirstName = 'EntreeFox';
const adminLastName = '';

try {
  // Check if admin user already exists
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  
  if (existingAdmin) {
    console.log('Admin user already exists!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
  } else {
    // Create admin user
    const insertAdmin = db.prepare(`
      INSERT INTO users (
        email, first_name, last_name, password, user_type, 
        university, phone, is_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Math.floor(Date.now() / 1000);
    
    const result = insertAdmin.run(
      adminEmail,
      adminFirstName,
      adminLastName,
      adminPassword,
      'admin',
      'System University',
      '+1234567890',
      1, // is_verified = true
      now,
      now
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('🆔 User ID:', result.lastInsertRowid);
    console.log('');
    console.log('🚀 You can now log in with these credentials to access the admin dashboard!');
  }
} catch (error) {
  console.error('❌ Error creating admin user:', error.message);
} finally {
  db.close();
}
