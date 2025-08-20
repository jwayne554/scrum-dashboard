#!/usr/bin/env node

// Production startup script that handles database initialization
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we have a DATABASE_URL
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./data/prod.db';
}

console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Extract directory from DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
let dataDir = 'data';
let dbPath = path.join(dataDir, 'prod.db');

if (dbUrl.includes('file:')) {
  const filePath = dbUrl.replace('file:', '');
  if (filePath.startsWith('./')) {
    dbPath = filePath.substring(2);
  } else if (filePath.startsWith('/')) {
    dbPath = filePath;
  } else {
    dbPath = filePath;
  }
  dataDir = path.dirname(dbPath);
}

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Generate Prisma client first
try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to generate Prisma client:', error);
}

// Create database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  console.log(`Creating database at: ${dbPath}`);
  
  try {
    // Use db push to create the database schema
    console.log('Initializing database schema...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Continue anyway, the app might create it
  }
} else {
  console.log(`Database exists at: ${dbPath}`);
  
  // Run migrations if database exists
  try {
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
  } catch (error) {
    console.log('Migrations skipped or failed, continuing...');
  }
}

// Start the server using tsx
console.log('Starting server...');
process.env.NODE_ENV = 'production';
require('tsx/cli').run(['src/index.ts']);