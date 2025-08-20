# Cloud Database Setup for Railway Deployment

SQLite doesn't work on Railway's ephemeral filesystem. You need a cloud database.

## Option 1: Railway PostgreSQL (Easiest)

1. **In Railway Dashboard:**
   - Click the "+ New" button
   - Select "Database" → "PostgreSQL"
   - Railway creates it automatically
   - Click on the PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Update your app's environment:**
   - Go to your app service in Railway
   - Variables tab
   - Replace `DATABASE_URL` with the PostgreSQL URL

3. **That's it!** Railway will handle everything else.

## Option 2: Neon (Free PostgreSQL)

1. **Sign up at [Neon.tech](https://neon.tech)**
   - Create account (free tier is generous)
   - Create a new project
   - Copy the connection string

2. **Connection string format:**
   ```
   postgresql://username:password@host/database?sslmode=require
   ```

3. **Add to Railway:**
   - Go to Variables in Railway
   - Update `DATABASE_URL` with Neon connection string

## Option 3: Supabase (Free PostgreSQL)

1. **Sign up at [Supabase.com](https://supabase.com)**
   - Create new project
   - Go to Settings → Database
   - Copy connection string (use "connection pooling" one)

2. **Add to Railway:**
   - Update `DATABASE_URL` in Railway variables

## Option 4: Keep SQLite (Alternative Deployment)

If you really want SQLite, deploy to:
- **Fly.io** - Has persistent volumes
- **Render** - Persistent disk available
- **VPS** - Full control over filesystem

## Quick Migration Steps

After adding PostgreSQL URL to Railway:

1. **Railway will automatically:**
   - Detect the new DATABASE_URL
   - Run migrations
   - Start your app

2. **First deployment with PostgreSQL:**
   - Will create all tables
   - Ready to use immediately

## Recommended: Railway PostgreSQL

It's the simplest because:
- One-click setup
- Same platform as your app
- Automatic backups
- No external accounts needed
- $5/month (or free trial credits)

## After Database Setup

Your app will work immediately! The URL structure remains the same:
```
https://your-app.up.railway.app
```

No code changes needed - Prisma handles both SQLite and PostgreSQL!