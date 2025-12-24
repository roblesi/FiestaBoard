# Quick Start Guide

## 🚀 Fastest Way to Get Started

### 1. Setup Environment

```bash
# Copy example env file
cp env.example .env

# Edit .env with your API keys
# (Required: VB_READ_WRITE_KEY, WEATHER_API_KEY)
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Choose Your Development Mode

#### Option A: API + Web UI (Recommended)

```bash
# Run API server
uvicorn src.api_server:app --reload --port 8000
```

In another terminal:
```bash
# Serve Web UI
cd web_ui
python -m http.server 8080
```

Access:
- **Web UI**: http://localhost:8080
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

#### Option B: Docker (Production-like)

```bash
docker-compose up --build
```

Access:
- **Web UI**: http://localhost:8080
- **API**: http://localhost:8000

#### Option C: Original Service (Direct)

```bash
python -m src.main
```

Runs the scheduled service directly (no API/UI).

## 📚 More Information

- **Local Development**: See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)
- **Docker Setup**: See [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- **Deployment**: See [DEPLOY_TO_SYNOLOGY.md](./DEPLOY_TO_SYNOLOGY.md)

## 🧪 Testing

```bash
# Run test suite
python test_mvp_local.py

# Test API health
curl http://localhost:8000/health

# Test API status
curl http://localhost:8000/status
```

## 🎯 Next Steps

1. Start the API server (Option A or B above)
2. Open Web UI at http://localhost:8080
3. Click "Start Service" to begin updating Vestaboard
4. Use "Send Custom Message" to test


