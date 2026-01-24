# Sun Art Setup Guide

The Sun Art feature displays a full-screen 6x22 bit image pattern that changes based on the sun's position throughout the day. Watch the pattern evolve from night through dawn, sunrise, morning, noon, afternoon, sunset, and dusk.

![Sun Art Display](./sun-art-display.png)

## Overview

**What it does:**
- Displays a full-screen visual pattern representing the sun's position
- Automatically updates throughout the day as the sun moves
- Shows 8 distinct stages: night, dawn, sunrise, morning, noon, afternoon, sunset, dusk
- Uses your location (latitude/longitude) for accurate sun calculations
- Provides both string and array format outputs

**Use Cases:**
- Beautiful ambient display that changes with the time of day
- Visual indicator of sun position and time
- Decorative full-screen pattern for your board
- Combine with other plugins for a complete daily display

## Prerequisites

- ✅ Coordinates (latitude, longitude) for your location
- ✅ Timezone configured in general settings (used for time calculations)
- ✅ No API keys required (calculations are done locally)

## Quick Setup

### 1. Enable Sun Art

Via Web UI (Recommended):
1. Go to **Settings** → **Integrations**
2. Find **Sun Art** section
3. Toggle **Enable Sun Art** to ON
4. Enter your **Latitude** and **Longitude**
5. Set **Refresh Interval** (default: 300 seconds / 5 minutes)
6. Click **Save**

Via Environment Variables:
```bash
# Add to .env
SUN_ART_ENABLED=true
SUN_ART_LATITUDE=37.7749
SUN_ART_LONGITUDE=-122.4194
SUN_ART_REFRESH_SECONDS=300
```

### 2. Find Your Coordinates

**Option 1: Use Location Discovery Button (Easiest)**
1. In the Sun Art settings, you'll see a location button (📍) next to the latitude/longitude fields
2. Click the button
3. Allow browser location access when prompted
4. Your coordinates will be automatically filled in

