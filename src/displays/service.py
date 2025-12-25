"""Display service for managing individual display sources.

This module provides a clean interface to fetch formatted and raw data
from each display source (weather, datetime, home_assistant, etc.).
"""

import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

from ..config import Config
from ..data_sources.weather import get_weather_source
from ..data_sources.datetime import get_datetime_source
from ..data_sources.apple_music import get_apple_music_source
from ..data_sources.home_assistant import get_home_assistant_source
from ..data_sources.star_trek_quotes import get_star_trek_quotes_source
<<<<<<< HEAD
from ..data_sources.air_fog import get_air_fog_source
from ..data_sources.muni import get_muni_source
from ..data_sources.surf import get_surf_source
from ..data_sources.baywheels import get_baywheels_source
from ..data_sources.traffic import get_traffic_source
from ..formatters.message_formatter import get_message_formatter

logger = logging.getLogger(__name__)

# Available display types
DISPLAY_TYPES = [
    "weather",
    "datetime",
    "weather_datetime",  # Combined view
    "home_assistant",
    "apple_music",
    "star_trek",
    "guest_wifi",
<<<<<<< HEAD
    "air_fog",
    "muni",
    "surf",
    "baywheels",
    "traffic",
]


@dataclass
class DisplayResult:
    """Result from fetching a display."""
    display_type: str
    formatted: str
    raw: Dict[str, Any]
    available: bool
    error: Optional[str] = None


class DisplayService:
    """Service for fetching individual display sources.
    
    Provides methods to:
    - List available display types
    - Get formatted output for a specific type
    - Get raw data from a source
    """
    
    def __init__(self):
        """Initialize display service with all data sources."""
        self.formatter = get_message_formatter()
        
        # Initialize data sources
        self.weather_source = get_weather_source()
        self.datetime_source = get_datetime_source()
        self.apple_music_source = get_apple_music_source()
        self.home_assistant_source = get_home_assistant_source()
        self.star_trek_quotes_source = get_star_trek_quotes_source()
<<<<<<< HEAD
        self.air_fog_source = get_air_fog_source()
        self.muni_source = get_muni_source()
        self.surf_source = get_surf_source()
        self.baywheels_source = get_baywheels_source()
        self.traffic_source = get_traffic_source()
        
        logger.info("DisplayService initialized")
    
    def get_available_displays(self) -> List[Dict[str, Any]]:
        """Get list of available display types with their status.
        
        Returns:
            List of display info dictionaries with:
            - type: Display type name
            - available: Whether the source is configured/available
            - description: Human-readable description
        """
        displays = [
            {
                "type": "weather",
                "available": self.weather_source is not None,
                "description": "Current weather conditions and temperature",
            },
            {
                "type": "datetime",
                "available": self.datetime_source is not None,
                "description": "Current date and time",
            },
            {
                "type": "weather_datetime",
                "available": self.weather_source is not None or self.datetime_source is not None,
                "description": "Combined weather and date/time display",
            },
            {
                "type": "home_assistant",
                "available": self.home_assistant_source is not None and Config.HOME_ASSISTANT_ENABLED,
                "description": "Home Assistant entity status",
            },
            {
                "type": "apple_music",
                "available": self.apple_music_source is not None and Config.APPLE_MUSIC_ENABLED,
                "description": "Currently playing music from Apple Music",
            },
            {
                "type": "star_trek",
                "available": self.star_trek_quotes_source is not None and Config.STAR_TREK_QUOTES_ENABLED,
                "description": "Random Star Trek quote",
            },
            {
                "type": "guest_wifi",
                "available": Config.GUEST_WIFI_ENABLED and bool(Config.GUEST_WIFI_SSID),
                "description": "Guest WiFi credentials",
            },
            {
<<<<<<< HEAD
<<<<<<< HEAD
                "type": "air_fog",
                "available": self.air_fog_source is not None and Config.AIR_FOG_ENABLED,
                "description": "Air quality and fog conditions",
            },
            {
                "type": "muni",
                "available": self.muni_source is not None and Config.MUNI_ENABLED,
                "description": "Real-time Muni transit arrivals",
            },
            {
                "type": "surf",
                "available": self.surf_source is not None and Config.SURF_ENABLED,
                "description": "Ocean Beach surf conditions",
            },
            {
                "type": "baywheels",
                "available": self.baywheels_source is not None and Config.BAYWHEELS_ENABLED,
                "description": "Bay Wheels bike availability",
            },
            {
                "type": "traffic",
                "available": self.traffic_source is not None and Config.TRAFFIC_ENABLED,
                "description": "Traffic conditions to destination",
            },
        ]
        return displays
    
    def get_display(self, display_type: str) -> DisplayResult:
        """Get formatted and raw data for a specific display type.
        
        Args:
            display_type: One of DISPLAY_TYPES
            
        Returns:
            DisplayResult with formatted text and raw data
        """
        if display_type not in DISPLAY_TYPES:
            return DisplayResult(
                display_type=display_type,
                formatted="",
                raw={},
                available=False,
                error=f"Unknown display type: {display_type}. Valid types: {DISPLAY_TYPES}"
            )
        
        try:
            if display_type == "weather":
                return self._get_weather()
            elif display_type == "datetime":
                return self._get_datetime()
            elif display_type == "weather_datetime":
                return self._get_weather_datetime()
            elif display_type == "home_assistant":
                return self._get_home_assistant()
            elif display_type == "apple_music":
                return self._get_apple_music()
            elif display_type == "star_trek":
                return self._get_star_trek()
            elif display_type == "guest_wifi":
                return self._get_guest_wifi()
