#!/bin/bash

echo "=== Railway Production Start Script ==="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Ensure we're in the right place
if [ -d "server" ]; then
    echo "Found server directory"
    
    # Check if client build exists and copy it
    if [ -d "client/dist" ]; then
        echo "Found client/dist, copying to server..."
        cp -r client/dist server/client-dist
        echo "Client build copied to server/client-dist"
    else
        echo "WARNING: client/dist not found"
    fi
    
    # Start from server directory
    cd server
    echo "Changed to server directory: $(pwd)"
    echo "Server directory contents:"
    ls -la
    
    # Generate Prisma client
    echo "Generating Prisma client..."
    npx prisma generate
    
    # Initialize database
    echo "Initializing database..."
    npx prisma db push --skip-generate || echo "Database initialization skipped"
    
    # Start the server
    echo "Starting server..."
    NODE_ENV=production npx tsx src/index.ts
else
    echo "ERROR: server directory not found!"
    exit 1
fi