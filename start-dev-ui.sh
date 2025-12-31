#!/bin/sh
set -e

# Install nginx
apk add --no-cache nginx

# Create nginx directories
mkdir -p /var/log/nginx /var/lib/nginx/tmp /run/nginx

# Install node dependencies
npm install

# Start nginx in daemon mode (background)
echo "Starting nginx on port 3000 with HTTP/2..."
nginx

# Wait for nginx to start
sleep 2

# Start Next.js in foreground (this keeps the container alive)
echo "Starting Next.js dev server on port 3001..."
exec npm run dev -- -H 0.0.0.0 -p 3001

