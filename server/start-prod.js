#!/usr/bin/env node

// Production startup script that handles database initialization
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATABASE_URL?.includes('file:') 
  ? path.dirname(process.env.DATABASE_URL.replace('file:', '').replace('./',''))
  : 'data';

const dbPath = path.join(dataDir, 'prod.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Run migrations to create/update database
try {
  console.log('Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} catch (error) {
  console.log('Migration failed, attempting to create database...');
  // If migration fails, try to push the schema
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
}

// Start the server
console.log('Starting server...');
require('./node_modules/tsx/dist/cli.js').run(['src/index.ts']);