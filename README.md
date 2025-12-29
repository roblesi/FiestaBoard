# Vestaboard Display Service

A Python service that runs in Docker to display dynamic information on your Vestaboard, including weather, date/time, house status, Star Trek quotes, Apple Music "Now Playing", and guest WiFi credentials.

## 🚀 TLDR - Quick Start

**Just want to get it running? Here's the fastest way:**

```bash
# 1. Create .env file with your API keys
cp env.example .env
# Edit .env and add: VB_READ_WRITE_KEY and WEATHER_API_KEY

# 2. Run it! (first time builds images)
docker-compose up --build

# Or for subsequent runs (uses cached images)
docker-compose up
```

That's it! 🎉

**Access:**
- **Web UI**: http://localhost:8080 (start service, send messages, monitor)
- **API**: http://localhost:8000 (REST API endpoints)
- **API Docs**: http://localhost:8000/docs (interactive API documentation)

**To start the display service:**
1. Open http://localhost:8080 in your browser
2. Click "▶ Start Service" button
3. Your Vestaboard will start updating!

**To stop:**
```bash
docker-compose down
```

**For development/testing:** Just run `docker-compose up` - it works great for local dev! See [LOCAL_DEVELOPMENT.md](./docs/setup/LOCAL_DEVELOPMENT.md) for more options.

---

## Features

### Core Features
- 🌤️ **Weather Display**: Current weather conditions with text-based icons
- 📅 **Date/Time**: Current date and time with timezone support
- 🏠 **Home Assistant**: House status display (doors, garage, locks, etc.)
- 🖖 **Star Trek Quotes**: Random quotes from TNG, Voyager, and DS9 with configurable ratio
- 📶 **Guest WiFi**: Display WiFi credentials for guests (easily toggled on/off)
- 🚴 **Bay Wheels**: Track bike availability at multiple stations with visual station finder
- 🚇 **Muni Transit**: Real-time SF Muni arrival predictions with stop finder (search by address or location)
- 🚗 **Traffic**: Drive time to destinations with live traffic conditions (multiple routes supported)
- 🌙 **Silence Schedule**: Configure a time window when the Vestaboard won't send updates (e.g., 8pm-7am)

### System Features
- 📄 **Page-Based Display**: Create and select pages via the web UI
- 🔄 **Configurable Update Interval**: Adjust how often the board checks for new content (10-3600 seconds)
- 🐳 **Docker Ready**: Containerized for easy deployment on any system
- ⚙️ **Highly Configurable**: Environment-based configuration for all features
- 🔒 **Secure**: API token support for all integrations

## Quick Start (Detailed)

### Prerequisites

- Docker and Docker Compose installed
- Vestaboard Read/Write API key
- Weather API key (WeatherAPI.com recommended)
- (Optional) Home Assistant server with access token
- (Optional) Mac with Apple Music for "Now Playing" feature

### GitHub Codespaces (Recommended for Development)

If you're using GitHub Codespaces:

1. **Add Codespaces secrets** to your repository:
   - Go to **Settings** → **Secrets and variables** → **Codespaces**
   - Add `VB_READ_WRITE_KEY` (your Vestaboard API key)
   - Add `WEATHER_API_KEY` (your Weather API key)

2. **Launch a Codespace** from your repository

3. **Run the setup script**:
   ```bash
   ./scripts/codespaces_setup.sh
   ```

See [CODESPACES_SETUP.md](./docs/setup/CODESPACES_SETUP.md) for detailed instructions.

### Basic Setup

1. **Clone or navigate to the project directory**

