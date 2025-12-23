# Vestaboard Display Service - Development Plan

## Overview
A Python-based service that runs in Docker to display dynamic information on a Vestaboard, including weather, date/time, and future integrations with Baywheels and Waymo APIs.

## Project Structure

```
Vesta/
├── src/
│   ├── __init__.py
│   ├── main.py                 # Main entry point
│   ├── vestaboard_client.py    # Vestaboard API wrapper
│   ├── data_sources/
│   │   ├── __init__.py
│   │   ├── weather.py          # Weather API integration
│   │   ├── datetime.py          # Date/time formatting
│   │   ├── baywheels.py        # Baywheels GBFS integration (future)
│   │   └── waymo.py            # Waymo API integration (future)
│   ├── formatters/
│   │   ├── __init__.py
│   │   └── message_formatter.py # Format data for Vestaboard display
│   └── config.py               # Configuration management
├── config/
│   └── config.yaml.example     # Example configuration file
├── docker/
│   └── Dockerfile
├── requirements.txt
├── .env.example                # Example environment variables
├── .dockerignore
├── README.md
└── DEVELOPMENT_PLAN.md         # This file
```

## Development Phases

### Phase 1: Core Infrastructure (MVP)
**Goal**: Basic working system with weather and date/time display

#### 1.1 Project Setup
- [ ] Initialize Python project structure
- [ ] Create `requirements.txt` with dependencies:
  - `requests` - HTTP requests
  - `pyyaml` - Configuration file parsing
  - `python-dotenv` - Environment variable management
  - `schedule` - Task scheduling
- [ ] Set up logging configuration

#### 1.2 Configuration System
- [ ] Create `config.yaml` structure:
  ```yaml
  vestaboard:
    api_key: ${VB_API_KEY}  # From env var
    read_write_key: ${VB_READ_WRITE_KEY}
  
  refresh:
    interval_seconds: 300  # 5 minutes default
  
  data_sources:
    weather:
      enabled: true
      api_key: ${WEATHER_API_KEY}
      location: "San Francisco, CA"
      units: "imperial"
    datetime:
      enabled: true
      timezone: "America/Los_Angeles"
      format: "%Y-%m-%d %H:%M"
    baywheels:
      enabled: false  # Future
    waymo:
      enabled: false  # Future
  ```
- [ ] Implement config loader with environment variable substitution
- [ ] Create `.env.example` template

#### 1.3 Vestaboard Client
- [ ] Research Vestaboard API endpoints (from docs)
- [ ] Implement `VestaboardClient` class:
  - Authentication handling
  - Message sending via Read/Write API
  - Error handling and retries
  - Support for character codes/VBML
- [ ] Add basic message formatting utilities

#### 1.4 Data Sources (Phase 1)
- [ ] **Weather Service**:
  - Integrate OpenWeatherMap API (or similar)
  - Fetch current conditions
  - Format: "Weather: 65°F, Sunny | Feels like 63°F"
  
- [ ] **DateTime Service**:
  - Current date and time
  - Format: "2025-01-15 14:30 PST"

#### 1.5 Message Formatter
- [ ] Create formatter to combine data sources
- [ ] Handle Vestaboard's 6x22 character grid limitations
- [ ] Implement multi-line message support
- [ ] Add rotation/cycling for multiple data sources

#### 1.6 Main Application Loop
- [ ] Implement scheduler using `schedule` library
- [ ] Main loop that:
  - Fetches data from enabled sources
  - Formats messages
  - Sends to Vestaboard
  - Handles errors gracefully
  - Logs activity

#### 1.7 Docker Setup
- [ ] Create `Dockerfile`:
  - Python 3.11 slim base
  - Install dependencies
  - Copy application code
  - Set up non-root user
  - Health check
- [ ] Create `.dockerignore`
- [ ] Create `docker-compose.yml` for easy deployment:
  ```yaml
  services:
    vestaboard:
      build: .
      env_file: .env
      volumes:
        - ./config:/app/config:ro
      restart: unless-stopped
  ```

### Phase 2: Testing & Refinement
- [ ] Unit tests for core components
- [ ] Integration tests with mock APIs
- [ ] Error handling improvements
- [ ] Logging enhancements
- [ ] Configuration validation

### Phase 3: Baywheels Integration
**Goal**: Display nearest e-bike station availability

#### 3.1 GBFS Integration
- [ ] Research Baywheels GBFS endpoint
- [ ] Implement GBFS client:
  - Parse `gbfs.json` for auto-discovery
  - Fetch `station_information.json`
  - Fetch `station_status.json`
