# Vestaboard Display Service

A Python service that runs in Docker to display dynamic information on your Vestaboard, including weather, date/time, and future integrations with Baywheels and Waymo APIs.

## Features

- 🌤️ **Weather Display**: Current weather conditions from WeatherAPI.com or OpenWeatherMap
- 📅 **Date/Time**: Current date and time with timezone support
- 🔄 **Auto-refresh**: Configurable refresh intervals
- 🐳 **Docker Ready**: Containerized for easy deployment
- ⚙️ **Configurable**: Environment-based configuration

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Vestaboard Read/Write API key
- Weather API key (WeatherAPI.com recommended)

### Setup

1. **Clone or navigate to the project directory**

2. **Create `.env` file**:
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` and add your API keys**:
   ```bash
   VB_READ_WRITE_KEY=your_vestaboard_key_here
   WEATHER_API_KEY=your_weather_api_key_here
   WEATHER_PROVIDER=weatherapi
   WEATHER_LOCATION=San Francisco, CA
   TIMEZONE=America/Los_Angeles
   ```

4. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

5. **View logs**:
   ```bash
   docker-compose logs -f
   ```

## Configuration

All configuration is done via environment variables in `.env`:

### Required

- `VB_READ_WRITE_KEY`: Your Vestaboard Read/Write API key
- `WEATHER_API_KEY`: Your weather API key

### Optional

- `WEATHER_PROVIDER`: `weatherapi` (default) or `openweathermap`
- `WEATHER_LOCATION`: Location string (default: "San Francisco, CA")
- `TIMEZONE`: Timezone name (default: "America/Los_Angeles")
- `REFRESH_INTERVAL_SECONDS`: Update frequency in seconds (default: 300 = 5 minutes)

See `env.example` for all available options.

## Local Development

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Locally

```bash
python -m src.main
```

Make sure your `.env` file is in the project root.

## Project Structure

```
Vesta/
├── src/
│   ├── main.py                 # Main entry point
│   ├── config.py               # Configuration management
│   ├── vestaboard_client.py    # Vestaboard API client
│   ├── data_sources/
│   │   ├── weather.py          # Weather API integration
│   │   └── datetime.py         # Date/time formatting
│   └── formatters/
│       └── message_formatter.py # Message formatting
├── .env                        # Environment variables (create from env.example)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
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

```bash
# Build image
docker build -t vestaboard-display .

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

# Remove container
docker rm vestaboard-display
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

## Future Features

- 🚴 Baywheels station availability (Phase 3)
- 🚗 Waymo ride pricing (Phase 4)
- 📊 Message rotation/cycling
- 🔔 Priority message system
- 🌐 Webhook support for manual messages

## Development

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed development roadmap.

## License

MIT

## References

- [Vestaboard API Docs](https://docs.vestaboard.com/docs/read-write-api/introduction)
- [WeatherAPI.com](https://www.weatherapi.com/)
- [OpenWeatherMap](https://openweathermap.org/api)