2. **Create `.env` file**:
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` and add your API keys**:
   ```bash
   # Required
   VB_READ_WRITE_KEY=your_vestaboard_key_here
   WEATHER_API_KEY=your_weather_api_key_here
   WEATHER_PROVIDER=weatherapi
   WEATHER_LOCATION=San Francisco, CA
   TIMEZONE=America/Los_Angeles
   
   # Optional features (see setup guides)
   STAR_TREK_QUOTES_ENABLED=true
   HOME_ASSISTANT_ENABLED=false
   APPLE_MUSIC_ENABLED=false
   GUEST_WIFI_ENABLED=false
   SILENCE_SCHEDULE_ENABLED=false
   ```

4. **Build and run with Docker Compose**:
   ```bash
   # First time (builds images)
   docker-compose up --build
   
   # Or run in background
   docker-compose up -d --build
   ```

5. **Access the services**:
   - **Web UI**: http://localhost:8080
   - **API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs

6. **Start the display service**:
   - Open http://localhost:8080 in your browser
   - Click "▶ Start Service" button
   - Your Vestaboard will begin updating!

7. **View logs**:
   ```bash
   docker-compose logs -f
   ```

### Advanced Setup

For detailed setup instructions for specific features, see:
- **Home Assistant**: [HOME_ASSISTANT_SETUP.md](./docs/features/HOME_ASSISTANT_SETUP.md)
- **Star Trek Quotes**: [STAR_TREK_QUOTES_SETUP.md](./docs/features/STAR_TREK_QUOTES_SETUP.md)
- **Guest WiFi**: [GUEST_WIFI_SETUP.md](./docs/features/GUEST_WIFI_SETUP.md)

## Configuration

All configuration is done via environment variables in `.env`:

### Required

- `VB_READ_WRITE_KEY`: Your Vestaboard Read/Write API key
- `WEATHER_API_KEY`: Your weather API key

### Core Configuration

- `WEATHER_PROVIDER`: `weatherapi` (default) or `openweathermap`
- `WEATHER_LOCATION`: Location string (default: "San Francisco, CA")
- `TIMEZONE`: Timezone name (default: "America/Los_Angeles")
- `REFRESH_INTERVAL_SECONDS`: Update frequency in seconds (default: 300 = 5 minutes)

### Feature Configuration

#### Star Trek Quotes
- `STAR_TREK_QUOTES_ENABLED`: Enable Star Trek quotes (default: `false`)
- `STAR_TREK_QUOTES_RATIO`: Ratio between TNG:Voyager:DS9 (default: `3:5:9`)

#### Home Assistant
- `HOME_ASSISTANT_ENABLED`: Enable Home Assistant integration (default: `false`)
- `HOME_ASSISTANT_BASE_URL`: Your Home Assistant URL
- `HOME_ASSISTANT_ACCESS_TOKEN`: Long-lived access token
- `HOME_ASSISTANT_ENTITIES`: JSON array of entities to monitor

#### Guest WiFi
- `GUEST_WIFI_ENABLED`: Display guest WiFi credentials (default: `false`)
- `GUEST_WIFI_SSID`: Network name
- `GUEST_WIFI_PASSWORD`: Network password

#### Silence Schedule
- `SILENCE_SCHEDULE_ENABLED`: Enable silence schedule (default: `false`)
- `SILENCE_SCHEDULE_START_TIME`: When silence mode starts (default: `20:00` / 8pm)
- `SILENCE_SCHEDULE_END_TIME`: When silence mode ends (default: `07:00` / 7am)

The silence schedule prevents the Vestaboard from sending updates during the configured time window. Times are in your local timezone (configured via `TIMEZONE`). The window can span midnight (e.g., 8pm to 7am).

See `env.example` for all available options.

## Local Development

### Docker Compose (Recommended)

```bash
# Build and run for development
docker-compose -f docker-compose.dev.yml up --build

