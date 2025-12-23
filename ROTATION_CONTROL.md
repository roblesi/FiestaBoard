# Rotation Control Guide

This guide explains how to control the rotation between different screens on your Vestaboard.

## Overview

The Vestaboard can display multiple types of information:
- **Weather + DateTime** - Current weather and time
- **Home Assistant** - House status (doors, garage, etc.)
- **Apple Music** - Currently playing track (when music is playing)
- **Guest WiFi** - WiFi credentials (when enabled, overrides everything)

## Priority System

The display follows this priority order:

1. **Guest WiFi** (highest) - When enabled, overrides all other displays
2. **Apple Music** - When music is playing, takes priority
3. **Rotation** - Weather and Home Assistant rotate based on configuration
4. **Weather + DateTime** - Default when nothing else is active

## Rotation Configuration

### Basic Settings

Add these to your `.env` file:

```bash
# Enable/disable rotation
ROTATION_ENABLED=true

# How long each screen displays (in seconds)
ROTATION_WEATHER_DURATION=300      # 5 minutes
ROTATION_HOME_ASSISTANT_DURATION=300  # 5 minutes

# Which screens to include in rotation (comma-separated)
ROTATION_ORDER=weather,home_assistant
```

### Configuration Options

#### `ROTATION_ENABLED`

- `true` - Enable rotation between screens
- `false` - Disable rotation, always show Weather + DateTime

**Example:**
```bash
ROTATION_ENABLED=true
```

#### `ROTATION_WEATHER_DURATION`

How long the Weather + DateTime screen displays before rotating (in seconds).

**Examples:**
```bash
ROTATION_WEATHER_DURATION=300   # 5 minutes
ROTATION_WEATHER_DURATION=600   # 10 minutes
ROTATION_WEATHER_DURATION=60    # 1 minute
```

#### `ROTATION_HOME_ASSISTANT_DURATION`

How long the Home Assistant screen displays before rotating (in seconds).

**Examples:**
```bash
ROTATION_HOME_ASSISTANT_DURATION=300   # 5 minutes
ROTATION_HOME_ASSISTANT_DURATION=180   # 3 minutes
ROTATION_HOME_ASSISTANT_DURATION=60    # 1 minute
```

#### `ROTATION_ORDER`

Comma-separated list of screens to include in rotation.

**Available screens:**
- `weather` - Weather + DateTime
- `home_assistant` - House status from Home Assistant

**Examples:**
```bash
# Rotate between weather and home assistant
ROTATION_ORDER=weather,home_assistant

# Only show weather (no rotation)
ROTATION_ORDER=weather

# Only show home assistant
ROTATION_ORDER=home_assistant

# Weather first, then home assistant
ROTATION_ORDER=weather,home_assistant
```

## Common Scenarios

### Scenario 1: Equal Time Rotation

Show Weather and Home Assistant for equal amounts of time:

```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=300
ROTATION_HOME_ASSISTANT_DURATION=300
ROTATION_ORDER=weather,home_assistant
```

**Result:** Weather shows for 5 minutes, then Home Assistant for 5 minutes, then repeats.

### Scenario 2: Weather-Focused

Show Weather most of the time, Home Assistant occasionally:

```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=600    # 10 minutes
ROTATION_HOME_ASSISTANT_DURATION=120  # 2 minutes
ROTATION_ORDER=weather,home_assistant
```

**Result:** Weather shows for 10 minutes, then Home Assistant for 2 minutes, then repeats.

### Scenario 3: Home Assistant-Focused

Show Home Assistant most of the time:

```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=180    # 3 minutes
ROTATION_HOME_ASSISTANT_DURATION=600  # 10 minutes
ROTATION_ORDER=weather,home_assistant
```

**Result:** Weather shows for 3 minutes, then Home Assistant for 10 minutes, then repeats.

### Scenario 4: No Rotation (Weather Only)

Always show Weather + DateTime:

```bash
ROTATION_ENABLED=false
# Or
ROTATION_ORDER=weather
```

**Result:** Always displays Weather + DateTime (unless Apple Music is playing or Guest WiFi is enabled).

### Scenario 5: Home Assistant Only

Always show Home Assistant:

```bash
ROTATION_ENABLED=true
ROTATION_ORDER=home_assistant
```

**Result:** Always displays Home Assistant (unless Apple Music is playing or Guest WiFi is enabled).

## How Rotation Works

### Time-Based Rotation

