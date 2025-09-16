# Railway Persistent Database Setup

## Steps to Configure Persistent Storage on Railway

### 1. Railway Dashboard Configuration

**Method 1: Using railway.toml (Recommended)**
The `railway.toml` file in your project root will automatically configure the volume on deployment.

**Method 2: Railway CLI**
```bash
railway login
railway link
railway volume create database-storage --mount-path /app/data --size 5
```

**Method 3: Dashboard (if available)**
1. Go to your Railway project dashboard
2. Navigate to your service
3. Look for "Settings" → "Variables" or "Storage"
4. If volumes option exists, configure:
   - **Mount Path**: `/app/data`
   - **Name**: `database-storage`
   - **Size**: 5GB

### 2. Environment Variables
Ensure these environment variables are set in Railway:
```
NODE_ENV=production
DATABASE_URL=file:./dev.db
RAILWAY_ENVIRONMENT_NAME=production
```

### 3. How It Works
- **Local Development**: Uses `./dev.db` in project root
- **Railway Production**: Uses `/app/data/database.db` on persistent volume
- **Auto-detection**: Code automatically detects Railway environment
- **Directory Creation**: Automatically creates `/app/data` if it doesn't exist

### 4. Benefits
✅ Database survives deployments and restarts
✅ User data persists across code updates
✅ No more registration/login issues after deployments
✅ Profile uploads work consistently

### 5. Verification
After deployment, check the logs for:
```
🚂 Railway production: Using persistent storage at /app/data/database.db
📁 Database directory ensured: /app/data
✅ SQLite database initialized at: /app/data/database.db
```

### 6. Troubleshooting
- If volume mount fails, ensure the volume is properly configured in Railway dashboard
- Check that the mount path is exactly `/app/data`
- Verify Railway environment variables are set correctly
