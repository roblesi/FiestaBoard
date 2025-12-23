"""Message formatting for Vestaboard display."""

import logging
from typing import Optional, Dict, List
from ..vestaboard_chars import get_weather_symbol

logger = logging.getLogger(__name__)


class MessageFormatter:
    """Formats data for Vestaboard 6x22 character grid."""
    
    MAX_ROWS = 6
    MAX_COLS = 22
    
    def __init__(self):
        """Initialize message formatter."""
        pass
    
    def format_weather(self, weather_data: Dict) -> str:
        """
        Format weather data for display with weather symbols.
        
        Args:
            weather_data: Dictionary with weather information
            
        Returns:
            Formatted string (max 6 lines)
        """
        if not weather_data:
            return "Weather: Unavailable"
        
        lines = []
        
        # Get weather symbol
        condition = weather_data.get("condition", "Unknown")
        weather_symbol_info = get_weather_symbol(condition)
        symbol = weather_symbol_info.get("symbol", "?")
        
        # Location and condition with symbol
        location = weather_data.get("location", "Weather")
        # Format: "Location: * Sunny" or "Location: / Rainy"
        condition_display = weather_symbol_info.get("description", condition)
        lines.append(f"{location}: {symbol} {condition_display}")
        
        # Temperature
        temp = int(weather_data.get("temperature", 0))
        feels_like = int(weather_data.get("feels_like", temp))
        if temp == feels_like:
            lines.append(f"Temp: {temp}°F")
        else:
            lines.append(f"Temp: {temp}°F (feels {feels_like}°F)")
        
        # Additional info
        humidity = weather_data.get("humidity")
        wind = weather_data.get("wind_mph")
        
        info_parts = []
        if humidity is not None:
            info_parts.append(f"Humidity: {humidity}%")
        if wind is not None:
            info_parts.append(f"Wind: {int(wind)} mph")
        
        if info_parts:
            lines.append(" | ".join(info_parts))
        
        # Ensure we don't exceed 6 rows
        return "\n".join(lines[:self.MAX_ROWS])
    
    def format_datetime(self, datetime_data: Dict) -> str:
        """
        Format datetime data for display.
        
        Args:
            datetime_data: Dictionary with datetime information
            
        Returns:
            Formatted string (max 6 lines)
        """
        if not datetime_data:
            return "Date/Time: Unavailable"
        
        lines = []
        
        # Day of week and date
        day = datetime_data.get("day_of_week", "")
        date = datetime_data.get("date", "")
        if day and date:
            lines.append(f"{day}, {date}")
        else:
            lines.append(date or day)
        
        # Time with timezone
        time_str = datetime_data.get("time", "")
        tz_abbr = datetime_data.get("timezone_abbr", "")
        if time_str:
            if tz_abbr:
                lines.append(f"{time_str} {tz_abbr}")
            else:
                lines.append(time_str)
        
        return "\n".join(lines[:self.MAX_ROWS])
    
    def format_apple_music(self, music_data: Dict) -> str:
        """
        Format Apple Music now playing data for display.
        
        Args:
            music_data: Dictionary with music information
            
        Returns:
            Formatted string (max 6 lines)
        """
        if not music_data:
            return "Music: Not Playing"
        
        lines = []
        
        # Header
        lines.append("Now Playing:")
        
        # Artist and Track
        artist = music_data.get("artist", "")
        track = music_data.get("track", "")
        
        if artist and track:
            # Try to fit both on one line
            combined = f"{artist} - {track}"
            if len(combined) <= self.MAX_COLS:
                lines.append(combined)
            else:
                # Split across lines
                lines.append(artist[:self.MAX_COLS])
                lines.append(track[:self.MAX_COLS])
        elif track:
            lines.append(track[:self.MAX_COLS])
        elif artist:
            lines.append(artist[:self.MAX_COLS])
        
        # Album (optional, if space)
        album = music_data.get("album", "")
        if album and len(lines) < self.MAX_ROWS:
            lines.append(f"Album: {album}"[:self.MAX_COLS])
        
        return "\n".join(lines[:self.MAX_ROWS])
    
    def format_guest_wifi(self, ssid: str, password: str) -> str:
        """
        Format guest WiFi credentials for display.
        
        Args:
            ssid: WiFi network name (SSID)
            password: WiFi password
            
        Returns:
            Formatted string (max 6 lines)
        """
        lines = []
        
        # Header with green color (welcoming)
        lines.append("{66}Guest WiFi"[:self.MAX_COLS + 4])
        lines.append("")
        
        # SSID with blue color
        lines.append(f"SSID: {{67}}{ssid}"[:self.MAX_COLS + 4])
        
        # Password with violet color (to distinguish from SSID)
        lines.append(f"Password: {{68}}{password}"[:self.MAX_COLS + 4])
        
        # Ensure we don't exceed 6 rows
        result = "\n".join(lines[:self.MAX_ROWS])
        
        # Truncate each line to 22 characters if needed
        result_lines = result.split("\n")
        truncated = [line[:self.MAX_COLS] for line in result_lines]
        
        return "\n".join(truncated)
    
    def format_star_trek_quote(self, quote_data: Dict) -> str:
        """
        Format Star Trek quote for display.
        
        Args:
            quote_data: Dictionary with 'quote', 'character', and 'series' keys
            
        Returns:
            Formatted string (max 6 lines)
        """
        lines = []
        
        quote = quote_data.get("quote", "")
        character = quote_data.get("character", "")
        series = quote_data.get("series", "").upper()
        
        # Series name mapping with colors
        # TNG = Yellow (classic gold uniforms)
        # Voyager = Blue (blue/teal uniforms)
        # DS9 = Red (command red)
        series_info = {
            "tng": {"name": "TNG", "color": "{65}"},      # Yellow
            "voyager": {"name": "VOY", "color": "{67}"},  # Blue
            "ds9": {"name": "DS9", "color": "{63}"}       # Red
        }
        series_data = series_info.get(series.lower(), {"name": series, "color": ""})
        series_display = series_data["name"]
        series_color = series_data["color"]
        
        # Split quote into lines that fit
        quote_lines = self.split_into_lines(quote, max_lines=4)
        lines.extend(quote_lines)
        
        # Add separator if we have room
        if len(lines) < self.MAX_ROWS - 1:
            lines.append("")
        
        # Add attribution if we have room
        if len(lines) < self.MAX_ROWS:
            attribution = f"- {character}"
            if len(lines) < self.MAX_ROWS - 1:
                # Room for both character and series
                lines.append(attribution[:self.MAX_COLS])
                if series_display:
                    # Add series with color
                    lines.append(f"  {series_color}{series_display}"[:self.MAX_COLS + 4])
            else:
                # Only room for one line - combine
                lines.append(f"- {character} ({series_color}{series_display})"[:self.MAX_COLS + 4])
        
        # Ensure we don't exceed 6 rows
        result = "\n".join(lines[:self.MAX_ROWS])
        
        # Truncate each line to 22 characters if needed
        result_lines = result.split("\n")
        truncated = [line[:self.MAX_COLS] for line in result_lines]
        
        return "\n".join(truncated)
    
    def format_house_status(self, status_data: Dict[str, Dict]) -> str:
        """
        Format house status from Home Assistant.
        
        Args:
            status_data: Dictionary mapping entity names to status info
                        Example: {"Front Door": {"state": "on", ...}, ...}
            
        Returns:
            Formatted string (max 6 lines)
        """
        lines = []
        
        # Header
        lines.append("House Status")
        
        # Process each entity
        for name, info in status_data.items():
            if len(lines) >= self.MAX_ROWS:
                break
            
            state = info.get("state", "unknown").lower()
            error = info.get("error", False)
            entity_id = info.get("entity_id", "")
            
            # Determine status indicator and friendly text
            # For binary_sensor: "on" = open/active (red), "off" = closed/inactive (green)
            # For cover: "open" = open (red), "closed" = closed (green)
            # For lock: "unlocked" = unlocked (red), "locked" = locked (green)
            
            if error or state == "unavailable":
                indicator = "{65}"  # Yellow - warning/unknown
                status_text = "unavailable"
            elif state in ["on", "open", "unlocked"]:
                indicator = "{63}"  # Red - needs attention
                # Convert to friendly text
                if state == "on":
                    # For binary sensors, "on" usually means open/active
                    if "door" in entity_id.lower() or "window" in entity_id.lower():
                        status_text = "open"
                    else:
                        status_text = "on"
                else:
                    status_text = state
            elif state in ["off", "closed", "locked"]:
                indicator = "{66}"  # Green - secure/good
                # Convert to friendly text
                if state == "off":
                    # For binary sensors, "off" usually means closed/inactive
                    if "door" in entity_id.lower() or "window" in entity_id.lower():
                        status_text = "closed"
                    else:
                        status_text = "off"
                else:
                    status_text = state
            else:
                indicator = "{65}"  # Yellow - unknown state
                status_text = state
            
            # Format: "Name: status {color}"
            # Color codes take 4 chars in text format: {63}
            # Truncate name if needed to fit
            max_name_len = self.MAX_COLS - len(f": {status_text} {{63}}")
            display_name = name[:max_name_len] if len(name) > max_name_len else name
            
            line = f"{display_name}: {status_text} {indicator}"
            lines.append(line[:self.MAX_COLS + 4])  # +4 for color code format
        
        # Ensure we don't exceed 6 rows
        result = "\n".join(lines[:self.MAX_ROWS])
        
        # Truncate each line to 22 characters if needed
        result_lines = result.split("\n")
        truncated = [line[:self.MAX_COLS] for line in result_lines]
        
        return "\n".join(truncated)
    
    def format_combined(self, weather_data: Optional[Dict], 
                       datetime_data: Optional[Dict]) -> str:
        """
        Format combined weather and datetime display.
        
        Args:
            weather_data: Weather information dictionary
            datetime_data: Datetime information dictionary
            
        Returns:
            Combined formatted string (max 6 lines)
        """
        lines = []
        
        # Date/Time header
        if datetime_data:
            day = datetime_data.get("day_of_week", "")
            date = datetime_data.get("date", "")
            time_str = datetime_data.get("time", "")
            
            if day and date:
                lines.append(f"{day}, {date}")
            elif date:
                lines.append(date)
            
            if time_str:
                lines.append(time_str)
            
            # Add separator if we have weather
            if weather_data and len(lines) < self.MAX_ROWS:
                lines.append("")
        
        # Weather information
        if weather_data:
            location = weather_data.get("location", "Weather")
            condition = weather_data.get("condition", "Unknown")
            temp = int(weather_data.get("temperature", 0))
            
            # Get weather symbol
            weather_symbol_info = get_weather_symbol(condition)
            symbol = weather_symbol_info.get("symbol", "?")
            condition_display = weather_symbol_info.get("description", condition)
            
            # Get color for temperature
            temp_color = self._get_temp_color(temp)
            
            # Compact format to fit
            if len(lines) + 2 <= self.MAX_ROWS:
                lines.append(f"{location}: {symbol} {condition_display}")
                lines.append(f"Temp: {temp_color}{temp}°F")
            elif len(lines) + 1 <= self.MAX_ROWS:
                # Very compact
                lines.append(f"{location}: {symbol} {temp_color}{temp}°F")
        
        # Ensure we don't exceed 6 rows
        result = "\n".join(lines[:self.MAX_ROWS])
        
        # Truncate each line to 22 characters if needed
        result_lines = result.split("\n")
        truncated = [line[:self.MAX_COLS] for line in result_lines]
        
        return "\n".join(truncated)
    
    def _get_temp_color(self, temp: int) -> str:
        """
        Get color code for temperature display.
        
        Args:
            temp: Temperature in Fahrenheit
            
        Returns:
            Color code string (e.g., "{63}" for red)
        """
        if temp >= 90:
            return "{63}"  # Red - very hot
        elif temp >= 80:
            return "{64}"  # Orange - hot
        elif temp >= 70:
            return "{65}"  # Yellow - warm
        elif temp >= 60:
            return "{66}"  # Green - comfortable
        elif temp >= 45:
            return "{67}"  # Blue - cool
        else:
            return "{68}"  # Violet - cold
    
    def split_into_lines(self, text: str, max_lines: int = MAX_ROWS) -> List[str]:
        """
        Split text into lines, respecting max length.
        
        Args:
            text: Text to split
            max_lines: Maximum number of lines
            
        Returns:
            List of lines (each max 22 characters)
        """
        lines = text.split("\n")
        result = []
        
        for line in lines[:max_lines]:
            # If line is too long, try to split on spaces
            if len(line) > self.MAX_COLS:
                words = line.split()
                current_line = ""
                
                for word in words:
                    if len(current_line) + len(word) + 1 <= self.MAX_COLS:
                        if current_line:
                            current_line += " " + word
                        else:
                            current_line = word
                    else:
                        if current_line:
                            result.append(current_line)
                        current_line = word
                
                if current_line:
                    result.append(current_line)
            else:
                result.append(line)
        
        return result[:max_lines]


def get_message_formatter() -> MessageFormatter:
    """Get message formatter instance."""
    return MessageFormatter()

