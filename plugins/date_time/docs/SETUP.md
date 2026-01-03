# Date/Time Plugin Setup Guide

The Date/Time plugin displays the current date and time on your board. This is one of the simplest plugins - no API key required!

## Overview

**What it does:**
- Displays current time (12 or 24-hour format)
- Shows current date
- Day of the week
- Timezone-aware

**Prerequisites:**
- ✅ None - works out of the box!

## Quick Setup

### 1. Enable the Plugin

In the FiestaBoard web UI:
1. Go to **Integrations**
2. Find **Date/Time** and toggle it **On**

That's it! The plugin is ready to use.

### 2. Configure Timezone (Optional)

The default timezone is `America/Los_Angeles`. To change it:

**Via Web UI:**
1. Go to **Settings**
2. Find **Timezone** setting
3. Enter your timezone (e.g., `America/New_York`, `Europe/London`)

**Via Environment Variable:**
```bash
TIMEZONE=America/New_York
```

### 3. Use in Templates

Available variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{datetime.time}` | Current time | `2:45 PM` |
| `{datetime.date}` | Current date | `Jan 03` |
| `{datetime.day_of_week}` | Day name | `Friday` |
| `{datetime.year}` | Current year | `2026` |
| `{datetime.hour}` | Hour (24h) | `14` |
| `{datetime.minute}` | Minute | `45` |
| `{datetime.ampm}` | AM/PM indicator | `PM` |

**Example Template:**
```
{center}TODAY IS
{datetime.day_of_week}
{datetime.date}, {datetime.year}

{center}{datetime.time}
```

## Timezone Reference

Common timezone values:
- `America/Los_Angeles` - Pacific Time
- `America/Denver` - Mountain Time
- `America/Chicago` - Central Time
- `America/New_York` - Eastern Time
- `Europe/London` - UK Time
- `Europe/Paris` - Central European Time
- `Asia/Tokyo` - Japan Time
- `Australia/Sydney` - Australian Eastern Time

For a complete list, see [IANA Time Zone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

## Troubleshooting

**Issue: Wrong time displayed**
- Check your timezone setting is correct
- Ensure the timezone string is valid (case-sensitive)

**Issue: Time not updating**
- Verify the plugin is enabled in Integrations
- Check that your page template includes datetime variables

