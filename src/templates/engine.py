"""Template engine for dynamic content generation.

Template syntax:
- Data binding: {{source.field}} e.g., {{weather.temperature}}, {{datetime.time}}
- Colors (inline): {red}Text{/red} or {63} for raw color codes
- Symbols: {sun}, {cloud}, {rain}
- Formatting: {{value|pad:3}}, {{value|upper}}, {{value|lower}}, {{value|wrap}}

Color codes:
- {red} or {63} - Red tile
- {orange} or {64} - Orange tile
- {yellow} or {65} - Yellow tile
- {green} or {66} - Green tile
- {blue} or {67} - Blue tile
- {violet} or {68} - Violet tile
- {white} or {69} - White tile
- {black} or {70} - Black tile

Special filters:
- |wrap - Wraps long content across multiple lines, filling empty lines below
"""

import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Color name to code mapping
COLOR_CODES = {
    "red": 63,
    "orange": 64,
    "yellow": 65,
    "green": 66,
    "blue": 67,
    "violet": 68,
    "purple": 68,  # alias
    "white": 69,
    "black": 70,
}

# Symbol name to character mapping
SYMBOL_CHARS = {
    "sun": "*",
    "star": "*",
    "cloud": "O",
    "rain": "/",
    "snow": "*",
    "storm": "!",
    "fog": "-",
    "partly": "%",
    "heart": "<3",
    "check": "+",
    "x": "X",
}

# Available data sources and their fields
# Fields ending in _color return just the color tile based on color rules
AVAILABLE_VARIABLES = {
    "weather": ["temperature", "condition", "humidity", "location", "wind_speed", "temperature_color"],
    "datetime": ["time", "date", "day", "day_of_week", "month", "year", "hour", "minute"],
    "home_assistant": ["state_color"],  # Dynamic based on entities
    "apple_music": ["track", "artist", "album", "playing"],
    "star_trek": ["quote", "character", "series", "series_color"],
    "guest_wifi": ["ssid", "password"],
}

# Maximum character lengths for each variable (for validation)
# Used to warn when a template line might be too long after variable substitution
VARIABLE_MAX_LENGTHS = {
    "weather.temperature": 3,
    "weather.condition": 12,
    "weather.humidity": 3,
    "weather.location": 15,
    "weather.wind_speed": 3,
    "weather.temperature_color": 4,  # Color tile like {65}
    "datetime.time": 5,
    "datetime.date": 10,
    "datetime.day": 2,
    "datetime.day_of_week": 9,
    "datetime.month": 9,
    "datetime.year": 4,
    "datetime.hour": 2,
    "datetime.minute": 2,
    "apple_music.track": 22,
    "apple_music.artist": 22,
    "apple_music.album": 22,
    "apple_music.playing": 3,
    "star_trek.quote": 120,  # Multi-line, handled by |wrap
    "star_trek.character": 15,
    "star_trek.series": 3,
    "star_trek.series_color": 4,  # Color tile
    "guest_wifi.ssid": 22,
    "guest_wifi.password": 22,
    "home_assistant.state": 10,
    "home_assistant.state_color": 4,  # Color tile
    "home_assistant.friendly_name": 15,
}

# Regex patterns
VAR_PATTERN = re.compile(r'\{\{([^}]+)\}\}')  # {{source.field}} or {{source.field|filter}}
COLOR_START_PATTERN = re.compile(r'\{(red|orange|yellow|green|blue|violet|purple|white|black|6[3-9]|70)\}', re.IGNORECASE)
COLOR_END_PATTERN = re.compile(r'\{/(red|orange|yellow|green|blue|violet|purple|white|black)?\}', re.IGNORECASE)
SYMBOL_PATTERN = re.compile(r'\{(sun|star|cloud|rain|snow|storm|fog|partly|heart|check|x)\}', re.IGNORECASE)


@dataclass
class TemplateError:
    """Template validation error."""
    line: int
    column: int
    message: str


