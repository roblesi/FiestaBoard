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
- 🎵 **Apple Music**: "Now Playing" display (artist + song) when music is playing
- 📶 **Guest WiFi**: Display WiFi credentials for guests (easily toggled on/off)

### System Features
- 📄 **Page-Based Display**: Create and select pages via the web UI
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
- **Apple Music**: [APPLE_MUSIC_SETUP.md](./docs/features/APPLE_MUSIC_SETUP.md)
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

#### Apple Music
- `APPLE_MUSIC_ENABLED`: Enable Apple Music "Now Playing" (default: `false`)
- `APPLE_MUSIC_SERVICE_URL`: URL to macOS helper service
- `APPLE_MUSIC_REFRESH_SECONDS`: How often to check for playing music (default: `10`)

#### Guest WiFi
- `GUEST_WIFI_ENABLED`: Display guest WiFi credentials (default: `false`)
- `GUEST_WIFI_SSID`: Network name
- `GUEST_WIFI_PASSWORD`: Network password

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

## Docker Commands

### Using Docker Compose (Recommended)

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

### Apple Music "Now Playing"
Display currently playing music from Apple Music on your Mac.

See [APPLE_MUSIC_SETUP.md](./docs/features/APPLE_MUSIC_SETUP.md) for:
- macOS helper service setup
- Network configuration
- LaunchAgent for auto-start
- Troubleshooting

### Guest WiFi Display
Easily display WiFi credentials for guests, toggled on/off via configuration.

See [GUEST_WIFI_SETUP.md](./docs/features/GUEST_WIFI_SETUP.md) for:
- Simple toggle setup
- Display format
- Security considerations

## Future Features

- 🚴 Baywheels station availability
- 🚗 Waymo ride pricing
- 🌐 Webhook support for manual messages
- 📸 Custom image display
- 📊 Analytics and usage stats

## License

MIT

## Screenshots

The Vestaboard displays various screens in rotation:

- **Weather + DateTime**: Current conditions with temperature and text-based weather icons
- **Home Assistant**: House status with green ([G]) and red ([R]) indicators
- **Star Trek Quotes**: Inspiring quotes from TNG, Voyager, and DS9
- **Apple Music**: Currently playing artist and song
- **Guest WiFi**: SSID and password for guests

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
- [Deploy to Synology](./docs/deployment/DEPLOY_TO_SYNOLOGY.md)
- [API Research](./docs/reference/API_RESEARCH.md)
- [Character Codes](./docs/reference/VESTABOARD_CHARACTER_CODES.md)


---
Made with ❤️ in San Francisco.