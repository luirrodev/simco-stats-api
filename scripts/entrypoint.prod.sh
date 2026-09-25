#!/bin/sh

echo "Running database migrations..."
pnpm run migration:run

echo "Running production seed..."
pnpm run seed:prod

echo "Starting application..."
pnpm run start:prod