# Access Web UI at http://localhost:3000
# Access API at http://localhost:8000
```

The development environment includes hot reload for both Python and Next.js code.

For detailed development workflows, see [LOCAL_DEVELOPMENT.md](./docs/setup/LOCAL_DEVELOPMENT.md).

## How It Works

Select a page in the web UI and the service will keep it updated on your Vestaboard. Pages use templates with dynamic data sources like weather, time, and more. Create custom pages to display exactly what you want.

## Project Structure

```
Vesta/
├── src/                            # Python API and display service
│   ├── api_server.py               # FastAPI REST API
│   ├── main.py                     # Display service core
│   ├── config.py                   # Configuration management
│   ├── vestaboard_client.py        # Vestaboard API client
│   ├── data_sources/               # Data integrations
│   └── formatters/                 # Message formatting
├── web/                            # Next.js web UI
│   └── src/                        # React components and pages
├── docs/                           # Documentation
│   ├── setup/                      # Setup guides
│   ├── features/                   # Feature guides
│   ├── deployment/                 # Deployment guides
│   └── reference/                  # API research and reference
├── scripts/                        # Utility scripts
├── tests/                          # Test suite
├── macos_helper/                   # macOS Apple Music helper
├── Dockerfile.api                  # API service Dockerfile
├── Dockerfile.ui                   # Web UI Dockerfile
├── docker-compose.yml              # Production compose
├── docker-compose.dev.yml          # Development compose
└── .env                            # Environment variables
```

## API Keys

### Vestaboard

1. Go to [web.vestaboard.com](https://web.vestaboard.com)
2. Navigate to API section
3. Enable Read/Write API
4. Copy your Read/Write API key

### Weather

**Recommended: WeatherAPI.com**
- Sign up at [weatherapi.com](https://www.weatherapi.com/)
- Free tier: 1 million calls/month
- No credit card required

**Alternative: OpenWeatherMap**
- Sign up at [openweathermap.org](https://openweathermap.org/)
- Free tier: 1,000 calls/day

## Deployment

### Local Development / Testing

Use Docker Compose for local development:

```bash
# Build and start services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f vestaboard-api
docker-compose logs -f vestaboard-ui

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

### Production Deployment (Synology NAS)

Vesta uses **GitHub Container Registry (GHCR)** for production deployments with automatic builds:

#### Features
- ✅ **Automatic Builds**: GitHub Actions builds images on every push to `main`
- ✅ **One-Click Updates**: Use Synology Container Manager's Update button
- ✅ **Portable Images**: No hardcoded IPs, works anywhere
- ✅ **Version Control**: Tagged images for easy rollbacks

#### Initial Setup (One-Time)

1. **Create GitHub Personal Access Token**
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Create token with `read:packages` permission
   - Add to your `.env` file: `GITHUB_TOKEN=ghp_xxx...`

2. **Configure Synology in `.env`**
   ```bash
   SYNOLOGY_HOST=192.168.x.x
   SYNOLOGY_USER=your-username
   GITHUB_TOKEN=ghp_xxx...
   ```

3. **Deploy to Synology**
   ```bash
   ./deploy.sh
   ```

#### Updating to Latest Version

**Method 1: Synology Container Manager (Recommended)**
1. Open Container Manager on Synology
2. Select `vestaboard-api` and `vestaboard-ui` containers
3. Click Action → Update
4. Done! Latest version is now running

**Method 2: Command Line**
```bash
# Re-run deploy script
./deploy.sh

# Or SSH directly to Synology
ssh user@synology-ip
cd ~/vestaboard
sudo docker-compose pull
sudo docker-compose down
sudo docker-compose up -d
```

#### Complete Documentation

For detailed setup instructions, troubleshooting, and advanced topics:
- **[GitHub Registry Setup Guide](./docs/deployment/GITHUB_REGISTRY_SETUP.md)** - Complete GHCR deployment guide
- **[Deploy to Synology](./docs/deployment/DEPLOY_TO_SYNOLOGY.md)** - Synology-specific instructions


## Troubleshooting

### API Key Errors

- Verify your `.env` file exists and contains valid keys
- Check that keys don't have extra spaces or quotes
- For Vestaboard: Ensure Read/Write API is enabled in your account

### Weather API Errors

- Verify your API key is correct
- Check API rate limits haven't been exceeded
- Ensure location string is valid

### Docker Issues

