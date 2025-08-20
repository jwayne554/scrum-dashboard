#!/bin/bash

# Deployment script for Scrum Dashboard
set -e

echo "🚀 Starting deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found!"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check required variables
if [ -z "$LINEAR_API_KEY" ]; then
    echo "❌ Error: LINEAR_API_KEY not set in .env.production"
    exit 1
fi

echo "📦 Installing dependencies..."
npm run install:all

echo "🔨 Building application..."
npm run build

echo "🗄️ Setting up database..."
mkdir -p data
npm run prisma:migrate:prod

echo "✅ Build complete!"
echo ""
echo "To start the application:"
echo "  Production: npm run start:prod"
echo "  With PM2: pm2 start ecosystem.config.js --env production"
echo "  With Docker: docker-compose up -d"
echo ""
echo "Dashboard will be available at http://localhost:3001"