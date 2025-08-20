import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { LinearService } from './lib/linear-client.js';
import { createApiRouter } from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

const app = express();
// Railway provides PORT, we must use it
const PORT = process.env.PORT || 3001;
logger.info(`PORT environment variable: ${process.env.PORT}`);
logger.info(`Will listen on port: ${PORT}`);

// Initialize Prisma with better error handling
let prisma: PrismaClient;
try {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });
} catch (error) {
  logger.error({ error }, 'Failed to initialize Prisma Client');
  logger.error('Make sure DATABASE_URL is set and valid');
  process.exit(1);
}

if (!process.env.LINEAR_API_KEY) {
  logger.error('LINEAR_API_KEY is required in environment variables');
  process.exit(1);
}

const linearService = new LinearService(process.env.LINEAR_API_KEY, prisma);

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Request received');
  next();
});

// Health check that doesn't require database
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Scrum Dashboard API',
    status: 'running',
    endpoints: [
      '/api/health - Health check with DB',
      '/api/teams - List teams',
      '/api/refresh?teamId=xxx - Refresh team data',
      '/api/cycles?teamId=xxx - Get team cycles'
    ]
  });
});

app.use('/api', createApiRouter(prisma, linearService));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));
  
  // Handle React routing, return index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    }
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

async function initDatabase() {
  try {
    logger.info('Initializing database schema...');
    // Try to create tables if they don't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Team" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL
      )
    `);
    logger.info('Database schema initialized');
    return true;
  } catch (error: any) {
    logger.warn('Could not initialize schema, assuming it exists');
    return true; // Continue anyway
  }
}

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      logger.info(`Attempting database connection (attempt ${i + 1}/${retries})...`);
      await prisma.$connect();
      logger.info('Successfully connected to database');
      
      // Try to initialize schema on first connect
      if (i === 0) {
        await initDatabase();
      }
      
      return true;
    } catch (error: any) {
      logger.error({ 
        attempt: i + 1, 
        error: error.message,
        code: error.code,
        clientVersion: error.clientVersion
      }, 'Database connection failed');
      
      if (i < retries - 1) {
        logger.info(`Waiting ${delay/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

async function start() {
  try {
    // Try to connect with retries
    const connected = await connectWithRetry();
    
    if (!connected) {
      logger.error('Could not establish database connection after multiple attempts');
      logger.error('Please check your DATABASE_URL environment variable');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info({ port: PORT }, `Server running at http://localhost:${PORT}`);
      logger.info('API endpoints:');
      logger.info('  POST /api/refresh?teamId=xxx');
      logger.info('  GET  /api/cycles?teamId=xxx');
      logger.info('  GET  /api/cycles/:cycleId/metrics');
      logger.info('  GET  /api/teams');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();