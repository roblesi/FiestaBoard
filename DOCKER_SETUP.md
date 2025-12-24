# Docker Setup Guide

## Overview

This project uses a **two-container architecture**:

1. **API Service** (`vestaboard-api`) - FastAPI REST API server
   - Port: `8000`
   - Controls the Vestaboard display service
   - Provides REST endpoints for monitoring and control

2. **Web UI** (`vestaboard-ui`) - Nginx web server with HTML/JS interface
   - Port: `8080`
   - Provides a web interface for monitoring and control
   - Proxies API requests to the API service

## Quick Start

### Build and Run

```bash
# Build and start both services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Services

- **Web UI**: http://localhost:8080
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (FastAPI auto-generated docs)

## Development

### Build Individual Services

```bash
# Build API service only
docker build -f Dockerfile.api -t vestaboard-api .

# Build UI service only
docker build -f Dockerfile.ui -t vestaboard-ui .
```

### Run Individual Services

```bash
# Run API service
docker run -d \
  --name vestaboard-api \
  --env-file .env \
  -p 8000:8000 \
  vestaboard-api

# Run UI service
docker run -d \
  --name vestaboard-ui \
  -p 8080:80 \
  --link vestaboard-api:vestaboard-api \
  vestaboard-ui
```

## API Endpoints

### Service Control
- `POST /start` - Start the background display service
- `POST /stop` - Stop the background display service
- `POST /refresh` - Manually refresh the display

### Status & Info
- `GET /health` - Health check
- `GET /status` - Service status and configuration
- `GET /config` - Configuration summary

### Display Control
- `POST /send-message` - Send custom message to Vestaboard
  ```json
  {
    "text": "Your message here"
  }
  ```

## Testing

### Test API Health
```bash
curl http://localhost:8000/health
```

### Test Service Status
```bash
curl http://localhost:8000/status
```

### Start Service
```bash
curl -X POST http://localhost:8000/start
```

### Send Custom Message
```bash
curl -X POST http://localhost:8000/send-message \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from API!"}'
```

## Troubleshooting

### Services Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs
   ```

2. **Verify .env file exists:**
   ```bash
   ls -la .env
   ```

3. **Check port conflicts:**
   ```bash
   # Check if ports are in use
   lsof -i :8000
   lsof -i :8080
   ```

### API Not Responding

1. **Check API container is running:**
   ```bash
   docker ps | grep vestaboard-api
   ```

2. **Check API logs:**
   ```bash
   docker logs vestaboard-api
   ```

3. **Test API directly:**
   ```bash
   curl http://localhost:8000/health
   ```

### Web UI Can't Connect to API

1. **Check API is accessible:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check nginx proxy config:**
   ```bash
   docker exec vestaboard-ui cat /etc/nginx/conf.d/default.conf
   ```

3. **Check UI logs:**
   ```bash
   docker logs vestaboard-ui
   ```

## File Structure

```
.
├── Dockerfile.api          # API service Dockerfile
├── Dockerfile.ui          # UI service Dockerfile
├── docker-compose.yml     # Multi-service compose file
├── .dockerignore          # Docker ignore patterns
├── src/
│   ├── api_server.py     # FastAPI server
│   └── main.py           # Display service (used by API)
└── web_ui/
    └── index.html        # Web UI interface
```

## Environment Variables

Both services use the same `.env` file. Key variables:

- `VB_READ_WRITE_KEY` - Vestaboard API key (required)
- `WEATHER_API_KEY` - Weather API key (required)
- `WEATHER_PROVIDER` - "weatherapi" or "openweathermap"
- `APPLE_MUSIC_ENABLED` - Enable Apple Music integration
- `APPLE_MUSIC_SERVICE_URL` - URL to Mac Studio helper service
- And more... (see `env.example`)

## Production Deployment

For production deployment to Synology NAS, see [DEPLOY_TO_SYNOLOGY.md](./DEPLOY_TO_SYNOLOGY.md).