When rotation is enabled, the system uses **time-based rotation**:

1. Each screen displays for its configured duration
2. After the duration expires, it switches to the next screen
3. The cycle repeats continuously

**Example Timeline:**
```
0:00 - 5:00  → Weather + DateTime
5:00 - 10:00 → Home Assistant
10:00 - 15:00 → Weather + DateTime
15:00 - 20:00 → Home Assistant
... (repeats)
```

### Refresh vs Rotation

**Important distinction:**
- **Refresh interval** (`REFRESH_INTERVAL_SECONDS`): How often data is fetched from APIs
- **Rotation duration**: How long each screen displays before switching

These are independent:
- Data can refresh every 5 minutes
- But screens can rotate every 2 minutes
- The rotation just shows the most recently fetched data

## Apple Music Interruption

When Apple Music is playing, it **temporarily interrupts** the rotation:

1. Music starts playing → Shows Apple Music
2. Music stops → Returns to rotation where it left off

The rotation timer continues running, so when music stops, it may immediately switch screens if the duration has elapsed.

## Guest WiFi Override

When Guest WiFi is enabled, it **completely overrides** rotation:

1. Guest WiFi enabled → Shows WiFi credentials
2. Guest WiFi disabled → Returns to rotation

Rotation resumes from where it was when Guest WiFi was disabled.

## Troubleshooting

### Rotation Not Working

1. **Check rotation is enabled:**
   ```bash
   grep ROTATION_ENABLED .env
   # Should show: ROTATION_ENABLED=true
   ```

2. **Check rotation order:**
   ```bash
   grep ROTATION_ORDER .env
   # Should include the screens you want
   ```

3. **Check logs:**
   ```bash
   docker-compose logs | grep -i "rotation\|display updated"
   ```

### Screen Not Appearing

1. **Verify screen is in rotation order:**
   ```bash
   # For Home Assistant
   grep ROTATION_ORDER .env | grep home_assistant
   
   # For Weather
   grep ROTATION_ORDER .env | grep weather
   ```

2. **Check if screen is enabled:**
   - Home Assistant: `HOME_ASSISTANT_ENABLED=true`
   - Weather: Always enabled (required)

3. **Check data availability:**
   - Home Assistant: Must have entities configured and accessible
   - Weather: Must have valid API key

### Rotation Too Fast/Slow

Adjust the duration settings:

```bash
# Faster rotation (1 minute each)
ROTATION_WEATHER_DURATION=60
ROTATION_HOME_ASSISTANT_DURATION=60

# Slower rotation (10 minutes each)
ROTATION_WEATHER_DURATION=600
ROTATION_HOME_ASSISTANT_DURATION=600
```

## Advanced Configuration

### Custom Rotation Patterns

You can create custom patterns by adjusting durations:

**Quick Check Pattern** (Home Assistant every minute, Weather for 5 minutes):
```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=300
ROTATION_HOME_ASSISTANT_DURATION=60
ROTATION_ORDER=weather,home_assistant
```

**Even Split Pattern** (Equal time):
```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=300
ROTATION_HOME_ASSISTANT_DURATION=300
ROTATION_ORDER=weather,home_assistant
```

## Example Configurations

### Balanced Setup (Recommended)
```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=300
ROTATION_HOME_ASSISTANT_DURATION=300
ROTATION_ORDER=weather,home_assistant
```

### Weather-Focused Setup
```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=600
ROTATION_HOME_ASSISTANT_DURATION=180
ROTATION_ORDER=weather,home_assistant
```

### Security-Focused Setup (Home Assistant Priority)
```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=180
ROTATION_HOME_ASSISTANT_DURATION=600
ROTATION_ORDER=weather,home_assistant
```

### No Rotation (Simple)
```bash
ROTATION_ENABLED=false
```

## Restart After Changes

After changing rotation settings, restart the service:

```bash
docker-compose restart
docker-compose logs -f
```

Watch the logs to see rotation behavior:
- Look for "Display updated with House Status"
- Look for "Display updated successfully" (Weather)

## Summary

- **Enable/disable rotation**: `ROTATION_ENABLED`
- **Control duration**: `ROTATION_WEATHER_DURATION` and `ROTATION_HOME_ASSISTANT_DURATION`
- **Choose screens**: `ROTATION_ORDER`
- **Restart after changes**: `docker-compose restart`

The rotation system gives you full control over what displays and for how long!