- Ensure Docker is running: `docker ps`
- Check container logs: `docker-compose logs`
- Verify `.env` file is readable

## Feature Guides

### Star Trek Quotes
Display inspiring quotes from TNG, Voyager, and DS9 with a configurable ratio between series.

See [STAR_TREK_QUOTES_SETUP.md](./docs/features/STAR_TREK_QUOTES_SETUP.md) for:
- Quote ratio configuration (default: 3:5:9)
- Full list of 102 quotes
- Custom quote addition
- Display format

### Home Assistant Integration
Show real-time status of doors, garage, locks, and other Home Assistant entities.

See [HOME_ASSISTANT_SETUP.md](./docs/features/HOME_ASSISTANT_SETUP.md) for:
- Getting access tokens
- Finding entity IDs
- Status indicators ([G] = good, [R] = attention needed)
- Entity configuration

### Guest WiFi Display
Easily display WiFi credentials for guests, toggled on/off via configuration.

See [GUEST_WIFI_SETUP.md](./docs/features/GUEST_WIFI_SETUP.md) for:
- Simple toggle setup
- Display format
- Security considerations

### Board Update Interval
Configure how often the board checks for new content to display. The default is 60 seconds (1 minute).

**Features:**
- Adjustable from 10 seconds to 3600 seconds (1 hour)
- Configure via web UI Settings page
- Requires service restart to take effect

**Use Cases:**
- **Faster updates (10-30 seconds)**: For time-sensitive displays like transit arrivals or traffic
- **Standard updates (60 seconds)**: Default, good balance for most use cases
- **Slower updates (300+ seconds)**: For static content or to reduce API calls

**To configure:** Go to Settings → General Settings → Board Update Interval in the web UI.

### Silence Schedule
Configure a time window when the Vestaboard won't send updates. Perfect for quiet hours (e.g., 8pm to 7am).

**Features:**
- Set custom start and end times (24-hour format)
- Times are in your configured timezone
- Supports windows that span midnight (e.g., 8pm to 7am)
- Configure via web UI or environment variables

**Example:** Set `SILENCE_SCHEDULE_START_TIME=20:00` and `SILENCE_SCHEDULE_END_TIME=07:00` to prevent updates between 8pm and 7am.

### Bay Wheels Bike Share
Track bike availability at multiple Bay Wheels stations with an easy-to-use station finder.

**Features:**
- **Visual Station Finder**: Search for stations by address, coordinates, or your current location
- **Multiple Stations**: Track up to 4 stations simultaneously
- **Live Data**: See real-time electric and classic bike availability
- **Indexed Template Access**: Use `{{baywheels.stations.0.electric_bikes}}` to access specific stations
- **Aggregate Stats**: Display totals across all stations with `{{baywheels.total_electric}}`

**Setup:**
1. Enable Bay Wheels in Settings
2. Use the station finder to search near your location
3. Select up to 4 stations to monitor
4. Use indexed variables in your page templates

### Muni Transit
Real-time SF Muni arrival predictions with an intelligent stop finder.

**Features:**
- **Visual Stop Finder**: Search for Muni stops by address, coordinates, or your current location
- **Multiple Stops**: Track up to 4 stops simultaneously
- **Route Information**: See which lines serve each stop
- **Live Arrivals**: Real-time arrival predictions for all configured stops
- **Indexed Template Access**: Use `{{muni.stops.0.formatted}}` to display arrivals for specific stops
- **Line Filtering**: Optionally filter to specific lines (e.g., N-Judah only)

