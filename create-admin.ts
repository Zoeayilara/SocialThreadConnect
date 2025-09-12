import { sqlite } from './server/db';

// Admin user credentials
const adminEmail = 'admin@socialconnect.com';
const adminPassword = 'Admin123!@#';
const adminFirstName = 'EntreeFox';
const adminLastName = '';

try {
  // Check if admin user already exists
  const existingAdmin = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  
  if (existingAdmin) {
    console.log('✅ Admin user already exists!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
  } else {
    // Create admin user
    const insertAdmin = sqlite.prepare(`
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
  console.error('❌ Error creating admin user:', error);
} finally {
  sqlite.close();
}
