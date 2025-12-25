# Star Trek Quotes Setup

Display inspiring Star Trek quotes from The Next Generation (TNG), Voyager (VOY), and Deep Space Nine (DS9) on your Vestaboard.

## Overview

The Star Trek quotes feature displays random quotes from three iconic Star Trek series with a configurable ratio:
- **TNG (The Next Generation)** - Featuring Picard, Data, Worf, and more
- **Voyager** - Featuring Janeway, Seven of Nine, the Doctor, and more
- **DS9 (Deep Space Nine)** - Featuring Sisko, Garak, Odo, Quark, and more

## Configuration

Add these settings to your `.env` file:

```bash
# Star Trek Quotes Configuration
STAR_TREK_QUOTES_ENABLED=true
STAR_TREK_QUOTES_RATIO=3:5:9

# Add to rotation
ROTATION_ENABLED=true
ROTATION_STAR_TREK_DURATION=180
ROTATION_ORDER=weather,home_assistant,star_trek
```

### Configuration Options

#### `STAR_TREK_QUOTES_ENABLED`

Enable or disable Star Trek quotes.

**Options:**
- `true` - Enable Star Trek quotes
- `false` - Disable Star Trek quotes

**Example:**
```bash
STAR_TREK_QUOTES_ENABLED=true
```

#### `STAR_TREK_QUOTES_RATIO`

Control the ratio between series. Format: `TNG:Voyager:DS9`

**Default:** `3:5:9`

This means:
- TNG quotes appear ~18% of the time (3 out of 17 total weight)
- Voyager quotes appear ~29% of the time (5 out of 17 total weight)
- DS9 quotes appear ~53% of the time (9 out of 17 total weight)

**Examples:**
```bash
# Default (DS9-focused)
STAR_TREK_QUOTES_RATIO=3:5:9

# Equal distribution
STAR_TREK_QUOTES_RATIO=1:1:1

# TNG-focused
STAR_TREK_QUOTES_RATIO=9:3:3

# Voyager-focused
STAR_TREK_QUOTES_RATIO=3:9:3

# DS9 only
STAR_TREK_QUOTES_RATIO=0:0:1

# TNG only
STAR_TREK_QUOTES_RATIO=1:0:0
```

#### `ROTATION_STAR_TREK_DURATION`

How long each quote displays (in seconds).

**Default:** `180` (3 minutes)

**Examples:**
```bash
ROTATION_STAR_TREK_DURATION=180   # 3 minutes
ROTATION_STAR_TREK_DURATION=120   # 2 minutes
ROTATION_STAR_TREK_DURATION=300   # 5 minutes
ROTATION_STAR_TREK_DURATION=60    # 1 minute
```

## Display Format

Quotes are displayed in this format:

```
Quote text here, split
across multiple lines
if needed.

- Character Name
  SERIES
```

**Example (TNG):**
```
Make it so.

- Picard
  TNG
```

**Example (DS9):**
```
The truth is usually
just an excuse for a
lack of imagination.

- Garak
  DS9
```

**Example (Voyager):**
```
There is coffee in
that nebula!

- Janeway
  VOY
```

## Quote Collection

The system includes a curated collection of memorable quotes:

- **18 TNG quotes** - From Picard, Data, Worf, and more
- **30 Voyager quotes** - From Janeway, Seven of Nine, the Doctor, and more
- **54 DS9 quotes** - From Sisko, Garak, Odo, Quark, Kira, and more

### Sample Quotes

**TNG:**
- "Make it so." - Picard
- "There are four lights!" - Picard
- "It is possible to commit no mistakes and still lose." - Picard
- "Today is a good day to die." - Worf
- "Resistance is futile." - Borg

**Voyager:**
- "Do it." - Janeway
- "There's coffee in that nebula!" - Janeway
- "Fear exists for one purpose: to be conquered." - Janeway
- "Survival is insufficient." - Seven of Nine
- "Please state the nature of the medical emergency." - Doctor

**DS9:**
- "It's easy to be a saint in paradise." - Sisko
- "The truth is just an excuse for lack of imagination." - Garak
- "Paranoia is just another word for longevity." - Garak
- "Never begin a negotiation on an empty stomach." - Quark
- "What you leave behind is not as important as how you lived." - Sisko

## Integration with Rotation

Star Trek quotes rotate with other screens:

### Full Rotation Example

```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=300          # Weather: 5 minutes
ROTATION_HOME_ASSISTANT_DURATION=300    # Home Assistant: 5 minutes
ROTATION_STAR_TREK_DURATION=180         # Star Trek: 3 minutes
ROTATION_ORDER=weather,home_assistant,star_trek
```

**Timeline:**
```
0:00 - 5:00   → Weather + DateTime
5:00 - 10:00  → Home Assistant
10:00 - 13:00 → Star Trek Quote
13:00 - 18:00 → Weather + DateTime
... (repeats)
```

### Star Trek-Focused Rotation

Show more quotes:

