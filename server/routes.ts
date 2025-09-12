import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, loginUser, generateUserToken } from "./auth";
import { emailService } from "./emailService";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { z } from "zod";
import { db, sqlite } from "./db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

// Utility function to get the correct base URL for media files
function getBaseUrl(): string {
  // Use BASE_URL if set, otherwise detect environment
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  return process.env.RAILWAY_ENVIRONMENT_NAME 
    ? 'https://web-production-aff5b.up.railway.app' 
    : 'http://localhost:5000';
}

// Database migration function to add missing columns
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Check if columns exist by querying table info using the raw SQLite connection
    const tableInfo = sqlite.prepare('PRAGMA table_info(users)').all();
    const columnNames = tableInfo.map((col: any) => col.name);
    
    // Check posts table columns
    const postsTableInfo = sqlite.prepare('PRAGMA table_info(posts)').all();
    const postsColumnNames = postsTableInfo.map((col: any) => col.name);
    
    // Add bio column if missing
    if (!columnNames.includes('bio')) {
      try {
        sqlite.exec('ALTER TABLE users ADD COLUMN bio TEXT');
        console.log('Added bio column');
      } catch (error: any) {
        console.error('Error adding bio column:', error.message);
      }
    } else {
      console.log('Bio column already exists');
    }
    
    // Add link column if missing
    if (!columnNames.includes('link')) {
      try {
        sqlite.exec('ALTER TABLE users ADD COLUMN link TEXT');
        console.log('Added link column');
      } catch (error: any) {
        console.error('Error adding link column:', error.message);
      }
    } else {
      console.log('Link column already exists');
    }
    
    // Add is_private column if missing
    if (!columnNames.includes('is_private')) {
      try {
        sqlite.exec('ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0');
        console.log('Added is_private column');
      } catch (error: any) {
        console.error('Error adding is_private column:', error.message);
      }
    } else {
      console.log('Is_private column already exists');
    }
    
    // Add university_handle column if missing
    if (!columnNames.includes('university_handle')) {
      try {
        sqlite.exec('ALTER TABLE users ADD COLUMN university_handle TEXT');
        console.log('Added university_handle column');
      } catch (error: any) {
        console.error('Error adding university_handle column:', error.message);
      }
    } else {
      console.log('University_handle column already exists');
    }
    
    // Add comment reply columns if missing
    const commentsTableInfo = sqlite.prepare('PRAGMA table_info(comments)').all();
    const commentColumnNames = commentsTableInfo.map((col: any) => col.name);
    
    if (!commentColumnNames.includes('parent_id')) {
      try {
        sqlite.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE');
        console.log('Added parent_id column to comments');
      } catch (error: any) {
        console.error('Error adding parent_id column:', error.message);
      }
    } else {
      console.log('Parent_id column already exists in comments');
    }
    
    if (!commentColumnNames.includes('replies_count')) {
      try {
        sqlite.exec('ALTER TABLE comments ADD COLUMN replies_count INTEGER DEFAULT 0');
        console.log('Added replies_count column to comments');
      } catch (error: any) {
        console.error('Error adding replies_count column:', error.message);
      }
    } else {
      console.log('Replies_count column already exists in comments');
    }
    
    // Add media columns to posts table if missing
    if (!postsColumnNames.includes('media_url')) {
      try {
        sqlite.exec('ALTER TABLE posts ADD COLUMN media_url TEXT');
        console.log('Added media_url column to posts');
      } catch (error: any) {
        console.error('Error adding media_url column:', error.message);
      }
    } else {
      console.log('Media_url column already exists in posts');
    }
    
    if (!postsColumnNames.includes('media_type')) {
      try {
        sqlite.exec('ALTER TABLE posts ADD COLUMN media_type TEXT');
        console.log('Added media_type column to posts');
      } catch (error: any) {
        console.error('Error adding media_type column:', error.message);
      }
    } else {
      console.log('Media_type column already exists in posts');
    }
    
    // Create reposts table if it doesn't exist
    try {
      const repostsTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reposts'").get();
      if (!repostsTableExists) {
        sqlite.exec(`
          CREATE TABLE reposts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            created_at INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
          )
        `);
        console.log('Created reposts table');
      } else {
        console.log('Reposts table already exists');
      }
    } catch (error: any) {
      console.error('Error creating reposts table:', error.message);
    }

    // Create messages table if it doesn't exist
    try {
      const messagesTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get();
      if (!messagesTableExists) {
        sqlite.exec(`
          CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senderId INTEGER NOT NULL,
            recipientId INTEGER NOT NULL,
            content TEXT,
            imageUrl TEXT,
            createdAt INTEGER DEFAULT (unixepoch('now')),
            FOREIGN KEY (senderId) REFERENCES users(id),
            FOREIGN KEY (recipientId) REFERENCES users(id)
          )
        `);
        console.log('Messages table created');
      } else {
        // Check if imageUrl column exists, add it if not
        try {
          sqlite.prepare("SELECT imageUrl FROM messages LIMIT 1").get();
        } catch {
          sqlite.exec("ALTER TABLE messages ADD COLUMN imageUrl TEXT");
          console.log('ImageUrl column added to messages table');
        }
        
        // Check if createdAt column is INTEGER type, update if needed
        const tableInfo = sqlite.prepare("PRAGMA table_info(messages)").all() as Array<{name: string, type: string}>;
        const createdAtColumn = tableInfo.find((col) => col.name === 'createdAt');
        
        if (createdAtColumn && createdAtColumn.type !== 'INTEGER') {
          // Create new table with correct schema
          sqlite.exec(`
            CREATE TABLE messages_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              senderId INTEGER NOT NULL,
              recipientId INTEGER NOT NULL,
              content TEXT,
              imageUrl TEXT,
              createdAt INTEGER DEFAULT (unixepoch('now')),
              FOREIGN KEY (senderId) REFERENCES users(id),
              FOREIGN KEY (recipientId) REFERENCES users(id)
            )
          `);
          
          // Copy data, converting datetime to unix timestamp
          sqlite.exec(`
            INSERT INTO messages_new (id, senderId, recipientId, content, imageUrl, createdAt)
            SELECT id, senderId, recipientId, content, imageUrl, 
                   CASE 
                     WHEN createdAt IS NULL THEN unixepoch('now')
                     ELSE unixepoch(createdAt)
                   END
            FROM messages
          `);
          
          // Replace old table
          sqlite.exec("DROP TABLE messages");
          sqlite.exec("ALTER TABLE messages_new RENAME TO messages");
          console.log('Messages table updated to use INTEGER timestamps');
        }
      }
      
      // Check if posts table has media columns, add them if not
      try {
        sqlite.prepare("SELECT mediaUrl FROM posts LIMIT 1").get();
      } catch {
        sqlite.exec(`
          ALTER TABLE posts ADD COLUMN mediaUrl TEXT;
          ALTER TABLE posts ADD COLUMN mediaType TEXT;
        `);
        console.log('Added media columns to posts table');
      }
      
      console.log('Messages table already exists');
    } catch (error: any) {
      console.error('Error creating messages table:', error.message);
    }
    
    // Create admin user if it doesn't exist
    const adminEmail = 'admin@socialconnect.com';
    const existingAdmin = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
    
    if (!existingAdmin) {
      const now = Math.floor(Date.now() / 1000);
      const insertAdmin = sqlite.prepare(`
        INSERT INTO users (
          email, first_name, last_name, password, user_type, 
          university, phone, is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertAdmin.run(
        adminEmail,
        'EntreeFox',
        '',
        'Admin123!@#',
        'admin',
        'System University',
        '+1234567890',
        1, // is_verified = true
        now,
        now
      );
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password: Admin123!@#');
      console.log('🆔 User ID:', result.lastInsertRowid);
    } else {
      console.log('Admin user already exists');
    }
    
    // Fix localhost URLs in existing data
    console.log('🔄 Fixing localhost URLs in existing data...');
    
    // Update posts table - fix mediaUrl and imageUrl fields
    const postsWithMedia = sqlite.prepare(`
      SELECT id, media_url, image_url 
      FROM posts 
      WHERE media_url LIKE '%localhost:5000%' OR image_url LIKE '%localhost:5000%'
    `).all();

    console.log(`Found ${postsWithMedia.length} posts with localhost URLs`);

    if (postsWithMedia.length > 0) {
      const updatePostStmt = sqlite.prepare(`
        UPDATE posts 
        SET media_url = ?, image_url = ? 
        WHERE id = ?
      `);

      for (const post of postsWithMedia) {
        let newMediaUrl = (post as any).media_url;
        let newImageUrl = (post as any).image_url;

        if (newMediaUrl) {
          newMediaUrl = newMediaUrl.replace(/http:\/\/localhost:5000/g, 'https://web-production-aff5b.up.railway.app');
        }
        
        if (newImageUrl) {
          newImageUrl = newImageUrl.replace(/http:\/\/localhost:5000/g, 'https://web-production-aff5b.up.railway.app');
        }

        updatePostStmt.run(newMediaUrl, newImageUrl, (post as any).id);
        console.log(`✅ Updated post ${(post as any).id}`);
      }
    }

    // Update users table - fix profile_image_url field
    const usersWithProfileImages = sqlite.prepare(`
      SELECT id, profile_image_url 
      FROM users 
      WHERE profile_image_url LIKE '%localhost:5000%'
    `).all();

    console.log(`Found ${usersWithProfileImages.length} users with localhost profile image URLs`);

    if (usersWithProfileImages.length > 0) {
      const updateUserStmt = sqlite.prepare(`
        UPDATE users 
        SET profile_image_url = ? 
        WHERE id = ?
      `);

      for (const user of usersWithProfileImages) {
        const newProfileImageUrl = (user as any).profile_image_url.replace(/http:\/\/localhost:5000/g, 'https://web-production-aff5b.up.railway.app');
        updateUserStmt.run(newProfileImageUrl, (user as any).id);
        console.log(`✅ Updated user ${(user as any).id} profile image`);
      }
    }

    console.log('🎉 URL migration completed!');
    console.log('Database migrations completed');
} catch (error) {
  console.error('Migration failed:', error);
}
}


// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
  fileFilter: (_, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Only images and videos are supported.`));
    }
  }
});