- [ ] Calculate nearest station (using user's location in config)
- [ ] Format station data:
  - Station name
  - Available bikes
  - Available docks
  - Distance

#### 3.2 Message Formatting
- [ ] Add Baywheels section to message rotation
- [ ] Format: "Baywheels: Market St - 5 bikes, 3 docks (0.3 mi)"

### Phase 4: Waymo Integration
**Goal**: Display ride pricing information

#### 4.1 Waymo API Integration
- [ ] Research Waymo API structure (from GitHub repo)
- [ ] Implement Waymo client:
  - Authentication if needed
  - Fetch pricing for common routes
  - Handle rate limiting
- [ ] Format pricing data:
  - Route description
  - Price estimate
  - Wait time (if available)

#### 4.2 Message Formatting
- [ ] Add Waymo section to message rotation
- [ ] Format: "Waymo: Downtown $12-15 | 3 min wait"

### Phase 5: Advanced Features
- [ ] Message priority system (important messages override rotation)
- [ ] Custom message templates
- [ ] Webhook support for manual messages
- [ ] Metrics/monitoring endpoint
- [ ] Graceful degradation (fallback if APIs fail)

## Technical Considerations

### Vestaboard API
- **Character Grid**: 6 rows × 22 columns
- **Character Codes**: Need to map standard characters to Vestaboard codes
- **VBML**: May use VBML for richer formatting
- **Rate Limiting**: Respect API rate limits
- **Authentication**: Read/Write API key from Vestaboard settings

### Configuration Management
- **Priority Order**:
  1. Environment variables (highest priority)
  2. `config.yaml` file
  3. Default values
- **Security**: Never commit API keys to git
- **Validation**: Validate all config on startup

### Error Handling
- **API Failures**: Graceful fallback, don't crash
- **Network Issues**: Retry with exponential backoff
- **Invalid Data**: Log and skip, continue with other sources
- **Vestaboard Unavailable**: Queue messages or log error

### Scheduling Strategy
- **Different Refresh Rates**: 
  - Weather: Every 10-15 minutes
  - DateTime: Every minute (or on-demand)
  - Baywheels: Every 5 minutes
  - Waymo: Every 10 minutes
- **Message Rotation**: Cycle through data sources every 30-60 seconds
- **Smart Updates**: Only update if data has changed

### Logging
- **Levels**: DEBUG, INFO, WARNING, ERROR
- **Format**: Structured logging (JSON for Docker)
- **Output**: stdout (for Docker logs)
- **Rotation**: Let Docker handle log rotation

## Dependencies

### Required Python Packages
```
requests>=2.31.0
pyyaml>=6.0
python-dotenv>=1.0.0
schedule>=1.2.0
pytz>=2023.3          # Timezone handling
```

### External APIs
- **Weather**: OpenWeatherMap (free tier available) or WeatherAPI.com
- **Baywheels**: Public GBFS feed (no API key needed)
- **Waymo**: Unofficial API (research authentication requirements)

## Deployment

### Docker Build
```bash
docker build -t vestaboard-display .
```

### Docker Run
```bash
docker run -d \
  --name vestaboard-display \
  --env-file .env \
  -v $(pwd)/config:/app/config:ro \
  --restart unless-stopped \
  vestaboard-display
```

### Docker Compose
```bash
docker-compose up -d
```

## Next Steps

1. **Start with Phase 1**: Build MVP with weather and datetime
2. **Test locally**: Run outside Docker first to verify API connections
3. **Deploy to Docker**: Once working, containerize and deploy
4. **Iterate**: Add features incrementally (Baywheels, then Waymo)
5. **Monitor**: Watch logs and adjust refresh rates as needed

## Questions Resolved (See API_RESEARCH.md)

1. **Vestaboard API Details**: ✅
   - Endpoint: `https://rw.vestaboard.com/`
   - Header: `X-Vestaboard-Read-Write-Key`
   - Rate limit: 1 message per 15 seconds
   - Can use plain text or character array (6x22)
   - Python library `vesta` available on PyPI

2. **Weather API**: ✅
   - **Recommended**: WeatherAPI.com (1M calls/month free tier)
   - Alternative: OpenWeatherMap (1K calls/day free tier)
   - Both support current weather + forecasts

3. **Location**:
   - User location: lat/lon in config for Baywheels nearest station calculation
   - Weather: City name or lat/lon supported

4. **Message Display Strategy**:
   - Rotation recommended (cycle through data sources)
   - Each message displays for 30-60 seconds
   - Priority system for important messages (future)

## Resources

- [Vestaboard Read/Write API Docs](https://docs.vestaboard.com/docs/read-write-api/introduction)
- [GBFS Specification](https://github.com/MobilityData/gbfs/blob/master/gbfs.md)
- [Waymo API (Unofficial)](https://github.com/puravparab/waymo-api/)

