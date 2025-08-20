const { execSync } = require('child_process');

// Check DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Please add your PostgreSQL DATABASE_URL in Railway variables');
  process.exit(1);
}

console.log('DATABASE_URL is set:', process.env.DATABASE_URL.substring(0, 30) + '...');

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