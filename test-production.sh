#!/bin/bash

echo "Testing production build locally..."

# Build client
cd client
npm run build
cd ..

# Test server with production mode
cd server
NODE_ENV=production npx tsx src/index.ts