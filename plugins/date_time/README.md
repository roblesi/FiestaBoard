# Date & Time Plugin

Display current date and time on your board.

## Overview

The Date & Time plugin provides various date and time variables that update automatically based on your configured timezone.

## Template Variables

```
{{datetime.time}}           # Current time (e.g., "14:30")
{{datetime.date}}           # Current date (e.g., "2025-01-03")
{{datetime.datetime}}       # Full datetime (e.g., "2025-01-03 14:30")
{{datetime.day_of_week}}    # Day name (e.g., "Saturday")
{{datetime.day}}            # Day of month (e.g., "3")
{{datetime.month}}          # Month name (e.g., "January")
{{datetime.year}}           # Year (e.g., "2025")
{{datetime.hour}}           # Hour (e.g., "14")
{{datetime.minute}}         # Minute (e.g., "30")
{{datetime.timezone_abbr}}  # Timezone abbreviation (e.g., "PST")
```

## Example Templates

### Simple Clock

```
{center}{{datetime.time}}
```

### Full Date Display

```
{center}{{datetime.day_of_week}}
{{datetime.date}}
{{datetime.time}}
```

### Classic Format

```
{center}{{datetime.month}} {{datetime.day}}, {{datetime.year}}
{{datetime.time}} {{datetime.timezone_abbr}}
```

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| enabled | boolean | true | Enable/disable the plugin |
| timezone | string | "America/Los_Angeles" | IANA timezone name |

## Timezone Examples

- `America/Los_Angeles` - Pacific Time
- `America/New_York` - Eastern Time
- `America/Chicago` - Central Time
- `Europe/London` - UK Time
- `Asia/Tokyo` - Japan Time

## Author

FiestaBoard Team

