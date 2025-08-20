const { execSync } = require('child_process');

console.log('Initializing database...');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

try {
  // Generate Prisma Client
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push schema to database (creates all tables)
  console.log('Creating database tables...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  
  console.log('Database initialization complete!');
} catch (error) {
  console.error('Database initialization failed:', error.message);
  // Don't exit - let the app try anyway
}

// Start the app
console.log('Starting application...');
require('tsx/cli').run(['src/index.ts']);