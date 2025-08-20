# Railway Deployment Guide

Your code is now on GitHub at: https://github.com/jwayne554/scrum-dashboard

## Step 1: Sign up for Railway

1. Go to [Railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign in with GitHub (recommended for easy integration)

## Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If prompted, authorize Railway to access your GitHub repositories
4. Search for and select **"scrum-dashboard"**
5. Railway will automatically detect the configuration

## Step 3: Configure Environment Variables

After Railway imports your project, you need to add environment variables:

1. Click on your service (it will be named something like "scrum-dashboard")
2. Go to the **"Variables"** tab
3. Click **"Add Variable"** and add these:

```
LINEAR_API_KEY = your_linear_api_key_here
DATABASE_URL = file:./data/prod.db
NODE_ENV = production
PORT = 3001
```

**Important**: Use your actual Linear API key that starts with `lin_api_`

## Step 4: Configure Build & Start Commands

1. Go to the **"Settings"** tab
2. Under **"Build & Deploy"**, configure:
   - **Root Directory**: Leave empty (uses root)
   - **Build Command**: `npm run install:all && npm run build && cd server && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `cd server && npm run start:prod`
   - **Watch Paths**: Leave default

## Step 5: Deploy

1. After adding environment variables, Railway will automatically redeploy
2. You can also manually trigger a deploy by clicking **"Deploy"**
3. Watch the deployment logs in the **"Deployments"** tab
4. Once deployed, Railway will provide a URL like: `scrum-dashboard-production.up.railway.app`

## Step 6: Generate Domain

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Railway will provide a public URL for your dashboard
4. Share this URL with your team!

## Step 7: Test Your Deployment

1. Visit your Railway URL
2. The dashboard should load
3. Select a team and refresh data
4. Check health: `https://your-app.up.railway.app/api/health`

## Troubleshooting

### Build Fails
- Check the deployment logs for specific errors
- Ensure all environment variables are set correctly
- Try simplifying build command to just: `npm run install:all && npm run build`

### Application Crashes
- Check if DATABASE_URL is set correctly
- Verify LINEAR_API_KEY is valid
- Check logs in Railway's dashboard

### Database Issues
- Railway uses ephemeral storage by default
- For persistent data, consider adding PostgreSQL:
  1. Click **"New"** → **"Database"** → **"PostgreSQL"**
  2. Update DATABASE_URL to use PostgreSQL connection string
  3. Update Prisma schema for PostgreSQL

### Port Issues
- Railway automatically assigns a PORT
- You can remove PORT from environment variables and let Railway handle it
- The app already uses `process.env.PORT || 3001`

## Optional: Set Up Auto-Deploy

Railway automatically deploys when you push to GitHub:
1. Every push to `main` branch triggers a new deployment
2. You can disable this in Settings → Triggers if needed

## Optional: Add Custom Domain

1. Go to Settings → Networking
2. Add your custom domain
3. Update your DNS records as instructed

## Success! 🎉

Once deployed, your dashboard will be available at the Railway-provided URL.
Share it with your team and they can start using it immediately!

## Next Steps

1. Set up monitoring (Railway provides basic metrics)
2. Consider adding PostgreSQL for better persistence
3. Set up alerts for deployment failures
4. Add team members to Railway project for collaboration