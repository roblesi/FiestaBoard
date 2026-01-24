# Weather Plugin

Display current weather conditions with temperature, humidity, and wind speed.

**→ [Setup Guide](./docs/SETUP.md)** - API key registration and configuration

## Overview

The Weather plugin fetches real-time weather data from WeatherAPI.com or OpenWeatherMap and makes it available as template variables for your board.

## Features

- Current temperature and "feels like" temperature
- Weather condition (Sunny, Cloudy, Rain, etc.)
- Humidity percentage
- Wind speed
- Daily high and low temperatures
- UV index with color coding
- Precipitation chance
- Sunset time
- Support for multiple locations
- Choice of weather providers

## Quick Setup

For detailed setup instructions, see the **[Setup Guide](./docs/SETUP.md)**.

## Template Variables

### Single Location (Primary)

```
{{weather.temperature}}          # Current temp in Fahrenheit (e.g., "68")
{{weather.temperature_c}}        # Current temp in Celsius (e.g., "20")
{{weather.feels_like}}           # Feels like temp in Fahrenheit
{{weather.feels_like_c}}         # Feels like temp in Celsius
{{weather.condition}}            # Condition text (e.g., "Partly Cloudy")
{{weather.humidity}}             # Humidity percentage
{{weather.wind_speed}}           # Wind speed in mph
{{weather.location}}             # Location name from API
{{weather.location_name}}        # Your custom location name
{{weather.precipitation_chance}} # Chance of rain/precipitation (0-100)
{{weather.high_temp}}           # Daily high temperature in Fahrenheit
{{weather.high_temp_c}}         # Daily high temperature in Celsius
{{weather.low_temp}}             # Daily low temperature in Fahrenheit
{{weather.low_temp_c}}           # Daily low temperature in Celsius
{{weather.uv_index}}            # UV index (0-11+, rounded to integer)
{{weather.uv_index_color}}      # UV index color tile
{{weather.temperature_color}}    # Temperature color tile
{{weather.sunset}}               # Sunset time (e.g., "8:36 PM")
```

### Multiple Locations

```
{{weather.location_count}}                  # Number of locations
{{weather.locations.0.temperature}}       # First location temp in Fahrenheit
{{weather.locations.0.temperature_c}}      # First location temp in Celsius
{{weather.locations.0.location_name}}     # First location name
{{weather.locations.0.high_temp}}          # First location high temp in Fahrenheit
{{weather.locations.0.high_temp_c}}        # First location high temp in Celsius
{{weather.locations.0.low_temp}}           # First location low temp in Fahrenheit
{{weather.locations.0.low_temp_c}}         # First location low temp in Celsius
{{weather.locations.0.uv_index}}           # First location UV index (rounded to integer)
{{weather.locations.0.precipitation_chance}} # First location rain chance (0-100)
{{weather.locations.0.sunset}}              # First location sunset time
{{weather.locations.1.temperature}}       # Second location temp in Fahrenheit
{{weather.locations.1.temperature_c}}      # Second location temp in Celsius
{{weather.locations.1.location_name}}      # Second location name
{{weather.locations.1.high_temp}}          # Second location high temp in Fahrenheit
{{weather.locations.1.high_temp_c}}        # Second location high temp in Celsius
{{weather.locations.1.low_temp}}           # Second location low temp in Fahrenheit
{{weather.locations.1.low_temp_c}}         # Second location low temp in Celsius
```

## Example Templates

### Simple Weather

```
{center}WEATHER
{{weather.temperature}}° {{weather.condition}}
Feels like: {{weather.feels_like}}°
Humidity: {{weather.humidity}}%
```

### VestaBoard-Style Display

```
NOW {{weather.temperature}} F {{weather.condition}} {{weather.precipitation_chance}}%
LIKE {{weather.feels_like}} F WIND {{weather.wind_speed}} MPH
HIGH {{weather.high_temp}} F UV {{weather.uv_index}}
LOW {{weather.low_temp}} F SET {{weather.sunset}}
```

### Multiple Locations

```
{center}WEATHER
HOME: {{weather.locations.0.temperature}}°
WORK: {{weather.locations.1.temperature}}°
```

### Weather + Time

```
{center}{{datetime.date}}
{{datetime.time}}

{{weather.temperature}}° {{weather.condition}}
```

### Temperature and UV Index Colors

Both temperature and UV index have separate color variables that provide color tiles based on their values. The base variables (`temperature` and `uv_index`) do not automatically include colors - use the `_color` variables when you want color coding.

**Temperature Color:**
```
{{weather.temperature_color}} {{weather.temperature}}°F
```
Color thresholds:
- Red: ≥90°F
- Orange: ≥75°F
- Green: ≥60°F
- Blue: ≥45°F
- Violet: <45°F

**UV Index Color:**
```
{{weather.uv_index_color}} {{weather.uv_index}}
```
Color thresholds (standard UV index scale):
- Green: UV 1-2 (Low)
- Yellow: UV 3-5 (Moderate)
- Orange: UV 6-7 (High)
- Red: UV 8-10 (Very High)
- Violet: UV 11+ (Extreme)

**Note:** The UV index is rounded to the nearest integer (e.g., 2.1 → 2, 5.9 → 6).

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| enabled | boolean | false | Enable/disable the plugin |
| provider | string | "weatherapi" | Weather data provider |
| api_key | string | - | Your API key |
| locations | array | - | List of locations to monitor |
| refresh_seconds | integer | 300 | Update interval (min: 60) |

## Location Formats

Supported location formats:
- City, State: `San Francisco, CA`
- City, Country: `London, UK`
- Zip Code: `94103`
- Coordinates: `40.7128,-74.0060`

## Troubleshooting

### No weather data

1. Verify your API key is correct
2. Check the provider matches your key
3. Try a different location format
4. Check the logs for API errors

### Rate limit errors

- Increase refresh interval to 600+ seconds
- Note: each location uses two API calls per refresh (current + forecast)

### Missing forecast data

- WeatherAPI: Forecast data is included in free tier
- OpenWeatherMap: Some forecast fields (UV index) may not be available on free tier
- If forecast API fails, current weather data will still be returned

## Author

FiestaBoard Team

## License

MIT