class TemplateEngine:
    """Template engine for rendering dynamic content.
    
    Supports:
    - Variable substitution from display sources
    - Vestaboard color codes (inline and block)
    - Symbol shortcuts
    - Text formatting filters
    - Dynamic colors based on feature configuration rules
    """
    
    def __init__(self):
        """Initialize template engine."""
        self._display_service = None
        self._config_manager = None
        logger.info("TemplateEngine initialized")
    
    @property
    def display_service(self):
        """Lazy-load display service to avoid circular imports."""
        if self._display_service is None:
            from ..displays.service import get_display_service
            self._display_service = get_display_service()
        return self._display_service
    
    @property
    def config_manager(self):
        """Lazy-load config manager to avoid circular imports."""
        if self._config_manager is None:
            from ..config_manager import get_config_manager
            self._config_manager = get_config_manager()
        return self._config_manager
    
    def render(self, template: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Render template with data context.
        
        Args:
            template: Template string with {{variables}} and {colors}
            context: Optional pre-fetched context data. If not provided,
                     data will be fetched from display sources.
        
        Returns:
            Rendered string with all substitutions applied
        """
        if context is None:
            context = self._build_context()
        
        result = template
        
        # Process variables first
        result = self._render_variables(result, context)
        
        # Process symbols
        result = self._render_symbols(result)
        
        # Process colors (keep color markers for now - they'll be interpreted by UI/board)
        # Note: Color rendering depends on the output target
        # For text output, we keep the color codes as markers
        result = self._normalize_colors(result)
        
        return result
    
    def _count_tiles(self, text: str) -> int:
        """Count the number of tiles in a text string.
        
        Color markers like {66} count as 1 tile each, not their character length.
        
        Args:
            text: Rendered text string (may contain color markers like {66})
            
        Returns:
            Number of tiles (characters + color markers, where each marker = 1 tile)
        """
        tile_count = 0
        i = 0
        
        while i < len(text):
            # Check for color marker
            if text[i] == "{":
                closing_brace = text.find("}", i)
                if closing_brace != -1:
                    content = text[i + 1:closing_brace]
                    # Check if it's a color code (numeric 63-70 or named)
                    if content.isdigit():
                        code = int(content)
                        if 63 <= code <= 70:
                            # Numeric color code like {66} or {70}
                            tile_count += 1
                            i = closing_brace + 1
                            continue
                    elif content.lower() in COLOR_CODES:
                        # Named color like {green}
                        tile_count += 1
                        i = closing_brace + 1
                        continue
                    elif content.startswith("/"):
                        # End tag - skip it (doesn't count as a tile)
                        i = closing_brace + 1
                        continue
            
            # Regular character
            tile_count += 1
            i += 1
        
        return tile_count
    
    def _truncate_to_tiles(self, text: str, max_tiles: int = 22) -> str:
        """Truncate text to max_tiles, where color markers count as 1 tile each.
        
        Args:
            text: Rendered text string (may contain color markers like {66})
            max_tiles: Maximum number of tiles (characters + color markers)
            
        Returns:
            Truncated string that fits within max_tiles
        """
        # Count tiles (characters + color markers) and truncate appropriately
        result = []
        tile_count = 0
        i = 0
        
        while i < len(text) and tile_count < max_tiles:
            # Check for color marker
            if text[i] == "{":
                closing_brace = text.find("}", i)
                if closing_brace != -1:
                    content = text[i + 1:closing_brace]
                    # Check if it's a color code (numeric 63-70 or named)
                    if content.isdigit():
                        code = int(content)
                        if 63 <= code <= 70:
                            # Numeric color code like {66} or {70}
                            result.append(text[i:closing_brace + 1])
                            tile_count += 1
                            i = closing_brace + 1
                            continue
                    elif content.lower() in COLOR_CODES:
                        # Named color like {green}
                        result.append(text[i:closing_brace + 1])
                        tile_count += 1
                        i = closing_brace + 1
                        continue
                    elif content.startswith("/"):
                        # End tag - skip it
                        i = closing_brace + 1
                        continue
            
            # Regular character
            result.append(text[i])
            tile_count += 1
            i += 1
        
        return "".join(result)
    
    def render_lines(self, template_lines: List[str], context: Optional[Dict[str, Any]] = None) -> str:
        """Render a list of template lines (for template pages).
        
        Handles the special |wrap filter which allows content to flow
        across multiple lines, filling empty lines below.
        
        Args:
            template_lines: List of up to 6 template lines
            context: Optional pre-fetched context
            
        Returns:
            Rendered string with newlines
        """
        if context is None:
            context = self._build_context()
        
        # Pad to 6 lines
        lines = list(template_lines[:6])
        while len(lines) < 6:
            lines.append("")
        
        # Process lines, handling |wrap specially
        rendered = [""] * 6
        skip_until = -1  # Track lines filled by wrap overflow
        
        for i, line in enumerate(lines):
            if i <= skip_until:
                # This line was filled by wrap overflow, already set
                continue
            
            # Check if this line contains a |wrap filter
            if '|wrap}}' in line or '|wrap|' in line:
                # Find how many empty lines follow (for wrap overflow)
                empty_count = 0
                for j in range(i + 1, 6):
                    if lines[j].strip() == "":
                        empty_count += 1
                    else:
                        break
                
                # Render the wrap content
                wrapped_lines = self._render_with_wrap(line, context, max_lines=1 + empty_count)
                
                # Fill in the lines
                for k, wrapped_line in enumerate(wrapped_lines):
                    if i + k < 6:
                        rendered[i + k] = self._truncate_to_tiles(wrapped_line, max_tiles=22)
                
                skip_until = i + len(wrapped_lines) - 1
            else:
                # Normal rendering
                rendered_line = self.render(line, context)
                # Truncate to 22 tiles (not characters) - color markers count as 1 tile
                rendered[i] = self._truncate_to_tiles(rendered_line, max_tiles=22)
        
        return '\n'.join(rendered)
    
    def _render_with_wrap(self, template: str, context: Dict[str, Any], max_lines: int = 1) -> List[str]:
        """Render a template line that contains |wrap filter.
        
        The |wrap filter causes content to wrap across multiple lines.
        
        Args:
            template: Template string containing |wrap
            context: Data context
            max_lines: Maximum number of lines to fill
            
        Returns:
            List of rendered lines (up to max_lines)
        """
        # First, extract and render the wrapped variable
        wrap_pattern = re.compile(r'\{\{([^}]+\|wrap(?:\|[^}]*)?)\}\}')
        match = wrap_pattern.search(template)
        
        if not match:
            # No wrap found, render normally
            rendered = self.render(template, context)
            return [self._truncate_to_tiles(rendered, max_tiles=22)]
        
        # Get the variable expression (without |wrap)
        expr = match.group(1)
        # Remove |wrap from the filter chain
        parts = expr.split('|')
        var_part = parts[0].strip()
        other_filters = [p for p in parts[1:] if p.lower() != 'wrap']
        
        # Get the raw value
        value = self._get_variable_value(var_part, context)
        
        # Apply any other filters (except wrap)
        for f in other_filters:
            value = self._apply_filter(value, f)
        
        # Get prefix and suffix around the variable
        prefix = template[:match.start()]
        suffix = template[match.end():]
        
        # Render prefix and suffix (they may have other variables)
        prefix = self.render(prefix, context)
        suffix = self.render(suffix, context)
        
        # Calculate available width for wrapped content using tile counts, not character counts
        # Color markers like {67} are 4 characters but only 1 tile
        prefix_tiles = self._count_tiles(prefix)
        suffix_tiles = self._count_tiles(suffix)
        
        # First line has prefix and suffix
        first_line_width = max(1, 22 - prefix_tiles - suffix_tiles)  # Ensure at least 1 tile available
        # Subsequent lines have full width
        subsequent_width = 22
        
        # Word-wrap the value
        wrapped = self._word_wrap(value, first_line_width, subsequent_width, max_lines)
        
        # Build result lines
        result = []
        for idx, wrapped_line in enumerate(wrapped):
            if idx == 0:
                result.append(f"{prefix}{wrapped_line}{suffix}")
            else:
                result.append(wrapped_line)
        
        return result
    
    def _word_wrap(self, text: str, first_width: int, subsequent_width: int, max_lines: int) -> List[str]:
        """Word-wrap text across multiple lines.
        
        Args:
            text: Text to wrap
            first_width: Width available on first line
            subsequent_width: Width available on subsequent lines
            max_lines: Maximum number of lines
            
        Returns:
            List of wrapped lines
        """
        if not text:
            return [""]
        
        words = text.split()
        lines = []
        current_line = ""
        current_width = first_width
        
        for word in words:
            if not current_line:
                # First word on line
                if len(word) <= current_width:
                    current_line = word
                else:
                    # Word too long, truncate
                    current_line = word[:current_width]
            elif len(current_line) + 1 + len(word) <= current_width:
                # Word fits on current line
                current_line += " " + word
            else:
                # Start new line
                lines.append(current_line)
                if len(lines) >= max_lines:
                    break
                current_line = word[:subsequent_width] if len(word) > subsequent_width else word
                current_width = subsequent_width
        
        # Don't forget the last line
        if current_line and len(lines) < max_lines:
            lines.append(current_line)
        
        # Ensure we have at least one line
        if not lines:
            lines = [""]
        
        return lines
    
    def _build_context(self) -> Dict[str, Any]:
        """Build context by fetching all available data sources."""
        context = {}
        
        # Fetch from each source
        sources = ["weather", "datetime", "home_assistant", "apple_music", "star_trek", "guest_wifi"]
        
        for source in sources:
            try:
                result = self.display_service.get_display(source)
                if result.available and result.raw:
                    context[source] = result.raw
            except Exception as e:
                logger.debug(f"Failed to fetch {source} for template context: {e}")
        
        return context
    
    def _render_variables(self, template: str, context: Dict[str, Any]) -> str:
        """Replace {{source.field}} variables with values from context.
        
        Also applies color rules from feature configuration if defined.
        """
        def replace_var(match):
            expr = match.group(1).strip()
            
            # Check for filter: {{value|filter:arg}}
            if '|' in expr:
                var_part, filter_part = expr.split('|', 1)
                value = self._get_variable_value(var_part.strip(), context)
                filtered = self._apply_filter(value, filter_part.strip())
                # Apply color rules to the variable (before filtering changed it)
                color_prefix = self._get_color_for_value(var_part.strip(), context)
                return f"{color_prefix}{filtered}" if color_prefix else filtered
            else:
                value = self._get_variable_value(expr, context)
                # Apply color rules
                color_prefix = self._get_color_for_value(expr, context)
                return f"{color_prefix}{value}" if color_prefix else value
        
        return VAR_PATTERN.sub(replace_var, template)
    
    def _get_color_for_value(self, expr: str, context: Dict[str, Any]) -> str:
        """Get color tile prefix based on feature color rules.
        
        Args:
            expr: Variable expression like 'weather.temperature'
            context: Data context
            
        Returns:
            Color prefix like '{65} ' or empty string if no rule matches
        """
        parts = expr.split('.')
        if len(parts) < 2:
            return ""
        
        source = parts[0].lower()
        field = parts[1].lower()
        
        # Map source names to feature config names
        feature_map = {
            "weather": "weather",
            "datetime": "datetime",
            "home_assistant": "home_assistant",
            "apple_music": "apple_music",
            "star_trek": "star_trek_quotes",
            "guest_wifi": "guest_wifi",
        }
        
        feature_name = feature_map.get(source)
        if not feature_name:
            return ""
        
        # Get color rules for this field (config may use different name than data)
        rules = self.config_manager.get_color_rules(feature_name, field)
        if not rules:
            return ""
        
        # Map field name for data lookup (e.g., 'temp' -> 'temperature' for weather)
        data_field = self._map_field_for_data_lookup(source, field)
        
        # Get the raw value for comparison
        raw_value = None
        if source in context:
            raw_value = context[source].get(data_field) or context[source].get(parts[1])
        
        if raw_value is None:
            return ""
        
        # Evaluate rules in order (first match wins)
        for rule in rules:
            condition = rule.get("condition", "==")
            rule_value = rule.get("value")
            color = rule.get("color", "")
            
            if self._evaluate_condition(raw_value, condition, rule_value):
                # Return color code with space
                color_code = COLOR_CODES.get(color.lower(), color)
                if isinstance(color_code, int):
                    return f"{{{color_code}}} "
                return ""
        
        return ""
    
    def _evaluate_condition(self, actual: Any, condition: str, expected: Any) -> bool:
        """Evaluate a color rule condition.
        
        Args:
            actual: The actual value from data
            condition: Comparison operator (==, !=, >, <, >=, <=)
            expected: The expected value from rule
            
        Returns:
            True if condition matches
        """
        try:
            # Try numeric comparison first
            if condition in (">", "<", ">=", "<="):
                actual_num = float(actual)
                expected_num = float(expected)
                
                if condition == ">":
                    return actual_num > expected_num
                elif condition == "<":
                    return actual_num < expected_num
                elif condition == ">=":
                    return actual_num >= expected_num
                elif condition == "<=":
                    return actual_num <= expected_num
            
            # String comparison
            actual_str = str(actual).lower()
            expected_str = str(expected).lower()
            
            if condition == "==":
                return actual_str == expected_str
            elif condition == "!=":
                return actual_str != expected_str
            
        except (ValueError, TypeError):
            # Fall back to string comparison
            if condition == "==":
                return str(actual).lower() == str(expected).lower()
            elif condition == "!=":
                return str(actual).lower() != str(expected).lower()
        
        return False
    
    def _get_variable_value(self, expr: str, context: Dict[str, Any]) -> str:
        """Get value from context using dot notation (source.field).
        
        Also supports _color suffix to get just the color tile for a field.
        e.g., {{weather.temperature_color}} returns {65} based on temperature value.
        """
        parts = expr.split('.')
        
        if len(parts) < 2:
            return f"{{{{?{expr}}}}}"  # Invalid expression
        
        source = parts[0].lower()
        field = parts[1]
        
        # Check if this is a _color request
        if field.endswith('_color'):
            base_field = field[:-6]  # Remove '_color' suffix
            return self._get_color_only(source, base_field, context)
        
        if source not in context:
            return f"{{{{?{expr}}}}}"  # Source not available
        
        # Navigate to the field
        value = context[source]
        for part in parts[1:]:
            if isinstance(value, dict):
                value = value.get(part, value.get(part.lower()))
                if value is None:
                    return f"{{{{?{expr}}}}}"
            else:
                return f"{{{{?{expr}}}}}"
        
        # Convert to string
        if value is None:
            return ""
        if isinstance(value, bool):
            return "Yes" if value else "No"
        if isinstance(value, (int, float)):
            return str(int(value) if float(value).is_integer() else round(value, 1))
        return str(value)
    
    def _get_color_only(self, source: str, field: str, context: Dict[str, Any]) -> str:
        """Get just the color tile for a field based on color rules.
        
        Args:
            source: Data source name (e.g., 'weather')
            field: Field name (e.g., 'temp')
            context: Data context
            
        Returns:
            Color tile like '{65}' or empty string if no rule matches
        """
        # Map source names to feature config names
        feature_map = {
            "weather": "weather",
            "datetime": "datetime",
            "home_assistant": "home_assistant",
            "apple_music": "apple_music",
            "star_trek": "star_trek_quotes",
            "guest_wifi": "guest_wifi",
        }
        
        feature_name = feature_map.get(source)
        if not feature_name:
            return ""
        
        # Get color rules for this field (config may use different name than data)
        rules = self.config_manager.get_color_rules(feature_name, field)
        if not rules:
            return ""
        
        # Map field name for data lookup (e.g., 'temp' -> 'temperature' for weather)
        data_field = self._map_field_for_data_lookup(source, field)
        
        # Get the raw value for comparison
        raw_value = None
        if source in context:
            raw_value = context[source].get(data_field) or context[source].get(data_field.lower())
        
        if raw_value is None:
            return ""
        
        # Evaluate rules in order (first match wins)
        for rule in rules:
            condition = rule.get("condition", "==")
            rule_value = rule.get("value")
            color = rule.get("color", "")
            
            if self._evaluate_condition(raw_value, condition, rule_value):
                color_code = COLOR_CODES.get(color.lower(), color)
                if isinstance(color_code, int):
                    return f"{{{color_code}}}"
                return ""
        
        return ""
    
    def _map_field_for_data_lookup(self, source: str, field: str) -> str:
        """Map field name from config to data field name.
        
        Some fields in config (like color rules) use different names than
        the actual data fields. This maps them appropriately.
        
        Args:
            source: Data source name (e.g., 'weather')
            field: Field name from config (e.g., 'temp')
            
        Returns:
            Field name as it appears in the data (e.g., 'temperature')
        """
        # Map weather.temp -> temperature (for backward compatibility with old 'temp' field name)
        # The primary field name is now 'temperature', so temperature_color works directly
        if source == "weather" and field == "temp":
            return "temperature"
        
        return field
    
    def _apply_filter(self, value: str, filter_expr: str) -> str:
        """Apply a filter to a value.
        
        Supported filters:
        - pad:N - Pad to N characters
        - upper - Uppercase
        - lower - Lowercase
        - truncate:N - Truncate to N characters
        """
        if ':' in filter_expr:
            filter_name, arg = filter_expr.split(':', 1)
            filter_name = filter_name.lower()
            
            if filter_name == 'pad':
                try:
                    width = int(arg)
                    return value.ljust(width)[:width]
                except ValueError:
                    return value
            
            elif filter_name == 'truncate':
                try:
                    length = int(arg)
                    return value[:length]
                except ValueError:
                    return value
        else:
            filter_name = filter_expr.lower()
            
            if filter_name == 'upper':
                return value.upper()
            elif filter_name == 'lower':
                return value.lower()
            elif filter_name == 'capitalize':
                return value.capitalize()
        
        return value
    
    def _render_symbols(self, template: str) -> str:
        """Replace {symbol} shortcuts with characters."""
        def replace_symbol(match):
            symbol = match.group(1).lower()
            return SYMBOL_CHARS.get(symbol, match.group(0))
        
        return SYMBOL_PATTERN.sub(replace_symbol, template)
    
    def _normalize_colors(self, template: str) -> str:
        """Normalize color markers to consistent format.
        
        Converts named colors to code format for consistency.
        e.g., {red} -> {63}
        """
        def replace_color_start(match):
            color = match.group(1).lower()
            if color.isdigit():
                return f"{{{color}}}"
            code = COLOR_CODES.get(color)
            if code:
                return f"{{{code}}}"
            return match.group(0)
        
        # Normalize start tags
        result = COLOR_START_PATTERN.sub(replace_color_start, template)
        
        # Normalize end tags to just {/}
        result = COLOR_END_PATTERN.sub("{/}", result)
        
        return result
    
    def get_available_variables(self) -> Dict[str, List[str]]:
        """Get list of all available template variables by source.
        
        Returns:
            Dict mapping source names to lists of field names
        """
        return AVAILABLE_VARIABLES.copy()
    
    def validate_template(self, template: str) -> List[TemplateError]:
        """Validate template syntax.
        
        Args:
            template: Template string to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        lines = template.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Check for unclosed variable braces
            open_count = line.count('{{')
            close_count = line.count('}}')
            if open_count != close_count:
                errors.append(TemplateError(
                    line=line_num,
                    column=0,
                    message="Mismatched variable braces {{}}"
                ))
            
            # Calculate max possible line length
            max_length = self._calculate_max_line_length(line)
            if max_length > 22:
                errors.append(TemplateError(
                    line=line_num,
                    column=22,
                    message=f"Line may be too long (up to {max_length} chars, max 22)"
                ))
            
            # Check for invalid variable references
            for match in VAR_PATTERN.finditer(line):
                expr = match.group(1).split('|')[0].strip()
                parts = expr.split('.')
                if len(parts) >= 2:
                    source = parts[0].lower()
                    if source not in AVAILABLE_VARIABLES:
                        errors.append(TemplateError(
                            line=line_num,
                            column=match.start(),
                            message=f"Unknown source: {source}"
                        ))
        
        return errors
    
    def _calculate_max_line_length(self, line: str) -> int:
        """Calculate maximum possible rendered length of a template line.
        
        Considers:
        - Static text (counted as-is)
        - Variables (replaced with their max character length)
        - Color markers (not counted - they become tiles)
        - |wrap filter (returns 22 since it handles overflow)
        
        Args:
            line: Template line to analyze
            
        Returns:
            Maximum possible character count after rendering
        """
        # If line has |wrap, it handles overflow automatically
        if '|wrap}}' in line or '|wrap|' in line:
            return 22  # Wrap ensures lines don't overflow
        
        # Start with the line
        result = line
        
        # Remove color markers (they become single tiles, count as 1 char each)
        # Replace {color} with single char placeholder
        result = re.sub(r'\{(red|orange|yellow|green|blue|violet|purple|white|black|6[3-9]|70)\}', 'C', result, flags=re.IGNORECASE)
        result = re.sub(r'\{/(red|orange|yellow|green|blue|violet|purple|white|black)?\}', '', result, flags=re.IGNORECASE)
        
        # Replace symbols with their character equivalent (usually 1-2 chars)
        for symbol, char in SYMBOL_CHARS.items():
            result = re.sub(rf'\{{{symbol}\}}', char, result, flags=re.IGNORECASE)
        
        # Replace variables with their max length
        def replace_with_max_length(match):
            expr = match.group(1).strip()
            # Remove filters for lookup
            var_part = expr.split('|')[0].strip().lower()
            
            # Check for color rules (adds 2 chars: color tile + space)
            color_prefix_len = 0
            parts = var_part.split('.')
            if len(parts) >= 2:
                source = parts[0]
                field = parts[1]
                # Map to feature name for color rules lookup
                feature_map = {
                    "weather": "weather",
                    "star_trek": "star_trek_quotes",
                    "home_assistant": "home_assistant",
                }
                feature = feature_map.get(source)
                if feature:
                    try:
                        rules = self.config_manager.get_color_rules(feature, field)
                        if rules:
                            color_prefix_len = 2  # Color tile + space
                    except Exception:
                        pass
            
            # Get max length for this variable
            max_len = VARIABLE_MAX_LENGTHS.get(var_part, 10)  # Default 10 if unknown
            return 'X' * (max_len + color_prefix_len)
        
        result = VAR_PATTERN.sub(replace_with_max_length, result)
        
        return len(result)
    
    def get_variable_max_lengths(self) -> Dict[str, int]:
        """Get the max character lengths for all variables.
        
        Returns:
            Dict mapping variable names to max lengths
        """
        return VARIABLE_MAX_LENGTHS.copy()
    
    def strip_formatting(self, text: str) -> str:
        """Remove all template formatting markers from text.
        
        Useful for getting plain text length or display.
        """
        # Remove variables that weren't resolved
        result = re.sub(r'\{\{[^}]*\}\}', '', text)
        # Remove color markers
        result = re.sub(r'\{[^}]*\}', '', result)
        return result


# Singleton instance
_template_engine: Optional[TemplateEngine] = None


def get_template_engine() -> TemplateEngine:
    """Get or create the template engine singleton."""
    global _template_engine
    if _template_engine is None:
        _template_engine = TemplateEngine()
    return _template_engine

