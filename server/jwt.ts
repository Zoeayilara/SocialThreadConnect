import jwt from 'jsonwebtoken';

// Ensure JWT_SECRET is properly loaded with validation
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ JWT_SECRET not found in environment variables');
    console.log('🔍 Available env vars:', Object.keys(process.env).filter(key => key.includes('JWT') || key.includes('SECRET')));
    // Use a consistent fallback but log it
    console.log('⚠️  Using fallback JWT secret - this may cause auth issues in production');
    return 'your-super-secret-jwt-key-change-in-production';
  }
  console.log('✅ JWT_SECRET loaded from environment');
  return secret;
};

const JWT_SECRET = getJWTSecret();
const JWT_EXPIRES_IN = '7d'; // 7 days

// Log JWT secret source for debugging
console.log('🔑 JWT Secret source:', process.env.JWT_SECRET ? 'ENVIRONMENT' : 'FALLBACK');
console.log('🔑 JWT Secret length:', JWT_SECRET.length, 'characters');

export interface JWTPayload {
  userId: number;
  email: string;
  userType: string;
}

export function generateToken(payload: JWTPayload): string {
  console.log('🔑 Generating JWT token for user:', payload.userId);
  console.log('🔑 Using JWT secret length:', JWT_SECRET.length);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  console.log('✅ JWT token generated successfully');
  return token;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log('🔍 Verifying JWT token...');
    console.log('🔑 Using JWT secret length for verification:', JWT_SECRET.length);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('✅ JWT token verified successfully for user:', decoded.userId);
    return decoded;
  } catch (error) {
    console.error('❌ JWT verification failed:', error);
    console.log('🔍 Token that failed verification:', token.substring(0, 20) + '...');
    console.log('🔍 JWT secret being used:', JWT_SECRET.substring(0, 10) + '...');
    
    // Check if it's a secret mismatch vs other error
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('🚨 Likely JWT secret mismatch - token signed with different secret');
    }
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  // Support both "Bearer token" and just "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}
