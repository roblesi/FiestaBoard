"""Date and time data source."""

import logging
from datetime import datetime
from typing import Dict
import pytz
from ..config import Config

logger = logging.getLogger(__name__)


class DateTimeSource:
    """Provides current date and time information."""
    
    def __init__(self, timezone: str = "America/Los_Angeles"):
        """
        Initialize datetime source.
        
        Args:
            timezone: Timezone name (e.g., "America/Los_Angeles")
        """
        try:
            self.timezone = pytz.timezone(timezone)
        except pytz.exceptions.UnknownTimeZoneError:
            logger.warning(f"Unknown timezone: {timezone}, using UTC")
            self.timezone = pytz.UTC
    
    def get_current_datetime(self) -> Dict[str, str]:
        """
        Get current date and time information.
        
        Returns:
            Dictionary with formatted date and time strings
        """
        now = datetime.now(self.timezone)
        
        return {
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M"),
            "datetime": now.strftime("%Y-%m-%d %H:%M"),
            "day_of_week": now.strftime("%A"),
            "timezone_abbr": now.strftime("%Z"),
        }
    
    def format_for_display(self, format_string: str = "%Y-%m-%d %H:%M %Z") -> str:
        """
        Format current datetime for display.
        
        Args:
            format_string: strftime format string
            
        Returns:
            Formatted datetime string
        """
        now = datetime.now(self.timezone)
        return now.strftime(format_string)


def get_datetime_source() -> DateTimeSource:
    """Get configured datetime source instance."""
    return DateTimeSource(timezone=Config.TIMEZONE)