```bash
ROTATION_ENABLED=true
ROTATION_WEATHER_DURATION=180          # Weather: 3 minutes
ROTATION_HOME_ASSISTANT_DURATION=120   # Home Assistant: 2 minutes
ROTATION_STAR_TREK_DURATION=300        # Star Trek: 5 minutes
ROTATION_ORDER=weather,home_assistant,star_trek
```

### Star Trek Only

Only display Star Trek quotes (no other screens):

```bash
ROTATION_ENABLED=true
ROTATION_ORDER=star_trek
STAR_TREK_QUOTES_ENABLED=true
```

**Note:** Quotes will change every `REFRESH_INTERVAL_SECONDS` (default: 5 minutes).

## Priority System

The display follows this priority:

1. **Guest WiFi** (highest) - When enabled
2. **Apple Music** - When music is playing
3. **Rotation** - Weather, Home Assistant, Star Trek
4. **Weather + DateTime** - Default

Star Trek quotes are part of the rotation system and respect the priority hierarchy.

## Testing

Test the quotes formatting:

```bash
cd /path/to/Vesta
python3 -c "
import sys
sys.path.insert(0, 'src')
from src.data_sources.star_trek_quotes import StarTrekQuotesSource
from src.formatters.message_formatter import get_message_formatter

# Create source
source = StarTrekQuotesSource(tng_weight=3, voyager_weight=5, ds9_weight=9)
formatter = get_message_formatter()

# Get random quote
quote = source.get_random_quote()
print(f'Series: {quote[\"series\"].upper()}')
print(f'Character: {quote[\"character\"]}')
print()
print('Formatted for Vestaboard:')
print(formatter.format_star_trek_quote(quote))
"
```

Test the ratio distribution:

```bash
python3 -c "
import sys
sys.path.insert(0, 'src')
from src.data_sources.star_trek_quotes import StarTrekQuotesSource

source = StarTrekQuotesSource(tng_weight=3, voyager_weight=5, ds9_weight=9)
counts = {'tng': 0, 'voyager': 0, 'ds9': 0}

for _ in range(100):
    quote = source.get_random_quote()
    counts[quote['series'].lower()] += 1

print(f'TNG: {counts[\"tng\"]}')
print(f'Voyager: {counts[\"voyager\"]}')
print(f'DS9: {counts[\"ds9\"]}')
"
```

## Common Configurations

### Equal Distribution
```bash
STAR_TREK_QUOTES_ENABLED=true
STAR_TREK_QUOTES_RATIO=1:1:1
```

### TNG-Focused
```bash
STAR_TREK_QUOTES_ENABLED=true
STAR_TREK_QUOTES_RATIO=9:3:3
```

### Voyager-Focused
```bash
STAR_TREK_QUOTES_ENABLED=true
STAR_TREK_QUOTES_RATIO=3:9:3
```

### DS9-Focused (Default)
```bash
STAR_TREK_QUOTES_ENABLED=true
STAR_TREK_QUOTES_RATIO=3:5:9
```

### Random Quick Quotes
```bash
STAR_TREK_QUOTES_ENABLED=true
STAR_TREK_QUOTES_RATIO=1:1:1
ROTATION_STAR_TREK_DURATION=60  # Change every minute
```

## Troubleshooting

### Quotes Not Showing

1. **Check if enabled:**
   ```bash
   grep STAR_TREK_QUOTES_ENABLED .env
   # Should show: STAR_TREK_QUOTES_ENABLED=true
   ```

2. **Check rotation order:**
   ```bash
   grep ROTATION_ORDER .env
   # Should include: star_trek
   ```

3. **Check logs:**
   ```bash
   docker-compose logs | grep -i "star trek"
   ```

### Wrong Ratio

1. **Verify ratio format:**
   - Format must be `TNG:Voyager:DS9`
   - Example: `3:5:9`

2. **Test ratio:**
   - Run the ratio test script above
   - Check distribution over 100 samples

### Quotes Too Long

Quotes are automatically truncated to fit the 6x22 Vestaboard display. Long quotes are split across multiple lines.

## Adding Custom Quotes

To add your own quotes, edit `src/data_sources/star_trek_quotes.json`:

```json
{
  "tng": [
    {"quote": "Your custom quote here", "character": "Character Name"}
  ],
  "voyager": [
    {"quote": "Another quote", "character": "Character Name"}
  ],
  "ds9": [
    {"quote": "Yet another quote", "character": "Character Name"}
  ]
}
```

After editing, restart the service:
```bash
docker-compose restart
```

## Restart After Changes

After changing Star Trek quotes settings, restart the service:

```bash
docker-compose restart
docker-compose logs -f
```

Watch for:
- "Star Trek quotes enabled"
- "Display updated with Star Trek quote"
- Series abbreviation in logs (TNG, VOY, DS9)

## Summary

- **Enable quotes**: `STAR_TREK_QUOTES_ENABLED=true`
- **Control ratio**: `STAR_TREK_QUOTES_RATIO=3:5:9` (TNG:Voyager:DS9)
- **Set duration**: `ROTATION_STAR_TREK_DURATION=180` (seconds)
- **Add to rotation**: Include `star_trek` in `ROTATION_ORDER`

Live long and prosper! 🖖

