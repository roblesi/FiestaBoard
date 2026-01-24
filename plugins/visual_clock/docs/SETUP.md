# Visual Clock Setup Guide

The Visual Clock plugin displays a full-screen clock with large, easy-to-read digits.

## Quick Start

1. Enable the Visual Clock plugin in the FiestaBoard settings
2. Configure your preferred timezone
3. Choose 12-hour or 24-hour format
4. Select your preferred colors

## Configuration Options

### Timezone

Set your timezone using IANA timezone names. Common examples:

| Region | Timezone |
|--------|----------|
| US Pacific | `America/Los_Angeles` |
| US Eastern | `America/New_York` |
| US Central | `America/Chicago` |
| UK | `Europe/London` |
| Central Europe | `Europe/Paris` |
| Japan | `Asia/Tokyo` |
| Australia Eastern | `Australia/Sydney` |

[Full list of IANA timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### Time Format

- **12h**: Shows time like `12:34` (1-12 with AM/PM in text output)
- **24h**: Shows time like `14:34` (0-23 military time)

### Color Patterns

Choose from several color patterns:

| Pattern | Description |
|---------|-------------|
| `solid` | Single color (uses digit_color setting) |
| `pride` | Rainbow rows - each row a different color |
| `rainbow` | Rainbow digits - each digit a different color |
| `sunset` | Warm gradient - red to yellow |
| `ocean` | Cool gradient - blue to violet |
| `retro` | Classic amber LED look |
| `christmas` | Festive red and green |
| `halloween` | Spooky orange and violet |

### Colors (for solid pattern)

Available colors for digits and background:

| Color | Preview |
|-------|---------|
| `red` | Red tiles |
| `orange` | Orange tiles |
| `yellow` | Yellow tiles |
| `green` | Green tiles |
| `blue` | Blue tiles |
| `violet` | Violet/Purple tiles |
| `white` | White tiles (default for digits) |
| `black` | Black tiles (default for background) |

## Example Configurations

### Classic White on Black (Default)

```json
{
  "timezone": "America/Los_Angeles",
  "time_format": "12h",
  "color_pattern": "solid",
  "digit_color": "white",
  "background_color": "black"
}
```

### Pride Rainbow Clock

```json
{
  "timezone": "America/Los_Angeles",
  "time_format": "12h",
  "color_pattern": "pride",
  "background_color": "black"
}
```

### Sunset Gradient

```json
{
  "timezone": "America/Los_Angeles",
  "time_format": "12h",
  "color_pattern": "sunset",
  "background_color": "black"
}
```

### Retro Amber LED

```json
{
  "timezone": "America/Los_Angeles",
  "time_format": "24h",
  "color_pattern": "retro",
  "background_color": "black"
}
```

### Christmas Theme

```json
{
  "timezone": "America/New_York",
  "time_format": "12h",
  "color_pattern": "christmas",
  "background_color": "black"
}
```

## Troubleshooting

### Clock shows wrong time

- Verify your timezone setting is correct
- Check that the timezone name is a valid IANA timezone

### Display looks incorrect

- Ensure your FiestaBoard is connected and working
- Try changing colors to verify the plugin is active

## No API Keys Required

This plugin uses your system clock and does not require any external API keys or services.
