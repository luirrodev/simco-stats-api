#!/bin/sh

# Abort on any error
set -e

# Run database migrations
echo "Running database migrations..."
npx typeorm migration:run -d dist/database/typeorm.config.js

# Start the main application
echo "Starting application..."
npm run start:prod