// Validation schemas

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


const createCommentSchema = z.object({
  postId: z.number(),
  content: z.string().min(1, "Comment content is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Run database migrations first
  await runMigrations();
  
  // Add placeholder endpoint for avatar images
  app.get('/api/placeholder/:width/:height', (req, res) => {
    const { width, height } = req.params;
    
    // Generate a simple SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#6B7280"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial, sans-serif" font-size="${Math.min(parseInt(width), parseInt(height)) * 0.3}">?</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });
  
  // Auth middleware
  setupAuth(app);

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Debug: Log the uploads directory path
  const uploadsPath = path.join(__dirname, '../uploads');
  console.log('Uploads directory path:', uploadsPath);
  console.log('Uploads directory exists:', fs.existsSync(uploadsPath));
  
  app.use('/uploads', express.static(uploadsPath));
  
  // Health check endpoint for Railway
  app.get('/api/health', (_, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Add middleware to log all requests to /uploads
  app.use('/uploads/*', (req, _, next) => {
    console.log('Request to uploads:', req.originalUrl);
    console.log('Requested file:', req.url);
    next();
  });
  
  // Debug route to test uploads access
  app.get('/test-uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    console.log('Testing file access:', filePath);
    console.log('File exists:', fs.existsSync(filePath));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId; // Use req.userId instead of req.session.userId
      const user = await storage.getUserById(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register route
  app.post('/api/register', async (req, res) => {
    try {
      console.log('🔥 Registration request received:', req.body);
      const { name, university, email, phone, password, userType } = req.body;
      
      if (!name || !university || !email || !phone || !password || !userType) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create user
      const user = await storage.createUser({
        firstName,
        lastName,
        email,
        phone,
        password, // Note: should be hashed in production
        university,
        userType,
        bio: null,
        link: null,
        universityHandle: null,
        profileImageUrl: null,
        isPrivate: 0,
        isVerified: 0
      });

      // Generate JWT token for auto-login after registration
      const token = generateUserToken(user);
      console.log('🔑 Generated JWT token for new user:', user.id);
      
      // Set session for backward compatibility
      (req.session as any).userId = user.id;
      console.log('🔑 Setting userId in session:', user.id, 'Session ID:', req.sessionID);
      console.log('🔍 Session before save:', JSON.stringify(req.session, null, 2));
      
      // Save the session explicitly and wait for it
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Session save error during registration:', err);
            reject(err);
          } else {
            console.log('✅ Registration session saved successfully for user:', user.id, 'Session ID:', req.sessionID);
            console.log('🔍 Session after save:', JSON.stringify(req.session, null, 2));
            resolve();
          }
        });
      });

      res.json({ 
        message: "Registration successful", 
        token: token, // Include JWT token in response
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await loginUser(email, password);
      
      // Generate JWT token
      const token = generateUserToken(user);
      console.log('🔑 Generated JWT token for user:', user.id);
      
      // Set session for backward compatibility
      (req.session as any).userId = user.id;
      console.log('🔑 Setting userId in session:', user.id, 'Session ID:', req.sessionID);
      
      // Save session and wait for completion
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Session save error during login:', err);
            reject(err);
          } else {
            console.log('✅ Login session saved successfully for user:', user.id, 'Session ID:', req.sessionID);
            resolve();
          }
        });
      });
      
      res.json({ 
        message: "Login successful",
        token: token, // Include JWT token in response
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          profileImageUrl: user.profileImageUrl,
          university: user.university,
          phone: user.phone,
          bio: user.bio,
          link: user.link,
          isPrivate: user.isPrivate
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Profile picture upload
  app.post('/api/upload-profile-picture', isAuthenticated, upload.single('profilePicture'), async (req: any, res) => {
    try {
      console.log('Upload request received, user ID:', req.userId);
      console.log('File received:', req.file ? req.file.originalname : 'No file');
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.userId;
      
      // Only allow images for profile pictures
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed for profile pictures" });
      }
      
      // Generate filename and save file
      const fileName = `profile-${userId}-${Date.now()}.${req.file.originalname.split('.').pop()}`;
      const filePath = path.join(__dirname, '../uploads', fileName);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      const profileImageUrl = `/uploads/${fileName}`;
      const fullProfileImageUrl = `${getBaseUrl()}${profileImageUrl}`;
      
      await storage.updateUser(userId, { profileImageUrl: fullProfileImageUrl });

      res.json({ profileImageUrl: fullProfileImageUrl });
    } catch (error) {
      console.log('Profile picture upload error:', error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Add error handling middleware for multer
  app.use((error: any, _req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${error.message}` });
    }
    if (error.message && error.message.includes('File type')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  });

  // Single image upload (legacy)
  app.post('/api/upload-post-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Post image upload error:", error);
      res.status(500).json({ message: "Image upload failed" });
    }
  });

  // Multiple media upload (images/videos)
  app.post('/api/upload-post-media', upload.array('media', 10), async (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (!files.length) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const items = files.map(f => ({ url: `/uploads/${f.filename}`, mime: f.mimetype }));
      // Also return a JSON string that can be stored in imageUrl
      const asJsonString = JSON.stringify(items.map(i => i.url));
      res.json({ items, imageUrl: asJsonString });
    } catch (error) {
      console.error("Post media upload error:", error);
      res.status(500).json({ message: "Media upload failed" });
    }
  });

  // Forgot password routes
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email address" });
      }
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Math.floor((Date.now() + 10 * 60 * 1000) / 1000); // 10 minutes from now as Unix timestamp

      // Save OTP to database
      await storage.createOtp({ email, code: otp, expiresAt });
      
      // Send OTP email
      const emailSent = await emailService.sendOtpEmail(email, otp, user.firstName || undefined);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send OTP email" });
      }

      res.json({ message: "OTP sent to your email" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      
      const validOtp = await storage.getValidOtp(email, otp);
      
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      res.json({ message: "OTP verified successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "OTP verification failed" });
    }
  });

  // Reset password
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { email, otp, password } = resetPasswordSchema.parse(req.body);
      
      const validOtp = await storage.getValidOtp(email, otp);
      
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(validOtp.id);

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password (if user exists)
      const user = await storage.getUserByEmail(email);
      if (user) {
        await storage.updateUser(user.id, { password: hashedPassword });
      }

      // Send password change notification
      await emailService.sendPasswordChangeNotification(email, user?.firstName || undefined);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Social media routes
  app.get('/api/posts', isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const sortBy = req.query.sortBy as string || 'algorithm'; // 'algorithm', 'recent', 'popular'

      const posts = await storage.getPosts(limit, offset, sortBy);

      // Enrich posts with like and repost status for current user
      const userId = req.userId as number;
      const enriched = await Promise.all(
        posts.map(async (p) => {
          console.log('Post data:', { id: p.id, mediaUrl: p.mediaUrl, mediaType: p.mediaType });
          return {
            ...p,
            isLiked: await storage.isPostLiked(userId, p.id),
            isReposted: await storage.isPostReposted(userId, p.id),
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post('/api/posts', isAuthenticated, upload.array('media', 10), async (req: any, res) => {
    try {
      const userId = req.userId;
      const { content } = req.body;
      
      console.log('Post creation request:', { userId, content, hasFiles: !!req.files });
      
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
      
      // Validate content or files exist
      if (!content?.trim() && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ message: "Post must have content or media" });
      }
      
      // Handle multiple file uploads
      if (req.files && req.files.length > 0) {
        console.log('Multiple files upload details:', req.files.map((f: any) => ({ 
          originalname: f.originalname, 
          mimetype: f.mimetype, 
          size: f.size 
        })));
        
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
          console.log('Created uploads directory:', uploadsDir);
        }
        
        for (const file of req.files) {
          const fileName = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.originalname.split('.').pop()}`;
          const filePath = path.join(__dirname, '../uploads', fileName);
          
          fs.writeFileSync(filePath, file.buffer);
          mediaUrls.push(`/uploads/${fileName}`);
          mediaTypes.push(file.mimetype.startsWith('image/') ? 'image' : 'video');
        }
        
        console.log('Files saved:', { mediaUrls, mediaTypes });
      }
      
      const post = await storage.createPost({
        userId,
        content: (content || "").trim(),
        imageUrl: mediaUrls.length > 0 ? JSON.stringify(mediaUrls.map(url => `${getBaseUrl()}${url}`)) : null,
        mediaUrl: mediaUrls.length > 0 ? JSON.stringify(mediaUrls.map(url => `${getBaseUrl()}${url}`)) : null,
        mediaType: mediaTypes.length > 0 ? JSON.stringify(mediaTypes) : null,
      });

      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Update post
  app.put('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const postId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }

      const updatedPost = await storage.updatePost(postId, userId, content.trim());
      
      if (!updatedPost) {
        return res.status(404).json({ message: "Post not found or you don't have permission to edit it" });
      }

      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  // Delete post
  app.delete('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const postId = parseInt(req.params.id);

      const deleted = await storage.deletePost(postId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Post not found or you don't have permission to delete it" });
      }

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  app.post('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const postId = parseInt(req.params.id);

      const isLiked = await storage.isPostLiked(userId, postId);
      
      if (isLiked) {
        await storage.unlikePost(userId, postId);
        res.json({ liked: false });
      } else {
        await storage.likePost(userId, postId);
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Explicit unlike route (to support clients calling /unlike directly)
  app.post('/api/posts/:id/unlike', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const postId = parseInt(req.params.id);
      await storage.unlikePost(userId, postId);
      res.json({ liked: false });
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  app.post('/api/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const commentData = createCommentSchema.parse(req.body);
      
      const comment = await storage.createComment({
        userId,
        postId: commentData.postId,
        content: commentData.content,
      });

      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Create comment via /api/posts/:id/comments
  app.post('/api/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const postId = parseInt(req.params.id);
      const bodySchema = z.object({ 
        content: z.string().min(1),
        parentId: z.number().optional()
      });
      const { content, parentId } = bodySchema.parse(req.body);
      
      const comment = await storage.createComment({
        userId,
        postId,
        content,
        parentId,
      });

      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating comment (post route):", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

// ... (rest of the code remains the same)
  app.get('/api/posts/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getCommentsByPostId(postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Follow / Unfollow
  app.post('/api/follow/:id', isAuthenticated, async (req: any, res) => {
    try {
      const followerId = req.userId as number;
      const followingId = parseInt(req.params.id);
      await storage.followUser(followerId, followingId);
      res.json({ following: true });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.post('/api/unfollow/:id', isAuthenticated, async (req: any, res) => {
    try {
      const followerId = req.userId as number;
      const followingId = parseInt(req.params.id);
      await storage.unfollowUser(followerId, followingId);
      res.json({ following: false });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // User search by name or email
  app.get('/api/users/search', isAuthenticated, async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim().toLowerCase();
      if (!q) return res.json([]);
      const currentUserId = req.userId as number;
      
      // naive search in sqlite using LIKE via drizzle
      const results = await db
        .select()
        .from(users)
        .where(sql`lower(${users.firstName}) like ${'%' + q + '%'} or lower(${users.lastName}) like ${'%' + q + '%'} or lower(${users.email}) like ${'%' + q + '%'}`)
        .limit(20);
      
      // Add follow status for each user
      const resultsWithFollowStatus = await Promise.all(
        results.map(async (u) => {
          const isFollowing = await storage.isFollowing(currentUserId, u.id);
          return {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            profileImageUrl: u.profileImageUrl,
            isFollowing
          };
        })
      );
      
      res.json(resultsWithFollowStatus);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get user profile by ID
  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        universityHandle: user.universityHandle,
        profileImageUrl: user.profileImageUrl,
        university: user.university,
        phone: user.phone,
        userType: user.userType,
        bio: user.bio,
        link: user.link,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user's posts
  app.get('/api/users/:id/posts', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const posts = await storage.getUserPosts(userId);
      
      // Enrich posts with like and repost status for current user
      const currentUserId = (req as any).userId as number;
      const enriched = await Promise.all(
        posts.map(async (p: any) => ({
          ...p,
          isLiked: await storage.isPostLiked(currentUserId, p.id),
          isReposted: await storage.isPostReposted(currentUserId, p.id),
        }))
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  // Get user's reposts
  app.get('/api/users/:id/reposts', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const reposts = await storage.getUserReposts(userId);
      
      // Enrich posts with like and repost status for current user
      const currentUserId = (req as any).userId as number;
      const enriched = await Promise.all(
        reposts.map(async (p: any) => ({
          ...p,
          isLiked: await storage.isPostLiked(currentUserId, p.id),
          isReposted: await storage.isPostReposted(currentUserId, p.id),
        }))
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching user reposts:", error);
      res.status(500).json({ message: "Failed to fetch user reposts" });
    }
  });

  // Get user's followers count and follow status
  app.get('/api/users/:id/followers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.userId as number;
      const count = await storage.getFollowerCount(userId);
      const isFollowing = await storage.isFollowing(currentUserId, userId);
      res.json({ count, isFollowing });
    } catch (error) {
      console.error("Error fetching follower data:", error);
      res.status(500).json({ message: "Failed to fetch follower data" });
    }
  });

  // Repost/unrepost a post
  app.post('/api/posts/:id/repost', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const postId = parseInt(req.params.id);
      
      const result = await storage.toggleRepost(userId, postId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling repost:", error);
      res.status(500).json({ message: "Failed to toggle repost" });
    }
  });

  // Update user profile
  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const { firstName, lastName, bio, link, universityHandle, isPrivate } = req.body;
      
      await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        bio,
        link,
        universityHandle,
        isPrivate
      });
      
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Saved posts endpoints
  app.post('/api/posts/:id/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const postId = parseInt(req.params.id);
      
      // Check if already saved
      const isAlreadySaved = await storage.isPostSaved(userId, postId);
      if (isAlreadySaved) {
        return res.status(400).json({ message: "Post already saved" });
      }
      
      await storage.savePost(userId, postId);
      res.json({ message: "Post saved successfully" });
    } catch (error) {
      console.error("Error saving post:", error);
      res.status(500).json({ message: "Failed to save post" });
    }
  });

  app.delete('/api/posts/:id/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const postId = parseInt(req.params.id);
      
      await storage.unsavePost(userId, postId);
      res.json({ message: "Post unsaved successfully" });
    } catch (error) {
      console.error("Error unsaving post:", error);
      res.status(500).json({ message: "Failed to unsave post" });
    }
  });

  app.get('/api/saved-posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const savedPosts = await storage.getSavedPosts(userId);
      res.json(savedPosts);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      res.status(500).json({ message: "Failed to fetch saved posts" });
    }
  });

  app.get('/api/posts/:id/saved-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const postId = parseInt(req.params.id);
      
      const isSaved = await storage.isPostSaved(userId, postId);
      res.json({ isSaved });
    } catch (error) {
      console.error("Error checking saved status:", error);
      res.status(500).json({ message: "Failed to check saved status" });
    }
  });

  // Get user activities
  app.get('/api/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      // Get recent activities - likes, comments, and reposts on user's posts
      const activities = sqlite.prepare(`
        SELECT 
          'like' as type,
          l.created_at as timestamp,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.profile_image_url,
          p.id as post_id,
          p.content as post_content,
          p.likes_count,
          p.comments_count
        FROM likes l
        JOIN users u ON l.user_id = u.id
        JOIN posts p ON l.post_id = p.id
        WHERE p.user_id = ? AND l.user_id != ?
        
        UNION ALL
        
        SELECT 
          'comment' as type,
          c.created_at as timestamp,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.profile_image_url,
          p.id as post_id,
          c.content as post_content,
          p.likes_count,
          p.comments_count
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN posts p ON c.post_id = p.id
        WHERE p.user_id = ? AND c.user_id != ?
        
        UNION ALL
        
        SELECT 
          'repost' as type,
          r.created_at as timestamp,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.profile_image_url,
          p.id as post_id,
          p.content as post_content,
          p.likes_count,
          p.comments_count
        FROM reposts r
        JOIN users u ON r.user_id = u.id
        JOIN posts p ON r.post_id = p.id
        WHERE p.user_id = ? AND r.user_id != ?
        
        ORDER BY timestamp DESC
        LIMIT 50
      `).all(userId, userId, userId, userId, userId, userId);
      
      res.json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  // Admin middleware to check if user is admin
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.userId;
      const user = await storage.getUserById(userId);
      
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ message: "Admin verification failed" });
    }
  };

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string || '';
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, email, first_name, last_name, user_type, is_verified, 
               university, phone, created_at, profile_image_url
        FROM users
      `;
      let params: any[] = [];

      if (search.trim()) {
        query += ` WHERE lower(first_name) LIKE ? OR lower(last_name) LIKE ? OR lower(email) LIKE ?`;
        const searchTerm = `%${search.toLowerCase()}%`;
        params = [searchTerm, searchTerm, searchTerm];
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const users = sqlite.prepare(query).all(...params);
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      let countParams: any[] = [];
      
      if (search.trim()) {
        countQuery += ` WHERE lower(first_name) LIKE ? OR lower(last_name) LIKE ? OR lower(email) LIKE ?`;
        const searchTerm = `%${search.toLowerCase()}%`;
        countParams = [searchTerm, searchTerm, searchTerm];
      }
      
      const totalResult = sqlite.prepare(countQuery).get(...countParams) as { total: number };
      const total = totalResult.total;

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users for admin:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Verify/unverify user
  app.put('/api/admin/users/:id/verify', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isVerified } = req.body;
      
      const result = sqlite.prepare(`
        UPDATE users SET is_verified = ? WHERE id = ?
      `).run(isVerified ? 1 : 0, userId);

      if (result.changes === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = await storage.getUserById(userId);
      res.json({ 
        message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          isVerified: isVerified
        }
      });
    } catch (error) {
      console.error("Error updating user verification:", error);
      res.status(500).json({ message: "Failed to update user verification" });
    }
  });

  // Get admin dashboard stats
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const totalUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const verifiedUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get() as { count: number };
      const totalPosts = sqlite.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
      const totalComments = sqlite.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number };

      res.json({
        totalUsers: totalUsers.count,
        verifiedUsers: verifiedUsers.count,
        unverifiedUsers: totalUsers.count - verifiedUsers.count,
        totalPosts: totalPosts.count,
        totalComments: totalComments.count
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    console.log('🚪 Logout request received');
    
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        return res.status(500).json({ error: "Could not log out" });
      }
      
      console.log('✅ Session destroyed successfully');
      
      // Clear all cookies
      res.clearCookie('connect.sid');
      res.clearCookie('authToken'); // Clear any auth token cookie if exists
      
      // Set headers to prevent caching
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
      
      res.json({ 
        message: "Logged out successfully",
        clearToken: true // Signal to client to clear JWT token
      });
    });
  });

  // Delete account route
  app.delete("/api/account/delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      // Delete user's posts first (due to foreign key constraints)
      sqlite.prepare('DELETE FROM posts WHERE user_id = ?').run(userId);
      
      // Delete user's comments
      sqlite.prepare('DELETE FROM comments WHERE user_id = ?').run(userId);
      
      // Delete user's likes
      sqlite.prepare('DELETE FROM likes WHERE user_id = ?').run(userId);
      
      // Delete user's saved posts
      sqlite.prepare('DELETE FROM saved_posts WHERE user_id = ?').run(userId);
      
      // Delete user's reposts
      sqlite.prepare('DELETE FROM reposts WHERE user_id = ?').run(userId);
      
      // Finally delete the user
      sqlite.prepare('DELETE FROM users WHERE id = ?').run(userId);
      
      // Destroy session
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      
      res.clearCookie('connect.sid');
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Get user's conversations with last message
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.userId as number;
      console.log('Fetching conversations for user:', currentUserId);
      
      // Get conversations ordered by most recent message
      const conversations = sqlite.prepare(`
        SELECT DISTINCT
          CASE 
            WHEN m.senderId = ? THEN m.recipientId 
            ELSE m.senderId 
          END as otherUserId,
          u.first_name as firstName,
          u.last_name as lastName,
          u.email,
          u.profile_image_url as profileImageUrl,
          MAX(m.createdAt) as lastMessageTime
        FROM messages m
        JOIN users u ON (
          CASE 
            WHEN m.senderId = ? THEN u.id = m.recipientId 
            ELSE u.id = m.senderId 
          END
        )
        WHERE m.senderId = ? OR m.recipientId = ?
        GROUP BY otherUserId
        ORDER BY lastMessageTime DESC
      `).all(currentUserId, currentUserId, currentUserId, currentUserId);
      
      console.log('Raw conversations:', conversations);
      
      // Get last message for each conversation and format
      const formattedConversations = conversations.map((conv: any) => {
        const lastMessage: any = sqlite.prepare(`
          SELECT content, createdAt, imageUrl
          FROM messages
          WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
          ORDER BY createdAt DESC
          LIMIT 1
        `).get(currentUserId, conv.otherUserId, conv.otherUserId, currentUserId);
        
        let timeAgo = '';
        let lastMessageText = '';
        
        if (lastMessage) {
          const now = new Date();
          // lastMessage.createdAt is a Unix timestamp in seconds, convert to milliseconds
          const messageTime = new Date(lastMessage.createdAt * 1000);
          
          // Check if date is valid
          if (!isNaN(messageTime.getTime())) {
            const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
            
            if (diffInSeconds < 60) timeAgo = diffInSeconds <= 5 ? 'now' : `${diffInSeconds}s`;
            else if (diffInSeconds < 3600) timeAgo = `${Math.floor(diffInSeconds / 60)}m`;
            else if (diffInSeconds < 86400) timeAgo = `${Math.floor(diffInSeconds / 3600)}h`;
            else timeAgo = `${Math.floor(diffInSeconds / 86400)}d`;
          } else {
            timeAgo = '';
          }
          
          // Determine last message text
          if (lastMessage.imageUrl) {
            lastMessageText = 'Media';
          } else if (lastMessage.content) {
            lastMessageText = lastMessage.content;
          } else {
            lastMessageText = '';
          }
        }
        
        return {
          id: conv.otherUserId,
          firstName: conv.firstName,
          lastName: conv.lastName,
          email: conv.email,
          profileImageUrl: conv.profileImageUrl,
          lastMessage: lastMessageText,
          timeAgo
        };
      });
      
      console.log('Formatted conversations:', formattedConversations);
      res.json(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // Get messages between current user and another user
  app.get('/api/messages/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.userId as number;
      const otherUserId = parseInt(req.params.userId);
      
      const messages = sqlite.prepare(`
        SELECT m.*, 
               sender.first_name as senderFirstName, 
               sender.last_name as senderLastName,
               recipient.first_name as recipientFirstName,
               recipient.last_name as recipientLastName
        FROM messages m
        JOIN users sender ON m.senderId = sender.id
        JOIN users recipient ON m.recipientId = recipient.id
        WHERE (m.senderId = ? AND m.recipientId = ?) 
           OR (m.senderId = ? AND m.recipientId = ?)
        ORDER BY m.createdAt ASC
      `).all(currentUserId, otherUserId, otherUserId, currentUserId);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send a new message
  app.post('/api/messages', isAuthenticated, upload.single('media'), async (req: any, res) => {
    try {
      const senderId = req.userId as number;
      const { recipientId, content } = req.body;
      const mediaFile = req.file;
      
      if (!recipientId) {
        return res.status(400).json({ message: 'Recipient ID is required' });
      }
      
      if (!content?.trim() && !mediaFile) {
        return res.status(400).json({ message: 'Either message content or media file is required' });
      }
      
      let mediaUrl: string | null = null;
      
      if (mediaFile) {
        // Save media file
        const fileExtension = path.extname(mediaFile.originalname);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
        const filePath = path.join(__dirname, '../uploads', fileName);
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(filePath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Move file to uploads directory
        fs.writeFileSync(filePath, mediaFile.buffer);
        
        mediaUrl = `/uploads/${fileName}`;
      }
      
      const imageUrl = mediaUrl;
      
      const result = sqlite.prepare(`
        INSERT INTO messages (senderId, recipientId, content, imageUrl, createdAt)
        VALUES (?, ?, ?, ?, unixepoch('now'))
      `).run(senderId, recipientId, content?.trim() || '', imageUrl);
      
      const newMessage = sqlite.prepare(`
        SELECT m.*, 
               sender.first_name as senderFirstName, 
               sender.last_name as senderLastName,
               sender.profile_image_url as senderProfileImageUrl
        FROM messages m
        JOIN users sender ON m.senderId = sender.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);
      
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Delete individual message
  app.delete('/api/messages/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.userId as number;
      const messageId = parseInt(req.params.messageId);

      // Check if message exists and belongs to current user
      const message = sqlite.prepare(`
        SELECT * FROM messages WHERE id = ? AND senderId = ?
      `).get(messageId, currentUserId);

      if (!message) {
        return res.status(404).json({ message: 'Message not found or unauthorized' });
      }

      // Delete the message
      const deleteResult = sqlite.prepare(`
        DELETE FROM messages WHERE id = ?
      `).run(messageId);

      if (deleteResult.changes === 0) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  // Delete conversation between users
  app.delete('/api/conversations/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.userId as number;
      const otherUserId = parseInt(req.params.userId);
      
      console.log('Deleting conversation between users:', currentUserId, 'and', otherUserId);
      
      // Delete all messages between the two users
      const deleteResult = sqlite.prepare(`
        DELETE FROM messages 
        WHERE (senderId = ? AND recipientId = ?) 
           OR (senderId = ? AND recipientId = ?)
      `).run(currentUserId, otherUserId, otherUserId, currentUserId);
      
      console.log('Deleted messages count:', deleteResult.changes);
      
      res.json({ 
        success: true, 
        message: 'Conversation deleted successfully',
        deletedCount: deleteResult.changes 
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Failed to delete conversation' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
