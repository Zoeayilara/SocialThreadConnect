import bcrypt from "bcryptjs";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import { sessionStore } from "./db";
import { generateToken, verifyToken, extractTokenFromHeader, type JWTPayload } from "./jwt";

export function setupAuth(app: express.Express) {
  console.log('🔐 SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
  console.log('🌍 RAILWAY_ENVIRONMENT_NAME:', process.env.RAILWAY_ENVIRONMENT_NAME);
  
  // Session configuration
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.RAILWAY_ENVIRONMENT_NAME ? true : false, // Use secure cookies on Railway
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for better persistence
      sameSite: process.env.RAILWAY_ENVIRONMENT_NAME ? 'none' : 'lax', // Cross-site for Railway, lax for localhost
    },
  }));
}

export async function loginUser(email: string, password: string) {
  const user = await storage.getUserByEmail(email);
  if (!user || !user.password) {
    throw new Error("Invalid email or password");
  }

  // Check if password is hashed (starts with $2) or plain text
  let isValid = false;
  if (user.password.startsWith('$2')) {
    // Hashed password - use bcrypt
    isValid = await bcrypt.compare(password, user.password);
  } else {
    // Plain text password - direct comparison
    isValid = password === user.password;
  }
  
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  return user;
}

export function generateUserToken(user: any): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    userType: user.userType || 'customer'
  };
  return generateToken(payload);
}

export function isAuthenticated(req: any, res: any, next: any) {
  console.log('=== AUTH CHECK START ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  // Try JWT token first
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);
  
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        console.log('✅ JWT Authentication successful - User ID:', payload.userId);
        req.user = payload; // Store user info in request
        req.userId = payload.userId; // For backward compatibility
        return next();
      }
    }
  }
  
  // Fallback to session-based auth for backward compatibility
  console.log('JWT failed, trying session auth...');
  console.log('Session ID:', req.sessionID);
  console.log('Session exists:', !!req.session);
  console.log('User ID from session:', req.session?.userId);
  
  if (req.session && req.session.userId) {
    console.log('✅ Session Authentication successful - User ID:', req.session.userId);
    req.userId = req.session.userId; // For backward compatibility
    return next();
  }
  
  console.log('❌ Authentication failed - no valid JWT or session');
  console.log('=== AUTH CHECK END ===');
  return res.status(401).json({ message: "Unauthorized - No valid token or session" });
}

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}