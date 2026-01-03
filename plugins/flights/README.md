# Flight Tracker Plugin

Display nearby aircraft with call signs, altitude, and speed.

## Overview

The Flight Tracker plugin uses the aviationstack API to display real-time information about aircraft flying near your location.

## Features

- Call sign display
- Altitude in feet
- Ground speed
- Squawk (transponder) codes
- Distance from location
- Up to 4 flights displayed

## Setup

### Get aviationstack API Key

1. Go to [aviationstack.com](https://aviationstack.com/)
2. Sign up for a free account
3. Get your API key from the dashboard

Note: Free tier has limited API calls. Consider upgrade for frequent updates.

## Template Variables

### Primary Flight (Closest)

```
{{flights.call_sign}}      # Flight call sign (e.g., "UAL123")
{{flights.altitude}}       # Altitude in feet
{{flights.ground_speed}}   # Ground speed
{{flights.squawk}}         # Transponder code
{{flights.distance_km}}    # Distance from your location
{{flights.formatted}}      # Pre-formatted line
{{flights.flight_count}}   # Number of nearby flights
```

### Individual Flights (Array)

```
{{flights.flights.0.call_sign}}      # First flight call sign
{{flights.flights.0.altitude}}       # First flight altitude
{{flights.flights.0.formatted}}      # First flight formatted

{{flights.flights.1.call_sign}}      # Second flight
{{flights.flights.1.formatted}}
```

## Example Templates

### Flight List

```
{center}FLIGHTS OVERHEAD
CALL     ALT  SPD SQWK
{{flights.flights.0.formatted}}
{{flights.flights.1.formatted}}
{{flights.flights.2.formatted}}
{{flights.flights.3.formatted}}
```

### Simple View

```
{center}NEARBY AIRCRAFT
{{flights.flight_count}} flights within {{flights.radius_km}}km
Closest: {{flights.call_sign}}
ALT: {{flights.altitude}}ft
```

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| enabled | boolean | false | Enable/disable the plugin |
| api_key | string | - | aviationstack API key |
| latitude | number | 37.7749 | Your location latitude |
| longitude | number | -122.4194 | Your location longitude |
| radius_km | number | 50 | Search radius in km |
| max_count | integer | 4 | Max flights to show (1-4) |
| refresh_seconds | integer | 60 | Update interval |

## Data Fields

- **call_sign**: ICAO or IATA flight identifier
- **altitude**: Altitude in feet above sea level
- **ground_speed**: Speed over ground in km/h
- **squawk**: 4-digit transponder code
- **distance_km**: Distance from your configured location

## Notes

- Free aviationstack tier has limited API calls
- Live position data may not always be available
- Flights without position data are excluded from nearby calculation

## Author

FiestaBoard Team

