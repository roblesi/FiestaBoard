# Star Trek Quotes Plugin

Display random Star Trek quotes from TNG, Voyager, and DS9.

## Overview

The Star Trek Quotes plugin displays inspirational and memorable quotes from Star Trek: The Next Generation, Voyager, and Deep Space Nine.

## Template Variables

```
{{star_trek.quote}}        # The quote text
{{star_trek.character}}    # Character name (e.g., "Picard")
{{star_trek.series}}       # Series code (TNG, VOYAGER, DS9)
{{star_trek.series_color}} # Color tile based on series
```

## Example Templates

### Quote with Attribution

```
{{star_trek.quote|wrap}}


- {{star_trek.character}}
```

### With Series Color

```
{{star_trek.series_color}} {{star_trek.series}}
{{star_trek.quote|wrap}}

- {{star_trek.character}}
```

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| enabled | boolean | false | Enable/disable the plugin |
| ratio | string | "3:5:9" | Weight ratio for TNG:Voyager:DS9 |

### Series Ratio

The ratio determines how often quotes from each series appear:

- `3:5:9` - More DS9, then Voyager, then TNG
- `1:1:1` - Equal distribution
- `5:3:2` - Favor TNG

## Series Colors

Each series has a default color:
- **TNG**: Blue
- **Voyager**: Orange  
- **DS9**: Violet

## Author

FiestaBoard Team

Live long and prosper! 🖖

