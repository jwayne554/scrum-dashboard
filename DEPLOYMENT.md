# Scrum Dashboard Deployment Guide

## Overview
This guide covers multiple deployment options for the Scrum Dashboard, from simple to production-ready.

## Prerequisites
- Node.js 18+ 
- Linear API Key with read access to your teams
- A deployment platform (see options below)

## Option 1: Quick Deploy with Railway/Render (Recommended)

### Railway Deployment (Easiest)
1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect the setup
6. Add environment variables:
   ```
   LINEAR_API_KEY=your_linear_api_key_here
   DATABASE_URL=file:./data/prod.db
   NODE_ENV=production
   ```
7. Deploy! Railway provides a URL automatically

### Render Deployment
1. Push to GitHub
2. Go to [Render.com](https://render.com)
3. Create a new "Web Service"
4. Connect your GitHub repo
5. Build Command: `npm install && npm run build`
6. Start Command: `npm run start:prod`
7. Add environment variables (same as above)

## Option 2: Deploy with Docker (Most Portable)

### Using the Docker setup I'll create:
```bash
# Build and run locally
docker-compose up --build

# Or deploy to any Docker host
docker build -t scrum-dashboard .
docker run -p 3001:3001 \
  -e LINEAR_API_KEY=your_key \
  -v $(pwd)/data:/app/data \
  scrum-dashboard
```

## Option 3: Traditional VPS Deployment

### On Ubuntu/Debian:
```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone and setup
git clone your-repo-url
cd scrum-dashboard
npm install
npm run build

# 3. Use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Option 4: Vercel/Netlify (Frontend Only)
For a simpler setup, you can deploy just the frontend and use a separate backend:

1. Split the app into frontend (Vercel/Netlify) and backend (Railway)
2. Update the frontend to point to your backend URL
3. Enable CORS on the backend

## Environment Variables

### Required:
- `LINEAR_API_KEY` - Your Linear API key
- `DATABASE_URL` - SQLite database path (file:./data/prod.db)

### Optional:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `ALLOWED_ORIGINS` - CORS origins for frontend

## Security Considerations

1. **API Key Protection**
   - Never commit the Linear API key to git
   - Use environment variables only
   - Consider using a secrets manager in production

2. **Database**
   - The SQLite database contains cached Linear data
   - Mount as a volume in Docker for persistence
   - Regular backups recommended

3. **Access Control**
   - Currently no authentication - add if needed
   - Consider putting behind company VPN
   - Or add basic auth/OAuth

4. **HTTPS**
   - Use HTTPS in production (Railway/Render provide this)
   - For VPS, use Let's Encrypt with nginx

## Post-Deployment Setup

1. **Initial Data Load**
   ```bash
   # Refresh team data
   curl -X POST "https://your-domain.com/api/refresh?teamId=YOUR_TEAM_ID"
   ```

2. **Set up Auto-Refresh**
   - Add a cron job or scheduled task
   - Refresh every 30 minutes during work hours

3. **Monitor Health**
   ```bash
   curl "https://your-domain.com/api/health"
   ```

## Sharing with Team

Once deployed, share:
1. The dashboard URL
2. Instructions to select their team
3. How to use filters for 1-on-1s
4. Refresh schedule (if automated)

## Quick Start Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start:prod

# With PM2
pm2 start ecosystem.config.js --env production
```

## Troubleshooting

### Database Issues
- Ensure write permissions on data directory
- Check DATABASE_URL path is correct

### API Connection Issues
- Verify LINEAR_API_KEY is valid
- Check network/firewall settings
- Ensure Linear API access from deployment region

### Performance
- Database is SQLite (good for <100 concurrent users)
- For larger scale, migrate to PostgreSQL
- Enable caching headers for static assets

## Support

For issues or questions:
1. Check server logs: `pm2 logs` or `docker logs`
2. Verify environment variables are set
3. Test API endpoints directly with curl
4. Check Linear API status

## Next Steps

Choose your deployment method above and follow the specific instructions. Railway/Render are recommended for simplicity.