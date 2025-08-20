# Scrum Dashboard - Linear Integration

A real-time Scrum dashboard that integrates with Linear to provide sprint metrics, burndown charts, bug tracking, and team performance analytics.

## 🚀 Deployment Ready!

This dashboard is now ready for team deployment. See the [Quick Deployment](#quick-deployment) section below.

## Features

- **Sprint Health KPIs**: Cycle success rate, velocity tracking, planning accuracy, scope change metrics
- **Burndown Chart**: Actual vs ideal progress with scope change markers
- **Bug Tracking**: Inflow/outflow metrics with Mean Time to Resolution (MTTR)
- **Cumulative Flow Diagram**: Visualize work distribution across states
- **Team Member Filtering**: View individual performance for 1-on-1s
- **Workflow Efficiency**: Track bottlenecks and cycle times
- **Review Time Analysis**: Monitor code review performance
- **Work Item Age**: Track items that have been in progress too long
- **Blockers**: Identify and track blocked items
- **Cycle Snapshots**: Automatic snapshots when cycles complete

## Prerequisites

- Node.js 18+ 
- Linear workspace with API access
- Linear API key (personal or service account)

## Setup

1. **Clone and install dependencies:**
```bash
npm run install:all
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your Linear API key:
```
LINEAR_API_KEY=lin_api_********************************
DATABASE_URL=file:./dev.db
PORT=3001
```

3. **Get your Linear API key:**
- Go to Linear Settings → API → Personal API keys
- Create a new key with read access to your workspace

4. **Initialize database:**
```bash
npm run prisma:migrate
```

5. **Start the application:**
```bash
npm run dev
```

The dashboard will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Usage

1. Select your team from the dropdown
2. Select the cycle (defaults to active cycle)
3. Click "Refresh" to pull latest data from Linear
4. Data is cached locally for fast access
5. Snapshots are automatically created when cycles complete

## API Endpoints

- `POST /api/refresh?teamId=xxx` - Fetch latest data from Linear
- `GET /api/cycles?teamId=xxx` - List cycles for a team
- `GET /api/cycles/:cycleId/metrics` - Get metrics for a cycle
- `GET /api/teams` - List all teams

## Architecture

- **Frontend**: React with Vite, Tailwind CSS, Recharts
- **Backend**: Node.js with Express, TypeScript
- **Database**: SQLite with Prisma ORM
- **Linear Integration**: Official @linear/sdk

## Development

```bash
# Run backend only
cd server && npm run dev

# Run frontend only  
cd client && npm run dev

# View database
npm run prisma:studio
```

## Quick Deployment

### Option 1: Docker (Easiest for Teams)
```bash
# 1. Configure production environment
cp .env.production.example .env.production
# Edit .env.production with your LINEAR_API_KEY

# 2. Deploy with Docker
docker-compose up -d

# Dashboard available at http://localhost:3001
```

### Option 2: Cloud Deployment (Railway/Render)
1. Push to GitHub
2. Connect to [Railway.app](https://railway.app) or [Render.com](https://render.com)
3. Add environment variable: `LINEAR_API_KEY`
4. Deploy! (URL provided automatically)

### Option 3: Traditional Server
```bash
# Run deployment script
./scripts/deploy.sh

# Start with PM2
pm2 start ecosystem.config.js --env production
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Production Features

- ✅ Health checks at `/api/health`
- ✅ Auto-refresh via cron (see `scripts/refresh-data.sh`)
- ✅ Docker support with persistent volumes
- ✅ PM2 process management
- ✅ Production-ready error handling
- ✅ SQLite database with automatic backups

Build for production:
```bash
npm run build
```

The built files will be in:
- Backend: `server/dist/`
- Frontend: `client/dist/`

## License

MIT