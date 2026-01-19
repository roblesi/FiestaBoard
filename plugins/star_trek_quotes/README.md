# Star Trek Quotes Plugin

Display random Star Trek quotes from TNG, Voyager, and DS9.

## Overview

The Star Trek Quotes plugin displays inspirational and memorable quotes from Star Trek: The Next Generation, Voyager, and Deep Space Nine.

## Template Variables

```
{{star_trek_quotes.quote}}        # The quote text
{{star_trek_quotes.character}}    # Character name (e.g., "Picard")
{{star_trek_quotes.series}}       # Series code (TNG, VOYAGER, DS9)
{{star_trek_quotes.series_color}} # Color tile based on series
```

## Example Templates

### Centered Quote with Attribution (Recommended)

Use the `|wrap` filter to automatically word-wrap quotes across multiple lines:

```
{center}{{star_trek_quotes.quote|wrap}}




{center}- {{star_trek_quotes.character}}
```

This displays as:
```
   Make it so.
     - Picard
```

Or for longer quotes:
```
 It is possible to
commit no mistakes and
    still lose.
     - Picard
```

**Tip:** The `|wrap` filter fills empty lines below it, and `{center}` centers each line.

### With Series Color

```
{center}{{star_trek_quotes.series_color}} {{star_trek_quotes.series}}

{center}{{star_trek_quotes.quote|wrap}}



{center}- {{star_trek_quotes.character}}
```

### Left-Aligned (No Centering)

```
{{star_trek_quotes.quote|wrap}}




- {{star_trek_quotes.character}}
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

