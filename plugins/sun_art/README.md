# Sun Art Plugin

Display a full-screen 6x22 bit image pattern that changes based on the sun's position throughout the day. The pattern evolves through different stages: night, dawn, sunrise, morning, noon, afternoon, sunset, and dusk.

![Sun Art Display](./docs/sun-art-display.png)

## Overview

The Sun Art plugin generates visual patterns representing the sun's position using latitude/longitude coordinates. It calculates accurate sun positions using the `astral` library and creates distinct patterns for each stage of the day.

## Features

- **Full-screen patterns**: 6x22 grid of color tiles and characters
- **Real-time sun tracking**: Calculates sun position based on your location
- **8 distinct stages**: Night, dawn, sunrise, morning, noon, afternoon, sunset, dusk
- **Dual format output**: String format (with color markers) and array format (nested arrays)
- **Location-based**: Uses latitude/longitude for accurate calculations
- **Timezone aware**: Uses general timezone settings for proper time calculations

## How It Works

### Sun Position Calculation

The plugin uses the `astral` library to calculate:
- **Sun elevation**: Angle of the sun above/below the horizon (-90° to 90°)
- **Sun azimuth**: Direction of the sun (0° to 360°)
- **Sunrise/sunset times**: Accurate times for your location and date

### Sun Stage Determination

Stages are determined by sun elevation and direction:

| Stage | Elevation Range | Description |
|-------|----------------|-------------|
| **Night** | < -6° | Sun below horizon, no twilight |
| **Dawn** | -6° to 0° | Civil dawn (rising, below horizon) |
| **Sunrise** | 0° to 5° | Sun rising above horizon |
| **Morning** | 5° to 30° | Morning sun (rising) |
| **Noon** | 30° to 90° | High sun (peak elevation) |
| **Afternoon** | 5° to 30° | Afternoon sun (setting) |
| **Sunset** | 0° to 5° | Sun setting below horizon |
| **Dusk** | -6° to 0° | Civil dusk (setting, below horizon) |

### Pattern Generation

Each stage has a unique visual pattern:

- **Night**: Dark pattern with black and blue tiles
- **Dawn**: Gradual lightening from blue to orange (vertical gradient)
- **Sunrise**: Brightening with sun symbol (O) in center, orange/yellow gradient
- **Morning**: Full sun pattern with yellow/orange colors
- **Noon**: Brightest pattern with yellow/white colors, centered sun
- **Afternoon**: Similar to morning, slightly dimmer
- **Sunset**: Dimming with sun symbol, orange/red colors
- **Dusk**: Fading to dark, orange to blue to black gradient

Patterns use color tiles (codes 63-71) and the 'O' character (code 15) for the sun symbol.

## Template Variables

### Simple Variables

```
{{sun_art.sun_art}}              # Full-screen pattern as string (newline-separated with color markers)
{{sun_art.sun_stage}}            # Current sun stage name (night, dawn, sunrise, etc.)
{{sun_art.sun_position}}         # Sun elevation angle in degrees (e.g., "45.2")
{{sun_art.is_daytime}}            # Boolean: true if sun is above horizon
{{sun_art.time_to_sunrise}}      # Time until next sunrise (HH:MM format, e.g., "06:30")
{{sun_art.time_to_sunset}}       # Time until next sunset (HH:MM format, e.g., "12:15")
```

### Array Format

The `sun_art_array` variable is available as a nested array (6 rows x 22 columns) of character codes (0-71). This is useful for programmatic access or custom rendering.

## Configuration

### Required Settings

- **Latitude** (-90 to 90): Your location's latitude
- **Longitude** (-180 to 180): Your location's longitude

### Optional Settings

- **Refresh Interval** (seconds, default: 300): How often to recalculate sun position and update pattern
  - Minimum: 60 seconds
  - Recommended: 300 seconds (5 minutes) for smooth transitions

### Location Discovery

The plugin supports one-click location discovery via the browser's geolocation API. When configuring latitude/longitude in the web UI, a location button automatically appears that uses your browser's location to populate the coordinates.

## Technical Details

### Sun Calculation

The plugin uses the `astral` library (v3.2+) which provides:
- Accurate sun position calculations based on:
  - Date and time
  - Latitude/longitude coordinates
  - Timezone (from general settings)
- Accounts for atmospheric refraction (sun appears above horizon before actual sunrise)
- Handles edge cases (polar regions, equator, date boundaries)

### Pattern Format

**String Format:**
- Newline-separated lines (6 lines total)
- Color markers: `{red}`, `{orange}`, `{yellow}`, `{blue}`, `{black}`, `{white}`
- Character codes: Regular characters (A-Z, 0-9, punctuation)
- Example: `"{yellow}{yellow}O{yellow}{yellow}\n{orange}{orange}{orange}..."`

**Array Format:**
- Nested list: `[[code, code, ...], [code, code, ...], ...]`
- 6 rows, 22 columns
- Character codes: 0-71 (see `src/board_chars.py`)

### Caching

Sun calculations are cached per day to reduce computation:
- Cache invalidated at midnight (new day)
- Cache also respects refresh interval (won't recalculate if within refresh window)
- Cache includes calculated timestamp for age checking

### Performance

- Pattern generation is fast (no external API calls)
- Sun calculations are lightweight (local computation)
- Recommended refresh interval: 5 minutes (balances accuracy and performance)

## Example Usage

### Basic Display

Use the `sun_art` variable directly in a template:

```
{{sun_art.sun_art}}
```

This will display the full 6x22 pattern on the board.

### With Stage Information

```
{{sun_art.sun_stage}}
{{sun_art.sun_art}}
```

Shows the current stage name followed by the pattern.

### Time to Events

```
SUN: {{sun_art.sun_stage}}
RISE: {{sun_art.time_to_sunrise}}
SET: {{sun_art.time_to_sunset}}
```

## Dependencies

- `astral>=3.2`: Sun position calculations
- `pytz`: Timezone handling (already in project)

## API Reference

### `SunArtPlugin` Class

Main plugin class that extends `PluginBase`.

**Methods:**

- `fetch_data()`: Main data fetching method
  - Returns: `PluginResult` with sun art data
  - Calculates sun position, determines stage, generates pattern

- `_calculate_sun_position(lat, lon, dt, tz)`: Calculate sun elevation and azimuth
  - Returns: Dictionary with elevation, azimuth, is_rising, sunrise, sunset, noon

- `_determine_sun_stage(elevation, is_rising)`: Classify current sun stage
  - Returns: Stage name string

- `_generate_pattern(stage, elevation)`: Create 6x22 grid pattern
  - Returns: Nested list of character codes (6x22)

- `_pattern_to_string(pattern)`: Convert array to string format
  - Returns: Newline-separated string with color markers

- `_calculate_next_events(lat, lon, now, tz)`: Calculate time to next sunrise/sunset
  - Returns: Tuple of (time_to_sunrise, time_to_sunset) as "HH:MM" strings

## Testing

The plugin includes comprehensive tests with >80% coverage:

- Configuration validation
- Sun position calculations
- Stage determination (all 8 stages)
- Pattern generation (verify 6x22 dimensions)
- String and array format outputs
- Error handling
- Edge cases (polar regions, equator, date boundaries)

Run tests:
```bash
python scripts/run_plugin_tests.py --plugin=sun_art
```

## Contributing

When modifying this plugin:
- Maintain >80% test coverage
- Update documentation if adding new stages or variables
- Test with various locations (equator, poles, different timezones)
- Verify pattern generation produces valid 6x22 grids
