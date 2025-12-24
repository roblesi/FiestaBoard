"""Template engine for dynamic content generation.

Template syntax:
- Data binding: {{source.field}} e.g., {{weather.temp}}, {{datetime.time}}
- Colors (inline): {red}Text{/red} or {63} for raw color codes
- Symbols: {sun}, {cloud}, {rain}
- Formatting: {{value|pad:3}}, {{value|upper}}, {{value|lower}}

Color codes:
- {red} or {63} - Red tile
- {orange} or {64} - Orange tile
- {yellow} or {65} - Yellow tile
- {green} or {66} - Green tile
- {blue} or {67} - Blue tile
- {violet} or {68} - Violet tile
- {white} or {69} - White tile
- {black} or {70} - Black tile
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
AVAILABLE_VARIABLES = {
    "weather": ["temp", "temperature", "condition", "humidity", "location", "wind_speed"],
    "datetime": ["time", "date", "day", "day_of_week", "month", "year", "hour", "minute"],
    "home_assistant": [],  # Dynamic based on entities
    "apple_music": ["track", "artist", "album", "playing"],
    "star_trek": ["quote", "character", "series"],
    "guest_wifi": ["ssid", "password"],
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
    """
    
    def __init__(self):
        """Initialize template engine."""
        self._display_service = None
        logger.info("TemplateEngine initialized")
    
    @property
    def display_service(self):
        """Lazy-load display service to avoid circular imports."""
        if self._display_service is None:
            from ..displays.service import get_display_service
            self._display_service = get_display_service()
        return self._display_service
    
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
    
    def render_lines(self, template_lines: List[str], context: Optional[Dict[str, Any]] = None) -> str:
        """Render a list of template lines (for template pages).
        
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
        
        # Render each line
        rendered = [self.render(line, context) for line in lines]
        
        # Ensure each line is max 22 chars (Vestaboard width)
        rendered = [line[:22] for line in rendered]
        
        return '\n'.join(rendered)
    
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
        """Replace {{source.field}} variables with values from context."""
        def replace_var(match):
            expr = match.group(1).strip()
            
            # Check for filter: {{value|filter:arg}}
            if '|' in expr:
                var_part, filter_part = expr.split('|', 1)
                value = self._get_variable_value(var_part.strip(), context)
                return self._apply_filter(value, filter_part.strip())
            else:
                return self._get_variable_value(expr, context)
        
        return VAR_PATTERN.sub(replace_var, template)
    
    def _get_variable_value(self, expr: str, context: Dict[str, Any]) -> str:
        """Get value from context using dot notation (source.field)."""
        parts = expr.split('.')
        
        if len(parts) < 2:
            return f"{{{{?{expr}}}}}"  # Invalid expression
        
        source = parts[0].lower()
        
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
            
            # Check line length (Vestaboard is 22 chars wide)
            # Note: This is approximate - colors don't count toward length
            visible_length = len(re.sub(r'\{[^}]*\}', '', line))
            if visible_length > 22:
                errors.append(TemplateError(
                    line=line_num,
                    column=22,
                    message=f"Line may be too long ({visible_length} chars, max 22)"
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