<<<<<<< HEAD
<<<<<<< HEAD
            elif display_type == "air_fog":
                return self._get_air_fog()
            elif display_type == "muni":
                return self._get_muni()
            elif display_type == "surf":
                return self._get_surf()
            elif display_type == "baywheels":
                return self._get_baywheels()
            elif display_type == "traffic":
                return self._get_traffic()
            else:
                return DisplayResult(
                    display_type=display_type,
                    formatted="",
                    raw={},
                    available=False,
                    error=f"Display type not implemented: {display_type}"
                )
        except Exception as e:
            logger.error(f"Error fetching display {display_type}: {e}", exc_info=True)
            return DisplayResult(
                display_type=display_type,
                formatted="",
                raw={},
                available=False,
                error=str(e)
            )
    
    def _get_weather(self) -> DisplayResult:
        """Get weather display."""
        if not self.weather_source:
            return DisplayResult(
                display_type="weather",
                formatted="",
                raw={},
                available=False,
                error="Weather source not configured"
            )
        
        raw_data = self.weather_source.fetch_current_weather()
        if not raw_data:
            return DisplayResult(
                display_type="weather",
                formatted="Weather: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch weather data"
            )
        
        formatted = self.formatter.format_weather(raw_data)
        return DisplayResult(
            display_type="weather",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_datetime(self) -> DisplayResult:
        """Get datetime display."""
        if not self.datetime_source:
            return DisplayResult(
                display_type="datetime",
                formatted="",
                raw={},
                available=False,
                error="DateTime source not configured"
            )
        
        raw_data = self.datetime_source.get_current_datetime()
        if not raw_data:
            return DisplayResult(
                display_type="datetime",
                formatted="Date/Time: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch datetime data"
            )
        
        formatted = self.formatter.format_datetime(raw_data)
        return DisplayResult(
            display_type="datetime",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_weather_datetime(self) -> DisplayResult:
        """Get combined weather and datetime display."""
        weather_data = None
        datetime_data = None
        
        if self.weather_source:
            weather_data = self.weather_source.fetch_current_weather()
        
        if self.datetime_source:
            datetime_data = self.datetime_source.get_current_datetime()
        
        if not weather_data and not datetime_data:
            return DisplayResult(
                display_type="weather_datetime",
                formatted="No data available",
                raw={},
                available=False,
                error="Both weather and datetime unavailable"
            )
        
        formatted = self.formatter.format_combined(weather_data, datetime_data)
        raw = {
            "weather": weather_data or {},
            "datetime": datetime_data or {}
        }
        
        return DisplayResult(
            display_type="weather_datetime",
            formatted=formatted,
            raw=raw,
            available=True
        )
    
    def _get_home_assistant(self) -> DisplayResult:
        """Get Home Assistant display."""
        if not self.home_assistant_source or not Config.HOME_ASSISTANT_ENABLED:
            return DisplayResult(
                display_type="home_assistant",
                formatted="",
                raw={},
                available=False,
                error="Home Assistant not configured or disabled"
            )
        
        entities = Config.get_ha_entities()
        raw_data = self.home_assistant_source.get_house_status(entities)
        
        if not raw_data:
            return DisplayResult(
                display_type="home_assistant",
                formatted="House Status: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch Home Assistant data"
            )
        
        formatted = self.formatter.format_house_status(raw_data)
        return DisplayResult(
            display_type="home_assistant",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_apple_music(self) -> DisplayResult:
        """Get Apple Music display."""
        if not self.apple_music_source or not Config.APPLE_MUSIC_ENABLED:
            return DisplayResult(
                display_type="apple_music",
                formatted="",
                raw={},
                available=False,
                error="Apple Music not configured or disabled"
            )
        
        raw_data = self.apple_music_source.fetch_now_playing()
        
        if not raw_data:
            return DisplayResult(
                display_type="apple_music",
                formatted="Music: Not Playing",
                raw={"playing": False},
                available=True
            )
        
        formatted = self.formatter.format_apple_music(raw_data)
        return DisplayResult(
            display_type="apple_music",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_star_trek(self) -> DisplayResult:
        """Get Star Trek quote display."""
        if not self.star_trek_quotes_source or not Config.STAR_TREK_QUOTES_ENABLED:
            return DisplayResult(
                display_type="star_trek",
                formatted="",
                raw={},
                available=False,
                error="Star Trek quotes not configured or disabled"
            )
        
        raw_data = self.star_trek_quotes_source.get_random_quote()
        
        if not raw_data:
            return DisplayResult(
                display_type="star_trek",
                formatted="Quote: Unavailable",
                raw={},
                available=True,
                error="Failed to get Star Trek quote"
            )
        
        formatted = self.formatter.format_star_trek_quote(raw_data)
        return DisplayResult(
            display_type="star_trek",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_surf(self) -> DisplayResult:
        """Get surf conditions display."""
        if not self.surf_source or not Config.SURF_ENABLED:
            return DisplayResult(
                display_type="surf",
                formatted="",
                raw={},
                available=False,
                error="Surf source not configured or not enabled"
            )
        
        raw_data = self.surf_source.fetch_surf_data()
        if not raw_data:
            return DisplayResult(
                display_type="surf",
                formatted="Surf: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch surf data"
            )
        
        formatted = raw_data.get("formatted_message", "")
        if not formatted:
            # Build a simple formatted message if not provided
            wave_height = raw_data.get("wave_height", 0)
            quality = raw_data.get("quality", "UNKNOWN")
            formatted = f"WAVES: {wave_height}FT {quality}"
        
        return DisplayResult(
            display_type="surf",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_guest_wifi(self) -> DisplayResult:
        """Get Guest WiFi display."""
        if not Config.GUEST_WIFI_ENABLED:
            return DisplayResult(
                display_type="guest_wifi",
                formatted="",
                raw={},
                available=False,
                error="Guest WiFi not enabled"
            )
        
        if not Config.GUEST_WIFI_SSID or not Config.GUEST_WIFI_PASSWORD:
            return DisplayResult(
                display_type="guest_wifi",
                formatted="",
                raw={},
                available=False,
                error="Guest WiFi SSID or password not configured"
            )
        
        raw_data = {
            "ssid": Config.GUEST_WIFI_SSID,
            "password": Config.GUEST_WIFI_PASSWORD
        }
        
        formatted = self.formatter.format_guest_wifi(
            Config.GUEST_WIFI_SSID,
            Config.GUEST_WIFI_PASSWORD
        )
        
        return DisplayResult(
            display_type="guest_wifi",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
<<<<<<< HEAD
    def _get_air_fog(self) -> DisplayResult:
        """Get air quality and fog conditions display."""
        if not self.air_fog_source or not Config.AIR_FOG_ENABLED:
            return DisplayResult(
                display_type="air_fog",
                formatted="",
                raw={},
                available=False,
                error="Air/Fog source not configured or not enabled"
            )
        
        raw_data = self.air_fog_source.fetch_air_fog_data()
        if not raw_data:
            return DisplayResult(
                display_type="air_fog",
                formatted="Air/Fog: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch air/fog data"
=======
    def _get_traffic(self) -> DisplayResult:
        """Get traffic conditions display."""
        if not self.traffic_source or not Config.TRAFFIC_ENABLED:
            return DisplayResult(
                display_type="traffic",
                formatted="",
                raw={},
                available=False,
                error="Traffic source not configured or not enabled"
            )
        
        raw_data = self.traffic_source.fetch_traffic_data()
        if not raw_data:
            return DisplayResult(
                display_type="traffic",
                formatted="Traffic: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch traffic data"
>>>>>>> origin/feature/traffic-integration
            )
        
        formatted = raw_data.get("formatted_message", "")
        if not formatted:
            # Build a simple formatted message if not provided
<<<<<<< HEAD
            aqi = raw_data.get("pm2_5_aqi", "?")
            fog_status = raw_data.get("fog_status", "UNKNOWN")
            formatted = f"AQI:{aqi} {fog_status}"
        
        return DisplayResult(
            display_type="air_fog",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_muni(self) -> DisplayResult:
        """Get Muni transit display."""
        if not self.muni_source or not Config.MUNI_ENABLED:
            return DisplayResult(
                display_type="muni",
                formatted="",
                raw={},
                available=False,
                error="Muni transit not configured or disabled"
            )
        
        raw_data = self.muni_source.fetch_arrivals()
        
        if not raw_data:
            return DisplayResult(
                display_type="muni",
                formatted="Muni: No arrivals",
                raw={},
                available=True,
                error="Failed to fetch Muni data"
            )
        
        formatted = self.formatter.format_muni(raw_data)
        return DisplayResult(
            display_type="muni",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_surf(self) -> DisplayResult:
        """Get surf conditions display."""
        if not self.surf_source or not Config.SURF_ENABLED:
            return DisplayResult(
                display_type="surf",
                formatted="",
                raw={},
                available=False,
                error="Surf source not configured or not enabled"
            )
        
        raw_data = self.surf_source.fetch_surf_data()
        if not raw_data:
            return DisplayResult(
                display_type="surf",
                formatted="Surf: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch surf data"
            )
        
        formatted = raw_data.get("formatted_message", "")
        if not formatted:
            # Build a simple formatted message if not provided
            wave_height = raw_data.get("wave_height", 0)
            quality = raw_data.get("quality", "UNKNOWN")
            formatted = f"WAVES: {wave_height}FT {quality}"
        
        return DisplayResult(
            display_type="surf",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_baywheels(self) -> DisplayResult:
        """Get Bay Wheels display."""
        if not self.baywheels_source or not Config.BAYWHEELS_ENABLED:
            return DisplayResult(
                display_type="baywheels",
                formatted="",
                raw={},
                available=False,
                error="Bay Wheels not configured or disabled"
            )
        
        raw_data = self.baywheels_source.fetch_station_status()
        
        if not raw_data:
            return DisplayResult(
                display_type="baywheels",
                formatted="Bay Wheels: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch Bay Wheels data"
            )
        
        # Format the display using the configured station name
        station_name = Config.BAYWHEELS_STATION_NAME or raw_data.get("station_name", "STATION")
        electric = raw_data.get("electric_bikes", 0)
        total = raw_data.get("num_bikes_available", 0)
        
        formatted = f"E-BIKES @ {station_name}: {electric} (Total: {total})"
        
        return DisplayResult(
            display_type="baywheels",
            formatted=formatted,
            raw=raw_data,
            available=True
        )
    
    def _get_traffic(self) -> DisplayResult:
        """Get traffic conditions display."""
        if not self.traffic_source or not Config.TRAFFIC_ENABLED:
            return DisplayResult(
                display_type="traffic",
                formatted="",
                raw={},
                available=False,
                error="Traffic source not configured or not enabled"
            )
        
        raw_data = self.traffic_source.fetch_traffic_data()
        if not raw_data:
            return DisplayResult(
                display_type="traffic",
                formatted="Traffic: Unavailable",
                raw={},
                available=True,
                error="Failed to fetch traffic data"
            )
        
        formatted = raw_data.get("formatted_message", "")
        if not formatted:
            # Build a simple formatted message if not provided
            destination = raw_data.get("destination_name", "?")
            duration = raw_data.get("duration_minutes", "?")
            status = raw_data.get("traffic_status", "UNKNOWN")
            formatted = f"{destination}: {duration}m {status}"
        
        return DisplayResult(
            display_type="traffic",
            formatted=formatted,
            raw=raw_data,
            available=True
        )


# Singleton instance
_display_service: Optional[DisplayService] = None


def get_display_service() -> DisplayService:
    """Get or create the display service singleton."""
    global _display_service
    if _display_service is None:
        _display_service = DisplayService()
    return _display_service

