#!/bin/bash

echo "Starting production server..."
echo "DATABASE_URL is set: ${DATABASE_URL:0:30}..."

# Try to run migrations, but don't fail if they error
echo "Attempting database migrations..."
npx prisma migrate deploy || {
    echo "Migrations failed or not needed, trying db push..."
    npx prisma db push --skip-generate || {
        echo "Database setup failed, but continuing..."
    }
}

# Start the server
echo "Starting Node.js server..."
NODE_ENV=production npx tsx src/index.ts