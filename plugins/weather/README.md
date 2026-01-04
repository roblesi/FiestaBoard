# Weather Plugin

Display current weather conditions with temperature, humidity, and wind speed.

## Overview

The Weather plugin fetches real-time weather data from WeatherAPI.com or OpenWeatherMap and makes it available as template variables for your board.

## Features

- Current temperature and "feels like" temperature
- Weather condition (Sunny, Cloudy, Rain, etc.)
- Humidity percentage
- Wind speed
- Support for multiple locations
- Choice of weather providers

## Setup

### 1. Get an API Key

**WeatherAPI.com (Recommended)**
- Free tier: 1 million calls/month
- Sign up at [weatherapi.com](https://www.weatherapi.com/)

**OpenWeatherMap**
- Free tier: 1,000 calls/day
- Sign up at [openweathermap.org](https://openweathermap.org/)

### 2. Configure the Plugin

Via the Integrations page:
1. Go to **Integrations** → **Weather**
2. Enable the plugin
3. Select your provider
4. Enter your API key
5. Add one or more locations
6. Save

## Template Variables

### Single Location (Primary)

```
{{weather.temperature}}      # Current temp (e.g., "68")
{{weather.feels_like}}       # Feels like temp
{{weather.condition}}        # Condition text (e.g., "Partly Cloudy")
{{weather.humidity}}         # Humidity percentage
{{weather.wind_speed}}       # Wind speed in mph
{{weather.location}}         # Location name from API
{{weather.location_name}}    # Your custom location name
```

### Multiple Locations

```
{{weather.location_count}}              # Number of locations
{{weather.locations.0.temperature}}     # First location temp
{{weather.locations.0.location_name}}   # First location name
{{weather.locations.1.temperature}}     # Second location temp
{{weather.locations.1.location_name}}   # Second location name
```

## Example Templates

### Simple Weather

```
{center}WEATHER
{{weather.temperature}}° {{weather.condition}}
Feels like: {{weather.feels_like}}°
Humidity: {{weather.humidity}}%
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
- Coordinates: `37.7749,-122.4194`

## Troubleshooting

### No weather data

1. Verify your API key is correct
2. Check the provider matches your key
3. Try a different location format
4. Check the logs for API errors

### Rate limit errors

- Increase refresh interval to 600+ seconds
- Note: each location uses one API call per refresh

## Author

FiestaBoard Team

## License

MIT

