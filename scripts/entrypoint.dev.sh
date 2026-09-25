#!/bin/sh

pnpm install --frozen-lockfile

echo "Running database migrations..."
pnpm run migration:run

echo "Running seed..."
pnpm run seed:dev

echo "Starting application in debug mode..."
pnpm run start:debug