# SocialThreadConnect - Production Deployment Guide

## Overview
This application is configured for deployment with:
- **Frontend**: Netlify (React/Vite client)
- **Backend**: Railway (Node.js/Express server)
- **Database**: SQLite (Railway managed)

## Railway Backend Deployment

### 1. Deploy to Railway
1. Connect your GitHub repository to Railway
2. Select the root directory (production-deploy folder)
3. Railway will automatically detect the Node.js project

### 2. Environment Variables (Railway)
Set these environment variables in Railway dashboard:
```
DATABASE_URL=<Railway will provide this automatically>
SESSION_SECRET=your-super-secret-session-key-here-change-this
NODE_ENV=production
PORT=5000
APP_URL=https://your-railway-app.railway.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=Entreefox@gmail.com
SMTP_PASS=rqseojdszdbqlecx
FROM_EMAIL=Entreefox@gmail.com
```

### 3. Railway Configuration Files
- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration
- Health check endpoint: `/api/health`

## Netlify Frontend Deployment

### 1. Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set build directory to `client`
3. Set publish directory to `client/dist`
4. Build command: `npm run build`

### 2. Environment Variables (Netlify)
Set in Netlify dashboard:
```
VITE_API_URL=https://your-railway-app.railway.app
```

### 3. Netlify Configuration
- `netlify.toml` - Handles redirects and environment variables
- API calls are proxied to Railway backend
- SPA routing handled with catch-all redirect

## Important Notes

### Update API URL
After Railway deployment, update the following:
1. Replace `https://your-railway-app.railway.app` in `netlify.toml` with your actual Railway URL
2. Update `VITE_API_URL` environment variable in Netlify

### Database
- SQLite database will be created automatically on Railway
- Migrations run automatically on startup
- File uploads stored in Railway's ephemeral storage

### CORS Configuration
The backend is configured to accept requests from any origin in production. For security, consider restricting this to your Netlify domain.

## Local Development
```bash
npm run start:dev  # Development mode
npm run build      # Build both client and server
npm start          # Production mode
```

## Deployment Checklist
- [ ] Deploy backend to Railway
- [ ] Set Railway environment variables
- [ ] Note Railway app URL
- [ ] Update netlify.toml with Railway URL
- [ ] Deploy frontend to Netlify  
- [ ] Set Netlify environment variables
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Verify email functionality
