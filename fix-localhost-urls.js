const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

console.log('🔄 Starting localhost URL migration...');

try {
  // Update posts table - fix mediaUrl and imageUrl fields
  const postsWithMedia = db.prepare(`
    SELECT id, mediaUrl, imageUrl 
    FROM posts 
    WHERE mediaUrl LIKE '%localhost:5000%' OR imageUrl LIKE '%localhost:5000%'
  `).all();

  console.log(`Found ${postsWithMedia.length} posts with localhost URLs`);

  const updatePostStmt = db.prepare(`
    UPDATE posts 
    SET mediaUrl = ?, imageUrl = ? 
    WHERE id = ?
  `);

  for (const post of postsWithMedia) {
    let newMediaUrl = post.mediaUrl;
    let newImageUrl = post.imageUrl;

    if (newMediaUrl) {
      newMediaUrl = newMediaUrl.replace(/http:\/\/localhost:5000/g, 'https://web-production-aff5b.up.railway.app');
    }
    
    if (newImageUrl) {
      newImageUrl = newImageUrl.replace(/http:\/\/localhost:5000/g, 'https://web-production-aff5b.up.railway.app');
    }

    updatePostStmt.run(newMediaUrl, newImageUrl, post.id);
    console.log(`✅ Updated post ${post.id}`);
  }

  // Update users table - fix profile_image_url field
  const usersWithProfileImages = db.prepare(`
    SELECT id, profile_image_url 
    FROM users 
    WHERE profile_image_url LIKE '%localhost:5000%'
  `).all();

  console.log(`Found ${usersWithProfileImages.length} users with localhost profile image URLs`);

  const updateUserStmt = db.prepare(`
    UPDATE users 
    SET profile_image_url = ? 
    WHERE id = ?
  `);

  for (const user of usersWithProfileImages) {
    const newProfileImageUrl = user.profile_image_url.replace(/http:\/\/localhost:5000/g, 'https://web-production-aff5b.up.railway.app');
    updateUserStmt.run(newProfileImageUrl, user.id);
    console.log(`✅ Updated user ${user.id} profile image`);
  }

  console.log('🎉 Migration completed successfully!');
  console.log(`Updated ${postsWithMedia.length} posts and ${usersWithProfileImages.length} user profiles`);

} catch (error) {
  console.error('❌ Migration failed:', error);
} finally {
  db.close();
}
