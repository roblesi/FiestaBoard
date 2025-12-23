# Vestaboard Character Codes & Weather Icons

## Overview

Vestaboard uses numeric character codes (0-63) to represent different characters. While it doesn't support traditional graphical icons, we can use creative character combinations and symbols to represent weather conditions.

## Character Codes

Vestaboard has 64 spinning character modules, each with different characters. The basic mapping includes:

- **Letters**: A-Z (codes 1-26)
- **Numbers**: 0-9 (codes 27-36)
- **Punctuation**: Period, comma, exclamation, question mark, etc.
- **Symbols**: Asterisk (*), slash (/), percent (%), etc.

## Weather Symbols

We've implemented weather symbols using available characters:

| Condition | Symbol | Character Code | Description |
|-----------|--------|----------------|-------------|
| Clear/Sunny | `*` | 48 (ASTERISK) | Sunny weather |
| Partly Cloudy | `%` | 49 (PERCENT) | Partly cloudy |
| Cloudy/Overcast | `O` | 15 (O) | Cloudy weather |
| Rain | `/` | 45 (SLASH) | Rainy weather |
| Thunderstorm | `!` | 40 (EXCLAMATION) | Stormy weather |
| Snow | `*` | 48 (ASTERISK) | Snowy weather |
| Fog/Mist | `~` | 44 (DASH) | Foggy conditions |

## Usage in Code

### Getting Weather Symbol

```python
from src.vestaboard_chars import get_weather_symbol

symbol_info = get_weather_symbol("Sunny")
# Returns: {
#     "symbol": "*",
#     "char_code": 48,
#     "description": "Sunny"
# }
```

### Using in Messages

The message formatter automatically includes weather symbols:

```python
from src.formatters.message_formatter import get_message_formatter

formatter = get_message_formatter()
weather_data = {
    'location': 'San Francisco',
    'condition': 'Sunny',
    'temperature': 75
}

message = formatter.format_weather(weather_data)
# Output:
# San Francisco: * Sunny
# Temp: 75°F
```

## Display Examples

### Sunny Weather
```
San Francisco: * Sunny
Temp: 75°F
```

### Rainy Weather
```
San Francisco: / Rain
Temp: 59°F
Humidity: 75% | Wind: 8 mph
```

### Cloudy Weather
```
San Francisco: O Overcast
Temp: 65°F
```

## Character Code Reference

The `VestaboardChars` class provides constants for all character codes:

```python
from src.vestaboard_chars import VestaboardChars

# Letters
VestaboardChars.A  # 1
VestaboardChars.B  # 2
# ... etc

# Numbers
VestaboardChars.ZERO  # 27
VestaboardChars.ONE   # 28
# ... etc

# Symbols
VestaboardChars.ASTERISK  # 48
VestaboardChars.SLASH     # 45
VestaboardChars.PERCENT   # 49
```

## Converting Text to Codes

```python
from src.vestaboard_chars import VestaboardChars

# Convert single character
code = VestaboardChars.get_char_code("A")  # Returns 1

# Convert text string
codes = VestaboardChars.text_to_codes("HELLO")
# Returns: [8, 5, 12, 12, 15]
```

## Notes

1. **Character codes are approximate**: The exact mapping may vary. These are based on common patterns and may need verification against official Vestaboard documentation.

2. **No true icons**: Vestaboard doesn't support graphical icons, so we use creative character combinations.

3. **Color support**: Vestaboard supports colors via VBML (Vestaboard Markup Language), which could be used to enhance weather displays (e.g., yellow for sunny, blue for rain).

4. **Extensibility**: The `get_weather_symbol()` function can be extended to support more conditions or use different character combinations.

## Future Enhancements

- **VBML Integration**: Add color support for weather conditions
- **Custom Symbols**: Create multi-character patterns for more complex weather icons
- **Character Code Verification**: Verify codes against official Vestaboard documentation
- **Extended Weather Conditions**: Add support for more specific conditions (drizzle, sleet, etc.)

## References

- [Vestaboard Documentation](https://docs.vestaboard.com/)
- [VBML Documentation](https://docs.vestaboard.com/docs/vbml)

