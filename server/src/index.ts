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
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

async function start() {
  try {
    await prisma.$connect();
    logger.info('Connected to database');

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