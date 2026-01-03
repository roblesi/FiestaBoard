# FiestaBoard Features Overview

This document provides a comprehensive overview of all FiestaBoard features. For detailed setup instructions, see the individual feature guides.

## Table of Contents

- [Core Features](#core-features)
  - [Weather](#weather)
  - [Date/Time](#datetime)
  - [Home Assistant](#home-assistant)
  - [Star Trek Quotes](#star-trek-quotes)
  - [Guest WiFi](#guest-wifi)
- [Transit & Transportation](#transit--transportation)
  - [Bay Wheels](#bay-wheels)
  - [Muni Transit](#muni-transit)
  - [Traffic](#traffic)
- [Information & Monitoring](#information--monitoring)
  - [Stocks](#stocks)
  - [Surf Conditions](#surf-conditions)
  - [Air Quality & Fog](#air-quality--fog)
  - [Flight Tracking](#flight-tracking)
- [System Features](#system-features)
  - [Page-Based Display](#page-based-display)
  - [Silence Schedule](#silence-schedule)
  - [Configurable Update Interval](#configurable-update-interval)

---

## Core Features

### Weather

Display current weather conditions with temperature and text-based icons.

**What it does:**
- Current temperature
- Weather condition (Sunny, Cloudy, Rainy, etc.)
- Text-based weather icons for visual representation
- Location-based weather data

**Example Display:**
```
     SAN FRANCISCO
     PARTLY CLOUDY
        65°F
```

**Setup:** Configure `WEATHER_API_KEY` and `WEATHER_LOCATION` in settings.

**API:** WeatherAPI.com or OpenWeatherMap

---

### Date/Time

Display current date and time with timezone support.

**What it does:**
- Current date (multiple formats)
- Current time (12/24-hour formats)
- Day of week
- Timezone-aware

**Example Display:**
```
   FRIDAY, JAN 3
      2:45 PM
```

**Setup:** Configure `TIMEZONE` in settings (default: America/Los_Angeles).

**Template Variables:**
- `{{datetime.date}}`
- `{{datetime.time}}`
- `{{datetime.day_of_week}}`

---

### Home Assistant

Show real-time status of doors, garage, locks, and other Home Assistant entities.

**What it does:**
- Monitor door/window sensors
- Track garage door status
- Check lock states
- Display any Home Assistant entity

**Example Display:**
```
   HOUSE STATUS
Front Door [G] Locked
Garage [R] Open
Windows [G] Closed
```

**Status Indicators:**
- `[G]` = Good (green)
- `[R]` = Attention needed (red)

**Setup:** [HOME_ASSISTANT_SETUP.md](./features/HOME_ASSISTANT_SETUP.md)

**Requirements:** Home Assistant server with access token

---

### Star Trek Quotes

Display inspiring quotes from Star Trek TNG, Voyager, and DS9.

**What it does:**
- 102 curated quotes from three series
- Configurable ratio between series (default: 3:5:9 = TNG:Voyager:DS9)
- Random selection weighted by ratio
- Formatted for Vestaboard display

**Example Display:**
```
  "Make it so."
  - Jean-Luc Picard
```

**Setup:** [STAR_TREK_QUOTES_SETUP.md](./features/STAR_TREK_QUOTES_SETUP.md)

**Requirements:** None - no API key needed

---

### Guest WiFi

Display WiFi credentials for guests with easy toggle on/off.

**What it does:**
- Show WiFi network name (SSID)
- Display password
- Easy to toggle on/off
- Simple, clear formatting

**Example Display:**
```
   GUEST WIFI
Network: MyGuestNet
Password: SecurePass123
```

**Setup:** [GUEST_WIFI_SETUP.md](./features/GUEST_WIFI_SETUP.md)

**Requirements:** None - just configure SSID and password

---

## Transit & Transportation

### Bay Wheels

Track bike availability at multiple Bay Wheels stations with visual station finder.

**What it does:**
- Real-time bike availability (electric and classic)
- Track up to 4 stations simultaneously
- Dock availability for bike returns
- Visual station finder (search by address or location)
- Aggregate stats across all stations

**Example Display:**
```
   BAY WHEELS
19th St BART
E-Bikes: 3  Classic: 2
Docks: 8

Market & 9th
E-Bikes: 1  Classic: 5
Docks: 4
```

**Template Access:**
- `{{baywheels.stations.0.electric_bikes}}`
- `{{baywheels.stations.0.classic_bikes}}`
- `{{baywheels.total_electric}}`

**Setup:** [BAYWHEELS_SETUP.md](./features/BAYWHEELS_SETUP.md)

**Requirements:** None - uses public GBFS feed

---

### Muni Transit

Real-time SF Muni arrival predictions with intelligent stop finder.

**What it does:**
- Real-time arrival predictions
- Track up to 4 stops simultaneously
- Line filtering (show only specific lines)
- Visual stop finder (search by address or location)
- Regional transit caching (reduces API calls)

**Example Display:**
```
  MUNI ARRIVALS
N-Judah Church St
N: 3m, 12m, 25m

22-Fillmore
22: 5m, 15m
```

**Template Access:**
- `{{muni.stops.0.formatted}}`
- `{{muni.stops.0.next_arrival}}`
- `{{muni.stops.0.line}}`

**Setup:** [MUNI_SETUP.md](./features/MUNI_SETUP.md)

**Requirements:** Free 511.org API key

**Cache System:**
- Fetches ALL Bay Area transit data in one API call
- 90-second refresh (configurable)
- Reduces API calls from 100+/hour to ~40/hour
- Stays within free tier (60 requests/hour)

---

### Traffic

Monitor travel times to multiple destinations with live traffic conditions.

**What it does:**
- Real-time travel times with traffic
- Track up to 4 routes simultaneously
- Multiple travel modes (drive, bike, transit, walk)
- Route validation before saving
- Color coding based on traffic (green/yellow/red)

**Example Display:**
```
 COMMUTE OPTIONS
WORK (Drive): 18m
WORK (Bike): 25m
WORK (Muni): 32m
AIRPORT: 45m
```

**Template Access:**
- `{{traffic.routes.0.duration_minutes}}`
- `{{traffic.routes.0.formatted}}`
- `{{traffic.routes.0.status}}`

**Setup:** [TRAFFIC_SETUP.md](./features/TRAFFIC_SETUP.md)

**Requirements:** Google Routes API key (has free tier with $200/month credit)

---

## Information & Monitoring

### Stocks

Monitor stock prices and percentage changes with automatic color coding.

**What it does:**
- Track up to 5 stock symbols
- Real-time prices and percentage changes
- Color-coded indicators (green=up, red=down)
- Configurable time windows (1 Day, 1 Month, 1 Year, etc.)
- Column-aligned formatting
- Symbol search with autocomplete

**Example Display:**
```
  STOCK PRICES
GOOG  $150.25  +1.18%
AAPL  $185.30  +0.52%
MSFT  $378.90  -0.35%
TSLA  $242.15  +2.87%
NVDA  $495.20  +1.95%
```

**Template Access:**
- `{{stocks.stocks.0.formatted}}`
- `{{stocks.stocks.0.symbol}}`
- `{{stocks.stocks.0.current_price}}`
- `{{stocks.stocks.0.change_percent}}`

**Setup:** [STOCKS_SETUP.md](./features/STOCKS_SETUP.md)

**Requirements:**
- None for basic functionality (uses Yahoo Finance)
- Optional: Finnhub API key for enhanced symbol search

![Stocks Display](../images/stocks-display.png)

---

### Surf Conditions

Live surf reports with wave height, swell period, wind conditions, and quality ratings.

**What it does:**
- Real-time wave height (feet) and swell period (seconds)
- Wind speed and direction (cardinal directions)
- Automatic quality rating (EXCELLENT, GOOD, FAIR, POOR)
- Location configurable (default: Ocean Beach, SF)
- Quality assessment based on swell period and wind

**Example Display:**
```
   SURF REPORT
OB SURF: 4.5ft @ 12s
Quality: EXCELLENT
Wind: 8mph W
```

**Quality Ratings:**
- 🟢 **EXCELLENT**: Long period (>12s) + light winds (<12mph)
- 🟡 **GOOD**: Decent period (>10s) + moderate winds (<15mph)
- 🟠 **FAIR**: Reasonable conditions (>8s or <20mph)
- 🔴 **POOR**: Short period + strong winds

**Template Access:**
- `{{surf.formatted_message}}`
- `{{surf.wave_height}}`
- `{{surf.swell_period}}`
- `{{surf.quality}}`
- `{{surf.wind_speed}}`
- `{{surf.wind_direction_cardinal}}`

**Setup:** [SURF_SETUP.md](./features/SURF_SETUP.md)

**Requirements:** None - uses free Open-Meteo Marine API

---

### Air Quality & Fog

Monitor air quality (AQI) and fog conditions with intelligent alerts.

**What it does:**
- Real-time Air Quality Index (AQI) from PM2.5
- Fog detection based on visibility and humidity
- Wildfire smoke alerts (AQI >100)
- SF fog monitoring ("Karl the Fog")
- Combined alerts for fog + air quality

**Example Display:**
```
   AIR & FOG
FOG: HEAVY | AIR: GOOD
AQI:42 VIS:0.3mi HUM:95%
Dew Point: 52°F
```

**AQI Categories:**
- 🟢 GOOD (0-50)
- 🟡 MODERATE (51-100)
- 🟠 UNHEALTHY FOR SENSITIVE (101-150)
- 🔴 UNHEALTHY (151-200)
- 🟣 VERY UNHEALTHY (201-300)
- 🟤 HAZARDOUS (301+)

**Fog Detection:**
- Heavy fog: Visibility <1600m
- Light fog: High humidity (>95%) + cool temps (<60°F)

**Template Access:**
- `{{air_fog.alert_message}}`
- `{{air_fog.pm2_5_aqi}}`
- `{{air_fog.air_status}}`
- `{{air_fog.fog_status}}`
- `{{air_fog.visibility_m}}`
- `{{air_fog.formatted_message}}`

**Setup:** [AIR_FOG_SETUP.md](./features/AIR_FOG_SETUP.md)

**Requirements:** PurpleAir API key OR OpenWeatherMap API key (at least one required)

**Use Cases:**
- SF fog monitoring
- Wildfire season smoke alerts
- Commute planning
- Health alerts for sensitive individuals

---

### Flight Tracking

Display nearby aircraft with call signs, altitude, ground speed, and squawk codes.

**What it does:**
- Track aircraft within configurable radius
- Display up to 4 flights simultaneously
- Show call sign, altitude, ground speed
- Squawk codes for special flights
- Location-based monitoring

**Example Display:**
```
 NEARBY AIRCRAFT
UAL123  32000ft  450kts
SWA456  18000ft  380kts
N12345   5000ft  120kts
```

**Template Access:**
- `{{flights.flights.0.callsign}}`
- `{{flights.flights.0.altitude_ft}}`
- `{{flights.flights.0.ground_speed_kts}}`
- `{{flights.flights.0.formatted}}`

**Setup:** [FLIGHTS_SETUP.md](./features/FLIGHTS_SETUP.md)

**Requirements:** aviationstack API key

**Important:** Free tier has only 100 requests/month. Use high refresh interval (8+ hours recommended).

---

## System Features

### Page-Based Display

Create and manage multiple pages to display different information.

**What it does:**
- Create unlimited pages via web UI
- Page types: Template, Static Message
- Switch between pages easily
- Preview pages before activating
- Template system with variables
- Smart preview caching (5 min TTL)

**Features:**
- Drag-and-drop page reordering
- Duplicate pages
- Edit pages
- Delete pages
- Set active page
- Real-time preview

**Template Engine:**
- Jinja2-based templates
- Access all feature variables
- Formatting helpers (center, truncate, pad)
- Conditional logic
- Color codes

**Example Page Template:**
```
{center}MORNING BRIEF
Weather: {{weather.temperature}}° {{weather.condition}}
Muni: {{muni.stops.0.formatted}}
Stocks: {{stocks.stocks.0.formatted}}
```

---

### Silence Schedule

Configure quiet hours when the Vestaboard won't update.

**What it does:**
- Set custom start and end times (24-hour format)
- Times are timezone-aware
- Supports windows spanning midnight (e.g., 8pm-7am)
- Configure via web UI or environment variables
- Perfect for overnight quiet hours

**Example Configuration:**
- Start: 20:00 (8pm)
- End: 07:00 (7am)
- Result: No updates between 8pm and 7am

**Use Cases:**
- Overnight quiet hours
- Meeting/focus time blocks
- Sleep schedule respect
- Reduce nighttime board activity

**Configuration:**
- Web UI: Settings → Silence Schedule
- Environment: `SILENCE_SCHEDULE_ENABLED=true`, `SILENCE_SCHEDULE_START_TIME=20:00`, `SILENCE_SCHEDULE_END_TIME=07:00`

---

### Configurable Update Interval

Adjust how often the board checks for new content.

**What it does:**
- Configure refresh interval (10-3600 seconds)
- Default: 60 seconds (1 minute)
- Adjust based on your needs
- Balance freshness vs. API usage
- Configure via web UI Settings

**Use Cases:**
- **10-30 seconds**: Time-sensitive displays (transit, traffic)
- **60 seconds**: Default, good balance
- **300+ seconds**: Static content, reduce API calls

**Configuration:**
- Web UI: Settings → General Settings → Board Update Interval
- Environment: `REFRESH_INTERVAL_SECONDS=60`

**Note:** Requires service restart to take effect.

---

## Template System

FiestaBoard uses a powerful Jinja2-based template engine that allows you to create custom displays.

### Accessing Variables

All feature variables are available in templates:

```
{{feature.variable}}
```

### Formatting Helpers

**Center text:**
```
{center}CENTERED TEXT
```

**Truncate long strings:**
```
{{baywheels.stations.0.name|truncate:22}}
```

**Pad for alignment:**
```
{{stocks.stocks.0.symbol|pad:6}}
```

### Color Codes

Use color codes in templates:
```
{red}RED TEXT
{green}GREEN TEXT
{blue}BLUE TEXT
{yellow}YELLOW TEXT
{orange}ORANGE TEXT
{white}WHITE TEXT
{violet}VIOLET TEXT
```

### Combining Features

Create comprehensive displays by combining multiple features:

```
{center}MORNING DASHBOARD
{{datetime.time}}
Weather: {{weather.temperature}}° {{weather.condition}}

COMMUTE
Muni: {{muni.stops.0.formatted}}
Traffic: {{traffic.routes.0.duration_minutes}}m
Bikes: {{baywheels.stations.0.electric_bikes}}E

MARKETS
{{stocks.stocks.0.formatted}}
{{stocks.stocks.1.formatted}}
```

---

## Example Use Cases

### Morning Commute Dashboard

Combine multiple transit/traffic features:
```
{center}MORNING COMMUTE
{{datetime.time}}

Muni: {{muni.stops.0.formatted}}
Bikes: {{baywheels.stations.0.electric_bikes}}E
Traffic: {{traffic.routes.0.duration_minutes}}m

Weather: {{weather.temperature}}° {{weather.condition}}
```

### Investment Portfolio

Track stocks with market context:
```
{center}PORTFOLIO
{{stocks.stocks.0.formatted}}
{{stocks.stocks.1.formatted}}
{{stocks.stocks.2.formatted}}
{{stocks.stocks.3.formatted}}
{{stocks.stocks.4.formatted}}
```

### Surfer's Dashboard

Conditions check before heading out:
```
{center}SURF CHECK
{{surf.formatted_message}}
Quality: {{surf.quality}}
Wind: {{surf.wind_speed}}mph {{surf.wind_direction_cardinal}}

Air Quality: {{air_fog.air_status}}
Weather: {{weather.temperature}}° {{weather.condition}}
```

### Smart Home Status

Monitor house with transit info:
```
{center}HOME STATUS
{{datetime.time}}

{{home_assistant.front_door.status}}
{{home_assistant.garage.status}}
{{home_assistant.windows.status}}

Next Muni: {{muni.stops.0.next_arrival}}m
```

---

## Feature Comparison Table

| Feature | API Key Required | Free Tier | Setup Difficulty | Update Frequency |
|---------|-----------------|-----------|------------------|------------------|
| Weather | Yes | ✅ Generous | Easy | 5-10 min |
| Date/Time | No | N/A | Very Easy | Real-time |
| Home Assistant | Yes (Token) | N/A | Medium | 1-5 min |
| Star Trek Quotes | No | N/A | Very Easy | Static |
| Guest WiFi | No | N/A | Very Easy | Static |
| Bay Wheels | No | ✅ Unlimited | Easy | 1 min |
| Muni Transit | Yes | ✅ 60 req/hour | Easy | 1 min |
| Traffic | Yes | ✅ $200/month | Medium | 5 min |
| Stocks | No | ✅ Generous | Easy | 5 min |
| Surf Conditions | No | ✅ Unlimited | Easy | 10 min |
| Air Quality/Fog | Yes | ✅ Varies | Medium | 10 min |
| Flight Tracking | Yes | ⚠️ 100 req/month | Easy | 8+ hours |

---

## Getting Started

1. **Choose your features**: Start with weather and date/time
2. **Get API keys**: Sign up for services you want to use
3. **Configure in Web UI**: Go to Settings → Features
4. **Create a page**: Use Templates with feature variables
5. **Set as active**: Start displaying on your Vestaboard!

**Detailed guides:** See individual feature setup documents in `docs/features/`

---

Made with ❤️ in San Francisco