**Option 2: Google Maps**
1. Open [Google Maps](https://www.google.com/maps)
2. Right-click on your location
3. Click the coordinates at the top
4. Copy latitude and longitude

**Option 3: GPS Device**
- Use your phone's GPS or a dedicated GPS device
- Format: Decimal degrees (e.g., 37.7749, -122.4194)

**Option 4: Online Tools**
- [LatLong.net](https://www.latlong.net/)
- [GPS Coordinates](https://www.gps-coordinates.net/)

### 3. Configure Refresh Interval

The refresh interval determines how often the sun position is recalculated and the pattern is updated.

- **Default**: 300 seconds (5 minutes)
- **Minimum**: 60 seconds
- **Recommended**: 300 seconds for smooth transitions without excessive computation

Shorter intervals (60-120 seconds) provide more frequent updates but use more CPU.
Longer intervals (600+ seconds) are more efficient but may miss subtle transitions.

### 4. Verify Timezone

The plugin uses the timezone from **General Settings** for sun calculations. Make sure your timezone is correctly configured:

1. Go to **Settings** → **General**
2. Check that **Timezone** is set correctly (e.g., "America/Los_Angeles")
3. The current time display should match your local time

## Understanding Sun Stages

The pattern changes through 8 distinct stages throughout the day:

| Stage | Time | Pattern Description |
|-------|------|---------------------|
| **Night** | After dusk, before dawn | Dark pattern with black and blue tiles |
| **Dawn** | Before sunrise (twilight) | Gradual lightening from blue to orange |
| **Sunrise** | Sun rising (0° to 5°) | Brightening with sun symbol, orange/yellow |
| **Morning** | After sunrise (5° to 30°) | Full sun pattern, yellow/orange colors |
| **Noon** | Peak sun (30° to 90°) | Brightest pattern, yellow/white, centered sun |
| **Afternoon** | Before sunset (5° to 30°) | Similar to morning, slightly dimmer |
| **Sunset** | Sun setting (0° to 5°) | Dimming with sun symbol, orange/red |
| **Dusk** | After sunset (twilight) | Fading to dark, orange to blue to black |

The exact times for each stage depend on:
- Your location (latitude/longitude)
- The date (season)
- Your timezone

## Using Sun Art in Templates

### Basic Full-Screen Display

Simply use the `sun_art` variable to display the full pattern:

```
{{sun_art.sun_art}}
```

This will fill the entire 6x22 board with the current sun pattern.

### With Stage Information

Add the stage name above the pattern:

```
{{sun_art.sun_stage}}
{{sun_art.sun_art}}
```

### Time to Sunrise/Sunset

Display when the next sunrise or sunset will occur:

```
STAGE: {{sun_art.sun_stage}}
RISE: {{sun_art.time_to_sunrise}}
SET: {{sun_art.time_to_sunset}}
```

### Daytime Indicator

Show whether it's currently daytime:

```
{{sun_art.is_daytime}}
{{sun_art.sun_art}}
```

### Sun Position

Display the current sun elevation angle:

```
SUN: {{sun_art.sun_position}}°
{{sun_art.sun_art}}
```

## Troubleshooting

### Pattern Not Updating

**Issue**: Pattern stays the same even after time passes.

**Solutions**:
- Check that refresh interval is set appropriately (not too long)
- Verify the plugin is enabled
- Check that latitude/longitude are correctly configured
- Ensure timezone in general settings is correct

### Wrong Sun Position

**Issue**: Pattern doesn't match the actual sun position.

**Solutions**:
- Verify latitude/longitude coordinates are accurate
- Check timezone in general settings matches your location
- Ensure system time is correct
- Try refreshing the page or restarting the service

### Location Discovery Not Working

**Issue**: Location button doesn't populate coordinates.

**Solutions**:
- Ensure browser has location permissions enabled
- Try a different browser
- Manually enter coordinates using Google Maps or other tool
- Check browser console for error messages

### Pattern Looks Wrong

**Issue**: Pattern doesn't look right for the time of day.

**Solutions**:
- Verify coordinates are correct (check with Google Maps)
- Check timezone settings
- Ensure refresh interval allows for updates
- Check that the current time matches your local time

## Advanced Configuration

### Custom Refresh Intervals

For more frequent updates (e.g., every minute):
- Set refresh interval to 60 seconds
- Note: This increases CPU usage

For less frequent updates (e.g., every 10 minutes):
- Set refresh interval to 600 seconds
- Pattern will update less frequently but use less resources

### Multiple Locations

If you want sun art for different locations, you can:
1. Create multiple pages in FiestaBoard
2. Configure each page with different coordinates
3. Switch between pages to see different locations

Note: The plugin currently supports one location per instance. For multiple locations, use multiple plugin instances or pages.

## Examples

### Example Coordinates

Common locations for testing:

- **San Francisco, CA**: 37.7749, -122.4194
- **New York, NY**: 40.7128, -74.0060
- **London, UK**: 51.5074, -0.1278
- **Tokyo, Japan**: 35.6762, 139.6503
- **Sydney, Australia**: -33.8688, 151.2093

### Example Templates

**Simple full-screen:**
```
{{sun_art.sun_art}}
```

**With stage and time:**
```
{{sun_art.sun_stage}}
{{sun_art.time_to_sunrise}}
{{sun_art.sun_art}}
```

**Informative display:**
```
SUN ART
STAGE: {{sun_art.sun_stage}}
POS: {{sun_art.sun_position}}°
{{sun_art.sun_art}}
```

## Technical Notes

- Sun calculations use the `astral` library for accuracy
- Patterns are generated locally (no external API calls)
- Calculations account for atmospheric refraction
- Works at all latitudes (equator to poles)
- Handles edge cases (midnight sun, polar night)

## Support

For issues or questions:
- Check the [main README](../README.md) for technical details
- Review plugin logs for error messages
- Verify configuration settings
- Test with known coordinates (San Francisco example above)
