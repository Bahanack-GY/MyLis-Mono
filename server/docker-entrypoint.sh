#!/bin/sh
set -e

echo "Running database migrations..."
node dist/scripts/migrate.js

echo "Starting server..."
exec node dist/main.js
