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

**For development/testing:** Just run `docker-compose up` - it works great for local dev! See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for more options.

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
- 🔄 **Smart Rotation**: Time-based rotation between screens with configurable durations
- 🎯 **Priority System**: Guest WiFi > Apple Music > Rotation > Weather
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
   ./codespaces_setup.sh
   ```

See [CODESPACES_SETUP.md](./CODESPACES_SETUP.md) for detailed instructions.

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
- **Home Assistant**: [HOME_ASSISTANT_SETUP.md](./HOME_ASSISTANT_SETUP.md)
- **Apple Music**: [APPLE_MUSIC_SETUP.md](./APPLE_MUSIC_SETUP.md)
- **Star Trek Quotes**: [STAR_TREK_QUOTES_SETUP.md](./STAR_TREK_QUOTES_SETUP.md)
- **Guest WiFi**: [GUEST_WIFI_SETUP.md](./GUEST_WIFI_SETUP.md)
- **Rotation Control**: [ROTATION_CONTROL.md](./ROTATION_CONTROL.md)

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

#### Rotation Control
- `ROTATION_ENABLED`: Enable/disable screen rotation (default: `true`)
- `ROTATION_WEATHER_DURATION`: Weather display duration in seconds (default: `300`)
- `ROTATION_HOME_ASSISTANT_DURATION`: Home Assistant duration in seconds (default: `300`)
- `ROTATION_STAR_TREK_DURATION`: Star Trek quotes duration in seconds (default: `180`)
- `ROTATION_ORDER`: Comma-separated list of screens (default: `weather,home_assistant`)

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

### Option 1: Docker Compose (Recommended for Testing)

```bash
# Build and run both API and Web UI
docker-compose up --build

# Access Web UI at http://localhost:8080
# Access API at http://localhost:8000
```

### Option 2: API Server with Auto-reload

```bash
# Install dependencies
pip install -r requirements.txt

# Run API server with auto-reload
uvicorn src.api_server:app --reload --port 8000

# In another terminal, serve Web UI
cd web_ui && python -m http.server 8080
```

### Option 3: Direct Python (Original Service)

```bash
pip install -r requirements.txt
python -m src.main
```

For detailed development workflows, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

## Display Priority System

The Vestaboard follows this priority order:

1. **Guest WiFi** (highest priority) - When enabled, overrides everything
2. **Apple Music** - When music is playing, takes precedence
3. **Rotation** - Weather, Home Assistant, and Star Trek rotate based on configuration
4. **Weather + DateTime** - Default display

This ensures important information (like guest WiFi) always shows, while allowing rotation of other content.

## Project Structure

```
Vesta/
├── src/
│   ├── main.py                      # Main entry point
│   ├── config.py                    # Configuration management
│   ├── vestaboard_client.py         # Vestaboard API client
│   ├── vestaboard_chars.py          # Character codes and weather symbols
│   ├── data_sources/
│   │   ├── weather.py               # Weather API integration
│   │   ├── datetime.py              # Date/time formatting
│   │   ├── apple_music.py           # Apple Music "Now Playing"
│   │   ├── home_assistant.py        # Home Assistant integration
│   │   ├── star_trek_quotes.py      # Star Trek quotes source
│   │   └── star_trek_quotes.json    # Quote database (102 quotes)
│   └── formatters/
│       └── message_formatter.py     # Message formatting for all screens
├── macos_helper/
│   ├── apple_music_service.py       # macOS helper for Apple Music
│   └── README.md                    # Helper service documentation
├── .env                             # Environment variables (create from env.example)
├── env.example                      # Configuration template
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md                        # This file
├── ROTATION_CONTROL.md              # Rotation configuration guide
├── HOME_ASSISTANT_SETUP.md          # Home Assistant setup guide
├── APPLE_MUSIC_SETUP.md             # Apple Music setup guide
├── STAR_TREK_QUOTES_SETUP.md        # Star Trek quotes guide
└── GUEST_WIFI_SETUP.md              # Guest WiFi guide
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

### Legacy Docker Commands (Original Service)

```bash
# Build image
docker build -f Dockerfile -t vestaboard-display .

# Run container
docker run -d \
  --name vestaboard-display \
  --env-file .env \
  --restart unless-stopped \
  vestaboard-display

# View logs
docker logs -f vestaboard-display

# Stop container
docker stop vestaboard-display
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

### Rotation Control
Control how screens rotate on your Vestaboard. Configure duration for each screen and choose which screens to include in rotation.

See [ROTATION_CONTROL.md](./ROTATION_CONTROL.md) for:
- Time-based rotation configuration
- Screen duration settings
- Common rotation patterns
- Troubleshooting

### Star Trek Quotes
Display inspiring quotes from TNG, Voyager, and DS9 with a configurable ratio between series.

See [STAR_TREK_QUOTES_SETUP.md](./STAR_TREK_QUOTES_SETUP.md) for:
- Quote ratio configuration (default: 3:5:9)
- Full list of 102 quotes
- Custom quote addition
- Display format

### Home Assistant Integration
Show real-time status of doors, garage, locks, and other Home Assistant entities.

See [HOME_ASSISTANT_SETUP.md](./HOME_ASSISTANT_SETUP.md) for:
- Getting access tokens
- Finding entity IDs
- Status indicators ([G] = good, [R] = attention needed)
- Entity configuration

### Apple Music "Now Playing"
Display currently playing music from Apple Music on your Mac.

See [APPLE_MUSIC_SETUP.md](./APPLE_MUSIC_SETUP.md) for:
- macOS helper service setup
- Network configuration
- LaunchAgent for auto-start
- Troubleshooting

### Guest WiFi Display
Easily display WiFi credentials for guests, toggled on/off via configuration.

See [GUEST_WIFI_SETUP.md](./GUEST_WIFI_SETUP.md) for:
- Simple toggle setup
- Display format
- Security considerations

## Future Features

- 🚴 Baywheels station availability
- 🚗 Waymo ride pricing
- 🌐 Webhook support for manual messages
- 📸 Custom image display
- 📊 Analytics and usage stats

## Development

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed development roadmap.

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

### Setup Guides
- [General Setup](./SETUP.md)
- [Rotation Control](./ROTATION_CONTROL.md)
- [Star Trek Quotes](./STAR_TREK_QUOTES_SETUP.md)
- [Home Assistant](./HOME_ASSISTANT_SETUP.md)
- [Apple Music](./APPLE_MUSIC_SETUP.md)
- [Guest WiFi](./GUEST_WIFI_SETUP.md)

### Development
- [Development Plan](./DEVELOPMENT_PLAN.md)
- [API Research](./API_RESEARCH.md)

