const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set defaults if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
  console.log('Using default DATABASE_URL:', process.env.DATABASE_URL);
}

if (!process.env.DATABASE_PROVIDER) {
  // Auto-detect provider from URL
  if (process.env.DATABASE_URL.startsWith('postgresql://') || 
      process.env.DATABASE_URL.startsWith('postgres://')) {
    process.env.DATABASE_PROVIDER = 'postgresql';
  } else {
    process.env.DATABASE_PROVIDER = 'sqlite';
  }
  console.log('Auto-detected DATABASE_PROVIDER:', process.env.DATABASE_PROVIDER);
}

// Ensure the database directory exists
const dbUrl = process.env.DATABASE_URL;
if (dbUrl.startsWith('file:')) {
  const dbPath = dbUrl.replace('file:', '');
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    console.log('Creating database directory:', dir);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate Prisma Client
console.log('Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to generate Prisma client');
  process.exit(1);
}

// Initialize database with schema
console.log('Initializing database...');
try {
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('Database initialized successfully');
} catch (e) {
  console.error('Failed to initialize database');
  // Don't exit, let the app try to connect anyway
}