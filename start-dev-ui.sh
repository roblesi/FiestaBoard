#!/bin/sh
set -e

# Install node dependencies (only if node_modules is empty or package.json changed)
# This will be fast on subsequent starts thanks to the named volume
if [ ! -d "node_modules/.cache" ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed, skipping..."
fi

# Start nginx in daemon mode (background)
echo "Starting nginx on port 3000 with HTTP/2..."
nginx

# Wait for nginx to start
sleep 2

# Start Next.js in foreground (this keeps the container alive)
echo "Starting Next.js dev server on port 3001..."
exec npm run dev -- -H 0.0.0.0 -p 3001

