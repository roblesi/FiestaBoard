# Local Development Guide

This guide explains how to develop the Vestaboard Display Service locally, with options for both Docker and non-Docker workflows.

## Development Options

You have **three main ways** to develop locally:

1. **Direct Python** - Run the service directly (fastest for development)
2. **API Server** - Run the FastAPI server locally (for API/UI development)
3. **Docker Compose** - Full containerized setup (matches production)

## Option 1: Direct Python (Original Service)

Best for: Testing the core display service logic

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service directly
python -m src.main
```

This runs the original scheduled service that updates the Vestaboard on a schedule.

**Pros:**
- Fastest iteration
- No Docker overhead
- Easy debugging with print statements
- Direct access to logs

**Cons:**
- No API endpoints
- No web UI
- Can't test API/UI features

## Option 2: API Server (Recommended for API/UI Development)

Best for: Developing the API, Web UI, or testing service control

```bash
# Install dependencies (including FastAPI)
pip install -r requirements.txt

# Run the API server
python -m src.api_server
```

Or using uvicorn directly:

```bash
uvicorn src.api_server:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables auto-reload on code changes.

**Access:**
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

**For Web UI Development:**

You can serve the UI locally while the API runs separately:

```bash
# Terminal 1: Run API server
uvicorn src.api_server:app --reload --port 8000

# Terminal 2: Serve UI (using Python's http.server)
cd web_ui
python -m http.server 8080
```

Or use any static file server:
```bash
# Using npx (if you have Node.js)
cd web_ui
npx serve -p 8080

# Or using Python
cd web_ui
python -m http.server 8080
```

**Note:** When running UI separately, update `web_ui/index.html` to use `http://localhost:8000` instead of `/api` proxy.

**Pros:**
- Fast development cycle
- Auto-reload on changes
- Can test API endpoints
- Can develop UI separately
- Easy debugging

**Cons:**
- Need to manage two processes
- Not exactly like production

## Option 3: Docker Compose (Production-like)

Best for: Testing the full production setup, deployment verification

```bash
# Build and run both services
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access:**
- Web UI: http://localhost:8080
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**For Development with Auto-reload:**

You can mount your source code as a volume for live updates:

```yaml
# Add to docker-compose.yml for development
services:
  vestaboard-api:
    volumes:
      - ./src:/app/src
    # This allows code changes to be reflected (if using --reload)
```

Then run with:
```bash
docker-compose up --build
```

**Pros:**
- Matches production environment
- Tests full Docker setup
- Isolated dependencies
- Easy to test deployment

**Cons:**
- Slower iteration (rebuild needed)
- More complex debugging
- Requires Docker

## Recommended Development Workflow

### For Core Service Development

1. Use **Option 1** (Direct Python) for quick testing
2. Use `test_mvp_local.py` for validation
3. Switch to **Option 2** (API Server) to test API integration

### For API/UI Development

1. Use **Option 2** (API Server) with auto-reload
2. Run UI separately or use Docker Compose
3. Test in **Option 3** (Docker) before committing

### For Deployment Testing

1. Use **Option 3** (Docker Compose) to verify deployment
2. Test all endpoints
3. Verify Web UI works correctly

## Development Tips

### Hot Reload for API

When running the API server directly, use `--reload`:

```bash
uvicorn src.api_server:app --reload --host 0.0.0.0 --port 8000
```

This automatically restarts the server when you change Python files.

### Testing API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Status
curl http://localhost:8000/status

# Start service
curl -X POST http://localhost:8000/start

# Send message
curl -X POST http://localhost:8000/send-message \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'
```

### Environment Variables

All development modes use the same `.env` file:

```bash
# Make sure .env exists
cp env.example .env
# Edit .env with your API keys
```

### Debugging

**Direct Python:**
- Use `print()` statements or Python debugger
- Logs go directly to console

**API Server:**
- Use FastAPI's built-in logging
- Check console output
- Use `/docs` endpoint for interactive testing

**Docker:**
- View logs: `docker-compose logs -f vestaboard-api`
- Exec into container: `docker exec -it vestaboard-api bash`
- Check container status: `docker-compose ps`

## VS Code / Dev Container

If using VS Code with Dev Containers:

1. The `.devcontainer/devcontainer.json` is configured
2. Open in container: VS Code → "Reopen in Container"
3. Dependencies are installed automatically
4. You can run any of the three options above

To add port forwarding for the API/UI:

```json
{
  "forwardPorts": [8000, 8080],
  "portsAttributes": {
    "8000": { "label": "API Server" },
    "8080": { "label": "Web UI" }
  }
}
```

## Quick Reference

| Task | Command |
|------|---------|
| Run service directly | `python -m src.main` |
| Run API server | `uvicorn src.api_server:app --reload` |
| Run with Docker | `docker-compose up --build` |
| Test locally | `python test_mvp_local.py` |
| View API docs | http://localhost:8000/docs |
| View Web UI | http://localhost:8080 |

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000
lsof -i :8080

# Kill the process or use different ports
```

### Module Not Found

```bash
# Make sure dependencies are installed
pip install -r requirements.txt
```

### API Can't Connect to Service

- Make sure the service is initialized: Check `/status` endpoint
- Check logs for initialization errors
- Verify `.env` file has required keys

### UI Can't Connect to API

- Check API is running: `curl http://localhost:8000/health`
- If running UI separately, update API URL in `index.html`
- Check browser console for CORS errors