**Setup:**
1. Get a free API key from [511.org/open-data](https://511.org/open-data)
2. Enable Muni in Settings and enter your API key
3. Use the stop finder to search near your location
4. Select up to 4 stops to monitor
5. Use indexed variables in your page templates (e.g., `{{muni.stops.0.line}}`, `{{muni.stops.1.formatted}}`)

**Example Template:**
```
{center}MUNI ARRIVALS
{{muni.stops.0.formatted}}
{{muni.stops.1.formatted}}
```

**Regional Transit Caching:**

Vesta uses an intelligent regional caching system to avoid 511.org API rate limits:
- **Single Regional Request**: Fetches ALL Bay Area transit data (Muni, BART, Caltrain, etc.) in one API call
- **Automatic Refresh**: Cache refreshes every 90 seconds (configurable), staying well within the 60 requests/hour limit
- **Instant Responses**: All Muni data served from cache with zero API latency
- **Graceful Degradation**: If API is unavailable, serves stale cache data
- **API Call Reduction**: Reduces API calls from 100+ per hour to ~40 per hour

**Cache Configuration** (optional):
```json
{
  "features": {
    "muni": {
      "transit_cache_enabled": true,
      "transit_cache_refresh_seconds": 90
    }
  }
}
```

**Monitoring Cache Health:**

Check cache status via API endpoint:
```bash
curl http://localhost:8000/transit/cache/status
```

Returns cache age, refresh count, agencies cached, and staleness warnings.

### Traffic
Monitor drive times to multiple destinations with live traffic conditions.

**Features:**
- **Visual Route Planner**: Configure routes with origin and destination
- **Multiple Routes**: Track up to 4 routes simultaneously
- **Route Validation**: Validate routes before saving to ensure they work
- **Live Traffic**: Real-time traffic conditions and delay estimates
- **Indexed Template Access**: Use `{{traffic.routes.0.formatted}}` to display specific routes
- **Status Colors**: Automatic color coding based on traffic conditions (green/yellow/red)

**Setup:**
1. Get a Google Routes API key with Routes API enabled
2. Enable Traffic in Settings and enter your API key
3. Use the route planner to add routes:
   - Enter origin (address or coordinates)
   - Enter destination (address or coordinates)
   - Add a short display name (e.g., "WORK", "AIRPORT")
   - Click "Validate Route" to test
   - Click "Add Route" to save
4. Use indexed variables in your page templates (e.g., `{{traffic.routes.0.formatted}}`, `{{traffic.routes.1.duration_minutes}}`)

**Example Template:**
```
{center}COMMUTE TIMES
HOME→WORK: {{traffic.routes.0.duration_minutes}}m
HOME→AIRPORT: {{traffic.routes.1.duration_minutes}}m
```

## Future Features

- 🌐 Webhook support for manual messages
- 📸 Custom image display
- 📊 Analytics and usage stats
- 🌊 Surf conditions
- 💨 Air quality and fog conditions

## License

MIT

## Screenshots

The Vestaboard can display various screens:

- **Weather + DateTime**: Current conditions with temperature and text-based weather icons
- **Home Assistant**: House status with green ([G]) and red ([R]) indicators
- **Star Trek Quotes**: Inspiring quotes from TNG, Voyager, and DS9
- **Guest WiFi**: SSID and password for guests

**System Features:**
- **Silence Schedule**: Configure quiet hours when the board won't update (e.g., 8pm-7am)

## References

### APIs and Services
- [Vestaboard API Docs](https://docs.vestaboard.com/docs/read-write-api/introduction)
- [WeatherAPI.com](https://www.weatherapi.com/)
- [OpenWeatherMap](https://openweathermap.org/api)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)

### Documentation
- [Local Development](./docs/setup/LOCAL_DEVELOPMENT.md)
- [Docker Setup](./docs/setup/DOCKER_SETUP.md)
- [Cloud API Setup](./docs/setup/CLOUD_API_SETUP.md)
- [GitHub Registry Setup](./docs/deployment/GITHUB_REGISTRY_SETUP.md) - **Recommended for production**
- [Deploy to Synology](./docs/deployment/DEPLOY_TO_SYNOLOGY.md)
- [API Research](./docs/reference/API_RESEARCH.md)
- [Character Codes](./docs/reference/VESTABOARD_CHARACTER_CODES.md)


---
Made with ❤️ in San Francisco.