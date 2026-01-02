# Deploying to Synology

## Overview

This project now includes **two Docker containers**:
1. **API Service** (`vestaboard-api`) - REST API for controlling the Vestaboard display (port 8000)
2. **Web UI** (`vestaboard-ui`) - Web interface for monitoring and control (port 8080)

Both services can be deployed to your Synology NAS using Docker Container Manager.

## Prerequisites

✅ All tests passed locally
✅ Configuration ready in `.env`
✅ Docker and Docker Compose installed on Synology

## Deployment Steps

### 1. Transfer Files to Synology

**Option A: Git (Recommended)**
```bash
# On your Mac, commit and push
git add .
git commit -m "MVP ready for deployment"
git push

# On Synology, clone/pull
git clone <your-repo> /volume1/docker/vestaboard
# or
cd /volume1/docker/vestaboard && git pull
```

**Option B: SCP/SFTP**
```bash
# From your Mac
scp -r /Users/roblesi/Dev/Vesta user@synology-ip:/volume1/docker/vestaboard
```

**Option C: Synology File Station**
- Use Synology's web interface to upload files

### 2. Create .env File on Synology

Copy your `.env` file to Synology, or create it with:

```bash
# On Synology
cd /volume1/docker/vestaboard
nano .env
```

Make sure it contains:
```bash
VB_READ_WRITE_KEY=your_vestaboard_read_write_key_here
WEATHER_API_KEY=your_weather_api_key_here
WEATHER_PROVIDER=weatherapi
WEATHER_LOCATION=San Francisco, CA
TIMEZONE=America/Los_Angeles
```

### 3. Test Network Connectivity

From Synology, test if it can reach your Mac Studio:

```bash
# SSH into Synology, then:
curl http://192.168.0.116:8080/health
curl http://192.168.0.116:8080/now-playing
```

If this works, you're ready to deploy!

### 4. Build and Run Docker Containers

**Via Docker Compose (Recommended):**

This will build and start both the API and Web UI services:

```bash
cd /volume1/docker/vestaboard
docker-compose up -d --build
```

This creates two containers:
- `vestaboard-api` - API service on port 8000
- `vestaboard-ui` - Web UI on port 8080

**Via Synology Container Manager:**

1. Open **Container Manager** (formerly Docker)
2. Go to **Project** → **Create** → **From docker-compose.yml**
3. Select your `docker-compose.yml` file
4. Click **Next** and **Create**
5. Both containers will be built and started automatically

### 5. Access the Services

Once running, you can access:

- **Web UI**: `http://<synology-ip>:8080`
  - Monitor service status
  - Start/stop the service
  - Send custom messages
  - View configuration
  - Refresh display manually

- **API Directly**: `http://<synology-ip>:8000`
  - REST API endpoints (see API documentation below)
  - Health check: `http://<synology-ip>:8000/health`

### 6. Check Logs

```bash
# View all logs
docker-compose logs -f

# View API logs only
docker-compose logs -f vestaboard-api

# View UI logs only
docker-compose logs -f vestaboard-ui
```

You should see API logs like:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 7. Start the Display Service

The API service is running, but the background display service needs to be started via the API:

**Via Web UI:**
1. Open `http://<synology-ip>:8080`
2. Click **"▶ Start Service"** button

**Via API:**
```bash
curl -X POST http://<synology-ip>:8000/start
```

**Via Command Line:**
```bash
docker exec vestaboard-api python -c "from src.api_server import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8000)"
```

Once started, you should see logs indicating the service is running and updating the display.

### 8. Verify Vestaboard Display

Check your Vestaboard - it should be showing:
- Weather information
- Date and time
- Home Assistant status (if enabled)
- Star Trek quotes (if enabled)

## API Endpoints

The API service provides the following endpoints:

- `GET /` - API information
- `GET /health` - Health check
- `GET /status` - Service status
- `GET /config` - Configuration summary
- `POST /start` - Start the background display service
- `POST /stop` - Stop the background display service
- `POST /refresh` - Manually refresh the display
- `POST /send-message` - Send a custom message to Vestaboard

Example: Send a custom message
```bash
curl -X POST http://<synology-ip>:8000/send-message \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from API!"}'
```

## Troubleshooting

### Can't connect to Mac Studio from Synology

1. **Check Mac Studio IP hasn't changed:**
   ```bash
   # On Mac Studio
   ipconfig getifaddr en0
   ```

2. **Check Mac Studio firewall:**
   - System Settings → Network → Firewall
   - Allow Python or port 8080

3. **Test connectivity:**
   ```bash
   # From Synology
   ping 192.168.0.116
   curl http://192.168.0.116:8080/health
   ```

### Docker containers won't start

1. **Check logs:**
   ```bash
   docker-compose logs
   # or for specific service
   docker logs vestaboard-api
   docker logs vestaboard-ui
   ```

2. **Verify .env file:**
   ```bash
   cat .env | grep -E "(VB_|WEATHER_)"
   ```

3. **Check Docker is running:**
   ```bash
   docker ps
   docker-compose ps
   ```

4. **Check port conflicts:**
   ```bash
   # Make sure ports 8000 and 8080 are not in use
   netstat -tuln | grep -E "(8000|8080)"
   ```

5. **Rebuild containers:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Logs showing errors

**Check logs for errors:**
   ```bash
   docker logs vestaboard-display | grep -i "apple\|music"
   ```

## Monitoring

### View Real-time Logs
```bash
# All services
docker-compose logs -f

# API service only
docker-compose logs -f vestaboard-api

# UI service only
docker-compose logs -f vestaboard-ui
```

### Check Service Status
```bash
# Via Docker
docker-compose ps

# Via API
curl http://<synology-ip>:8000/status

# Via Web UI
# Open http://<synology-ip>:8080 and check the status indicator
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart vestaboard-api
docker-compose restart vestaboard-ui

# Full restart (stop and start)
docker-compose down
docker-compose up -d
```

### Stop Services
```bash
# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Synology NAS (Docker)                 │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │  vestaboard-api   │  │  vestaboard-ui   │   │
│  │  (Port 8000)     │  │  (Port 8080)      │   │
│  │                  │  │                   │   │
│  │  FastAPI Server  │  │  Nginx + HTML    │   │
│  │  - REST API      │  │  - Web Interface │   │
│  │  - Service Ctrl  │  │  - Status Monitor│   │
│  └────────┬─────────┘  └─────────┬────────┘   │
│           │                      │             │
│           └──────────┬───────────┘             │
│                      │                         │
│           ┌──────────▼──────────┐              │
│           │  VestaboardService  │              │
│           │  (Background Task)  │              │
│           └──────────┬──────────┘              │
└──────────────────────┼─────────────────────────┘
                       │
                       │ HTTP API
                       ▼
              ┌─────────────────┐
              │   Vestaboard     │
              │   Read/Write API │
              └─────────────────┘
```

## Next Steps

Once deployed and working:
- ✅ Access Web UI at `http://<synology-ip>:8080`
- ✅ Start the display service via Web UI or API
- ✅ Monitor logs for a few days
- ✅ Adjust refresh intervals if needed

