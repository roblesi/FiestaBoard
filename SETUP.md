# Setup Instructions

## Initial Setup

### 1. Create Environment File

Create a `.env` file in the project root with your API keys:

```bash
cp env.example .env
```

**Important**: Your API keys have been saved. You'll need to manually create the `.env` file with:

```bash
# Vestaboard Configuration
VB_READ_WRITE_KEY=1a801a86+c1f1+4007+bec9+7ea92443d3cd

# Weather API Configuration
WEATHER_API_KEY=bd6af5858e41468396d25331252312
WEATHER_PROVIDER=weatherapi
```

Then edit `.env` and add your actual API keys:

```bash
# Vestaboard Configuration
VB_READ_WRITE_KEY=1a801a86+c1f1+4007+bec9+7ea92443d3cd

# Weather API Configuration
# Get your API key from https://www.weatherapi.com/ (recommended)
WEATHER_API_KEY=your_weather_api_key_here
WEATHER_PROVIDER=weatherapi

# Location Configuration
WEATHER_LOCATION=San Francisco, CA
TIMEZONE=America/Los_Angeles
```

### 2. Get Weather API Key

**Recommended: WeatherAPI.com**
1. Sign up at https://www.weatherapi.com/
2. Get your free API key (1 million calls/month)
3. Add it to `.env` as `WEATHER_API_KEY`

**Alternative: OpenWeatherMap**
1. Sign up at https://openweathermap.org/
2. Get your free API key (1,000 calls/day)
3. Set `WEATHER_PROVIDER=openweathermap` in `.env`

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run Locally (for testing)

You have several options for local development:

**Option A: Run the service directly (original)**
```bash
python -m src.main
```

**Option B: Run the API server (new - recommended for development)**
```bash
# Install FastAPI dependencies (if not already done)
pip install -r requirements.txt

# Run API server with auto-reload
uvicorn src.api_server:app --reload --host 0.0.0.0 --port 8000
```

Then access:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Option C: Run with Docker Compose (full setup)**
```bash
docker-compose up --build
```

Then access:
- Web UI: http://localhost:8080
- API: http://localhost:8000

For detailed development workflows, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

### 5. Build and Run with Docker

```bash
# Build the image
docker build -t vestaboard-display .

# Run the container
docker run -d \
  --name vestaboard-display \
  --env-file .env \
  --restart unless-stopped \
  vestaboard-display
```

Or use docker-compose (now includes API + Web UI):

```bash
# Build and run both API and UI services
docker-compose up -d --build

# Access Web UI at http://localhost:8080
# Access API at http://localhost:8000
```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for more details.

## Security Notes

- **NEVER commit `.env` to git** - it's already in `.gitignore`
- Keep your API keys secure
- The `.env.example` file is safe to commit (no real keys)

## Configuration

All configuration is done via environment variables in `.env`. The application will:
1. Load environment variables from `.env`
2. Use defaults for optional values
3. Validate required keys on startup

## Troubleshooting

- **API key errors**: Make sure your `.env` file exists and contains valid keys
- **Import errors**: Run `pip install -r requirements.txt`
- **Docker errors**: Ensure Docker is running and you have permissions

