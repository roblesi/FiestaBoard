"""Template engine for dynamic content generation.

Template syntax:
- Data binding: {{source.field}} e.g., {{weather.temperature}}, {{datetime.time}}
- Colors: {{red}}, {{blue}}, etc. - Single colored tile (not text wrapping)
- Symbols: {sun}, {cloud}, {rain}
- Formatting: {{value|pad:3}}, {{value|upper}}, {{value|lower}}, {{value|wrap}}

Color tiles (each produces one solid color tile):
- {{red}} or {{63}} - Red tile
- {{orange}} or {{64}} - Orange tile
- {{yellow}} or {{65}} - Yellow tile
- {{green}} or {{66}} - Green tile
- {{blue}} or {{67}} - Blue tile
- {{violet}} or {{68}} - Violet tile
- {{white}} or {{69}} - White tile
- {{black}} or {{70}} - Black tile

Example: "{{red}} ALERT {{red}}" produces [red tile] ALERT [red tile]

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
    "star_trek": ["quote", "character", "series", "series_color"],
    "guest_wifi": ["ssid", "password"],
    "air_fog": ["aqi", "air_status", "air_color", "fog_status", "fog_color", "is_foggy", "visibility", "formatted"],
    "muni": [
        "line", "stop_name", "stop_code", "arrivals", "is_delayed", "delay_description", "formatted",
        "stop_count", "next_arrival", "stops", "lines", "all_lines"
    ],
    "surf": ["wave_height", "swell_period", "quality", "quality_color", "formatted"],
    "baywheels": [
        "electric_bikes", "classic_bikes", "num_bikes_available", "is_renting", "station_name", "status_color",
        "total_electric", "total_classic", "total_bikes", "station_count",
        "best_station_name", "best_station_electric", "best_station_id",
        "stations"
    ],
    "traffic": [
        "duration_minutes", "delay_minutes", "traffic_status", "traffic_color", "destination_name", "formatted",
        "route_count", "worst_delay", "routes"
    ],
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
    "star_trek.quote": 120,  # Multi-line, handled by |wrap
    "star_trek.character": 15,
    "star_trek.series": 3,
    "star_trek.series_color": 4,  # Color tile
    "guest_wifi.ssid": 22,
    "guest_wifi.password": 22,
    "home_assistant.state": 10,
    "home_assistant.state_color": 4,  # Color tile
    "home_assistant.friendly_name": 15,
    "air_fog.aqi": 3,  # 0-500
    "air_fog.air_status": 18,  # UNHEALTHY_SENSITIVE
    "air_fog.air_color": 4,  # Color tile
    "air_fog.fog_status": 10,  # FOG, HAZE, MIST, CLEAR
    "air_fog.fog_color": 4,  # Color tile
    "air_fog.is_foggy": 3,  # Yes/No
    "air_fog.visibility": 5,  # e.g., "1.2mi"
    "air_fog.formatted": 22,  # Pre-formatted message
    "muni.line": 12,
    "muni.stop_name": 22,
    "muni.stop_code": 6,
    "muni.arrivals": 15,
    "muni.is_delayed": 3,
    "muni.delay_description": 22,
    "muni.formatted": 22,
    "muni.stop_count": 1,
    "muni.stops.0.line": 12,
    "muni.stops.0.stop_name": 22,
    "muni.stops.0.stop_code": 6,
    "muni.stops.0.formatted": 22,
    "muni.stops.0.is_delayed": 3,
    "muni.stops.1.line": 12,
    "muni.stops.1.stop_name": 22,
    "muni.stops.1.formatted": 22,
    "muni.stops.2.line": 12,
    "muni.stops.2.stop_name": 22,
    "muni.stops.2.formatted": 22,
    "muni.stops.3.line": 12,
    "muni.stops.3.stop_name": 22,
    "muni.stops.3.formatted": 22,
    "muni.stops.0.all_lines.formatted": 22,
    "muni.stops.0.all_lines.next_arrival": 2,
    "muni.stops.0.lines.N.formatted": 22,
    "muni.stops.0.lines.N.next_arrival": 2,
    "muni.stops.0.lines.N.is_delayed": 3,
    "muni.stops.0.lines.J.formatted": 22,
    "muni.stops.0.lines.KT.formatted": 22,
    "muni.stops.0.lines.L.formatted": 22,
    "muni.stops.0.lines.M.formatted": 22,
    "surf.wave_height": 4,  # e.g., "3.5"
    "surf.swell_period": 4,  # e.g., "12.5"
    "surf.quality": 9,  # EXCELLENT, GOOD, FAIR, POOR
    "surf.quality_color": 4,  # Color tile
    "surf.formatted": 22,  # Pre-formatted message
    "baywheels.electric_bikes": 2,
    "baywheels.classic_bikes": 2,
    "baywheels.num_bikes_available": 2,
    "baywheels.is_renting": 3,  # Yes/No
    "baywheels.station_name": 10,
    "baywheels.status_color": 4,  # Color tile
    "baywheels.total_electric": 2,
    "baywheels.total_classic": 2,
    "baywheels.total_bikes": 2,
    "baywheels.station_count": 1,
    "baywheels.best_station_name": 10,
    "baywheels.best_station_electric": 2,
    "baywheels.best_station_id": 15,
    "baywheels.stations.0.electric_bikes": 2,
    "baywheels.stations.0.station_name": 10,
    "baywheels.stations.0.classic_bikes": 2,
    "baywheels.stations.0.status_color": 4,
    "baywheels.stations.1.electric_bikes": 2,
    "baywheels.stations.1.station_name": 10,
    "baywheels.stations.2.electric_bikes": 2,
    "baywheels.stations.2.station_name": 10,
    "baywheels.stations.3.electric_bikes": 2,
    "baywheels.stations.3.station_name": 10,
    "traffic.duration_minutes": 3,  # e.g., "45"
    "traffic.delay_minutes": 3,  # e.g., "+12"
    "traffic.traffic_status": 8,  # LIGHT, MODERATE, HEAVY
    "traffic.traffic_color": 4,  # Color tile
    "traffic.destination_name": 10,  # e.g., "DOWNTOWN"
    "traffic.formatted": 22,  # Pre-formatted message
    "traffic.route_count": 1,
    "traffic.routes.0.duration_minutes": 3,
    "traffic.routes.0.delay_minutes": 3,
    "traffic.routes.0.traffic_status": 8,
    "traffic.routes.0.destination_name": 10,
    "traffic.routes.0.formatted": 22,
    "traffic.routes.1.duration_minutes": 3,
    "traffic.routes.1.destination_name": 10,
    "traffic.routes.1.formatted": 22,
    "traffic.routes.2.duration_minutes": 3,
    "traffic.routes.2.destination_name": 10,
    "traffic.routes.2.formatted": 22,
    "traffic.routes.3.duration_minutes": 3,
    "traffic.routes.3.destination_name": 10,
    "traffic.routes.3.formatted": 22,
}

# Regex patterns
VAR_PATTERN = re.compile(r'\{\{([^}]+)\}\}')  # {{source.field}} or {{source.field|filter}}
COLOR_PATTERN = re.compile(r'\{\{(red|orange|yellow|green|blue|violet|purple|white|black|6[3-9]|70)\}\}', re.IGNORECASE)
SYMBOL_PATTERN = re.compile(r'\{(sun|star|cloud|rain|snow|storm|fog|partly|heart|check|x)\}', re.IGNORECASE)
ALIGNMENT_PATTERN = re.compile(r'^\{(left|center|right)\}', re.IGNORECASE)
FILL_SPACE_PATTERN = re.compile(r'\{\{fill_space\}\}', re.IGNORECASE)


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
    
    def reset_cache(self):
        """Reset cached services to pick up configuration changes."""
        self._display_service = None
        self._config_manager = None
        logger.info("TemplateEngine cache reset")
    
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
            template: Template string with {{variables}} and {{colors}}
            context: Optional pre-fetched context data. If not provided,
                     data will be fetched from display sources.
        
        Returns:
            Rendered string with all substitutions applied
        """
        if context is None:
            context = self._build_context()
        
        result = template
        
        # Process colors FIRST (before variables) to prevent VAR_PATTERN from matching them
        # This converts {{red}} to {{63}}, etc.
        result = self._normalize_colors(result)
        
        # Process variables
        result = self._render_variables(result, context)
        
        # Process symbols (single brackets like {sun})
        result = self._render_symbols(result)
        
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
        
        Handles:
        - The special |wrap filter which allows content to flow across multiple lines
        - Alignment directives {left}, {center}, {right}
        - The {{fill_space}} variable for flexible spacing
        
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
            
            # Extract alignment directive
            alignment, content = self._extract_alignment(line)
            
            # Check if this line contains a |wrap filter
            if '|wrap}}' in content or '|wrap|' in content:
                # Find how many empty lines follow (for wrap overflow)
                # A line is considered empty if it has no content after extracting alignment
                empty_count = 0
                for j in range(i + 1, 6):
                    _, line_content = self._extract_alignment(lines[j])
                    if line_content.strip() == "":
                        empty_count += 1
                    else:
                        break
                
                # Render the wrap content
                wrapped_lines = self._render_with_wrap(content, context, max_lines=1 + empty_count)
                
                # Fill in the lines with alignment
                for k, wrapped_line in enumerate(wrapped_lines):
                    if i + k < 6:
                        # Process fill_space first
                        processed = self._process_fill_space(wrapped_line, width=22)
                        # Then apply alignment
                        rendered[i + k] = self._apply_alignment(processed, alignment, width=22)
                
                skip_until = i + len(wrapped_lines) - 1
            else:
                # Normal rendering
                rendered_line = self.render(content, context)
                # Process fill_space first
                rendered_line = self._process_fill_space(rendered_line, width=22)
                # Apply alignment (this also truncates if needed)
                rendered[i] = self._apply_alignment(rendered_line, alignment, width=22)
        
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
        sources = ["weather", "datetime", "home_assistant", "star_trek", "guest_wifi", "air_fog", "muni", "surf", "baywheels", "traffic"]
        
        for source in sources:
            try:
                result = self.display_service.get_display(source)
                if result.available:
                    # For home_assistant, fetch all entities directly for template context
                    # Don't rely on display-configured entities (which may be empty)
                    if source == "home_assistant":
                        try:
                            from ..data_sources.home_assistant import get_home_assistant_source
                            ha_source = get_home_assistant_source()
                            if ha_source:
                                all_entities = ha_source.get_all_entities_for_context()
                                context[source] = all_entities
                        except Exception as e:
                            logger.debug(f"Failed to fetch all home_assistant entities: {e}")
                            # Fall back to display result's raw data if fetching all entities failed
                            if result.raw:
                                context[source] = result.raw
                    elif result.raw:
                        # For other sources, use the display result's raw data
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
            "star_trek": "star_trek_quotes",
            "guest_wifi": "guest_wifi",
            "air_fog": "air_fog",
            "muni": "muni",
            "surf": "surf",
            "baywheels": "baywheels",
            "traffic": "traffic",
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
        
        Supports array access:
        - {{baywheels.stations.0.electric_bikes}} - Access first station's e-bikes
        - {{baywheels.stations.1.station_name}} - Access second station's name
        
        Supports Home Assistant entity_id based lookups:
        - {{home_assistant.sensor_temperature.state}} - Get state of sensor.temperature
        - {{home_assistant.media_player_living_room.media_title}} - Get media_title attribute
        
        Special variables:
        - fill_space: Returns a placeholder that will be expanded later
        
        Returns "???" if variable is unavailable (API error, missing data, etc.)
        """
        # Handle special fill_space variable
        if expr.lower() == 'fill_space':
            return '\x00FILL_SPACE\x00'  # Special marker to be processed later
        
        parts = expr.split('.')
        
        if len(parts) < 2:
            return "???"  # Invalid expression
        
        source = parts[0].lower()
        
        # Special handling for home_assistant with entity_id syntax
        # Format: home_assistant.entity_id.attribute (3 parts minimum)
        if source == 'home_assistant' and len(parts) >= 3:
            # Convert underscores back to dots for entity_id
            # (entity_id uses dots like sensor.temperature, but dots can't be in template syntax)
            # So we expect: home_assistant.sensor_temperature.state
            # Which maps to: entity_id=sensor.temperature, attribute=state
            entity_id_part = parts[1]
            attribute = parts[2]
            
            # Get home_assistant context data first
            ha_data = context.get('home_assistant', {})
            
            # Smart entity_id conversion: try different underscore positions
            # Some domains have underscores (media_player, binary_sensor, device_tracker, etc.)
            # Try to find the entity by testing different split points
            entity_id = None
            entity_data = {}
            
            if '_' in entity_id_part:
                # Try each underscore position as a potential domain/entity split
                parts_split = entity_id_part.split('_')
                for i in range(1, len(parts_split)):
                    # Try domain as first i parts, rest as entity name
                    test_domain = '_'.join(parts_split[:i])
                    test_entity = '_'.join(parts_split[i:])
                    test_entity_id = f"{test_domain}.{test_entity}"
                    
                    if test_entity_id in ha_data:
                        entity_id = test_entity_id
                        entity_data = ha_data[test_entity_id]
                        break
                
                # Fallback to old behavior if no match found (replace first underscore)
                if not entity_data:
                    entity_id = entity_id_part.replace('_', '.', 1)
                    entity_data = ha_data.get(entity_id, {})
            else:
                entity_id = entity_id_part
                entity_data = ha_data.get(entity_id, {})
            
            if not entity_data:
                return "???"  # Entity not found
            
            # Check if requesting the state directly
            if attribute == 'state':
                return str(entity_data.get('state', '???'))
            
            # Check if requesting an attribute
            attributes = entity_data.get('attributes', {})
            if attribute in attributes:
                value = attributes[attribute]
                # Convert to string
                if value is None:
                    return "???"
                if isinstance(value, bool):
                    return "Yes" if value else "No"
                if isinstance(value, (int, float)):
                    return str(int(value) if float(value).is_integer() else round(value, 1))
                return str(value)
            
            # Check if attribute exists at top level
            if attribute in entity_data:
                value = entity_data[attribute]
                if value is None:
                    return "???"
                if isinstance(value, bool):
                    return "Yes" if value else "No"
                if isinstance(value, (int, float)):
                    return str(int(value) if float(value).is_integer() else round(value, 1))
                return str(value)
            
            return "???"  # Attribute not found
        
        field = parts[1]
        
        # Check if this is a _color request
        if field.endswith('_color'):
            base_field = field[:-6]  # Remove '_color' suffix
            color_result = self._get_color_only(source, base_field, context)
            # If color lookup fails, return empty string (no color tile)
            return color_result if color_result else ""
        
        if source not in context:
            return "???"  # Source not available (API failed, not configured, etc.)
        
        # Navigate to the field, supporting array access
        value = context[source]
        for part in parts[1:]:
            if isinstance(value, dict):
                value = value.get(part, value.get(part.lower()))
                if value is None:
                    return "???"  # Field not found in data
            elif isinstance(value, list):
                # Handle array access: stations.0 or stations[0]
                try:
                    # Try to parse as integer index
                    if part.isdigit():
                        index = int(part)
                        if 0 <= index < len(value):
                            value = value[index]
                        else:
                            return "???"  # Index out of range
                    else:
                        # Try bracket notation: stations[0]
                        if '[' in part and ']' in part:
                            index_str = part[part.index('[') + 1:part.index(']')]
                            index = int(index_str)
                            if 0 <= index < len(value):
                                value = value[index]
                            else:
                                return "???"  # Index out of range
                        else:
                            return "???"  # Invalid array access
                except (ValueError, IndexError):
                    return "???"  # Invalid index
            else:
                return "???"  # Invalid path
        
        # Convert to string
        if value is None:
            return "???"  # Null value
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
            "star_trek": "star_trek_quotes",
            "guest_wifi": "guest_wifi",
            "air_fog": "air_fog",
            "muni": "muni",
            "surf": "surf",
            "baywheels": "baywheels",
            "traffic": "traffic",
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
        e.g., {{red}} -> {63} (single brackets so VAR_PATTERN won't match them)
        """
        def replace_color(match):
            color = match.group(1).lower()
            if color.isdigit():
                return f"{{{color}}}"
            code = COLOR_CODES.get(color)
            if code:
                return f"{{{code}}}"
            return match.group(0)
        
        return COLOR_PATTERN.sub(replace_color, template)
    
    def _extract_alignment(self, line: str) -> tuple:
        """Extract alignment directive from a line.
        
        Args:
            line: Template line that may start with {left}, {center}, or {right}
            
        Returns:
            Tuple of (alignment, content) where alignment is 'left', 'center', or 'right'
        """
        match = ALIGNMENT_PATTERN.match(line)
        if match:
            alignment = match.group(1).lower()
            content = line[match.end():]
            return (alignment, content)
        return ('left', line)
    
    def _apply_alignment(self, text: str, alignment: str, width: int = 22) -> str:
        """Apply alignment to rendered text.
        
        Args:
            text: Rendered text (may contain color markers)
            alignment: 'left', 'center', or 'right'
            width: Target width (default 22 for Vestaboard)
            
        Returns:
            Text padded/aligned to the specified width
        """
        # Calculate actual tile count (color markers count as 1 tile)
        tile_count = self._count_tiles(text)
        
        if tile_count >= width:
            # Already at or over width, truncate
            return self._truncate_to_tiles(text, width)
        
        padding_needed = width - tile_count
        
        if alignment == 'center':
            left_pad = padding_needed // 2
            right_pad = padding_needed - left_pad
            return ' ' * left_pad + text + ' ' * right_pad
        elif alignment == 'right':
            return ' ' * padding_needed + text
        else:  # left (default)
            return text + ' ' * padding_needed
    
    def _process_fill_space(self, text: str, width: int = 22) -> str:
        """Process fill_space markers, expanding them to fill available space.
        
        If multiple fill_space markers exist, space is distributed evenly.
        The fill_space markers are represented by the special marker '\x00FILL_SPACE\x00'
        after variable substitution.
        
        Args:
            text: Rendered text with fill_space markers
            width: Target width (default 22 for Vestaboard)
            
        Returns:
            Text with fill_space markers replaced by appropriate padding
        """
        # The fill_space marker after variable substitution
        FILL_MARKER = '\x00FILL_SPACE\x00'
        
        # Count fill_space markers
        fill_count = text.count(FILL_MARKER)
        if fill_count == 0:
            return text
        
        # Calculate text width without fill_space markers
        text_without_fills = text.replace(FILL_MARKER, '')
        tile_count = self._count_tiles(text_without_fills)
        
        if tile_count >= width:
            # No room for fills, remove them
            return self._truncate_to_tiles(text_without_fills, width)
        
        # Calculate space to distribute
        total_fill_space = width - tile_count
        base_fill = total_fill_space // fill_count
        extra = total_fill_space % fill_count
        
        # Replace each fill_space marker with calculated padding
        result = text
        for i in range(fill_count):
            # Distribute extra space to earlier fills
            fill_width = base_fill + (1 if i < extra else 0)
            result = result.replace(FILL_MARKER, ' ' * fill_width, 1)
        
        return result
    
    def get_available_variables(self) -> Dict[str, List[str]]:
        """Get list of all available template variables by source.
        
        Only returns variables from sources that are actually configured
        and can provide data (not null/unavailable).
        
        Returns:
            Dict mapping source names to lists of field names
        """
        # Check which sources are actually available
        available_sources = self._get_available_sources()
        
        # Filter to only include variables from available sources
        filtered = {}
        for source, fields in AVAILABLE_VARIABLES.items():
            if source in available_sources:
                filtered[source] = fields
        
        return filtered
    
    def _get_available_sources(self) -> List[str]:
        """Check which data sources are configured (even if temporarily unavailable).
        
        Returns sources that are configured, regardless of whether they can currently
        return data. This allows users to see available template variables even if
        an API is temporarily down or not yet configured.
        
        Returns:
            List of source names that are configured
        """
        available = []
        sources = ["weather", "datetime", "home_assistant", "star_trek", "guest_wifi", "air_fog", "muni", "surf", "baywheels", "traffic"]
        
        for source in sources:
            try:
                result = self.display_service.get_display(source)
                # Include if source is configured (available=True), even if it can't return data right now
                # This allows users to see what variables are available for configuration
                if result.available:
                    available.append(source)
            except Exception as e:
                logger.debug(f"Source {source} not configured: {e}")
        
        return available
    
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
                    "air_fog": "air_fog",
                    "muni": "muni",
                    "surf": "surf",
                    "baywheels": "baywheels",
                    "traffic": "traffic",
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
        
        Only returns lengths for variables from sources that are actually available.
        
        Returns:
            Dict mapping variable names to max lengths
        """
        # Check which sources are actually available
        available_sources = self._get_available_sources()
        
        # Filter to only include max lengths for available sources
        filtered = {}
        for var_name, max_len in VARIABLE_MAX_LENGTHS.items():
            # Extract source from variable name (e.g., "weather.temperature" -> "weather")
            source = var_name.split('.')[0]
            if source in available_sources:
                filtered[var_name] = max_len
        
        return filtered
    
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


def reset_template_engine() -> None:
    """Reset the template engine singleton to force reinitialization.
    
    This should be called when configuration changes to ensure
    the template engine picks up updated settings.
    """
    global _template_engine
    if _template_engine is not None:
        _template_engine.reset_cache()
    logger.info("Template engine reset")

