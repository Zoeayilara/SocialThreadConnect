# Railway Environment Variables Setup

## Required Environment Variables

To fix JWT authentication issues, ensure these environment variables are set in your Railway project:

### 1. JWT_SECRET
```
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long
```

### 2. SESSION_SECRET  
```
SESSION_SECRET=your-super-secure-session-secret-key-at-least-32-characters-long
```

## How to Set Environment Variables in Railway:

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add the following variables:
   - `JWT_SECRET`: A secure random string (at least 32 characters)
   - `SESSION_SECRET`: A secure random string (at least 32 characters)

## Generate Secure Secrets:

You can generate secure secrets using:
```bash
# For JWT_SECRET
openssl rand -base64 32

# For SESSION_SECRET  
openssl rand -base64 32
```

Or use online generators like: https://generate-secret.vercel.app/32

## Verification:

After setting the variables, redeploy your Railway service. Check the logs for:
- `✅ JWT_SECRET loaded from environment`
- `🔑 JWT Secret source: ENVIRONMENT`

If you see fallback messages, the variables aren't properly set.
