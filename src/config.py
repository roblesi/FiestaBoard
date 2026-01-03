"""Configuration management for Vestaboard Display Service.

This module provides the Config class which reads settings from the
ConfigManager (JSON file-based storage).
"""

import logging
from typing import Optional, List, Dict

from .config_manager import get_config_manager

logger = logging.getLogger(__name__)


class Config:
    """Application configuration loaded from config.json file.
    
    This class provides class attributes for accessing configuration values.
    Values are read from the ConfigManager which persists to config.json.
    """
    
    # Valid transition strategies
    VALID_TRANSITION_STRATEGIES = [
        "column", "reverse-column", "edges-to-center",
        "row", "diagonal", "random"
    ]
    
    @classmethod
    def _get_cm(cls):
        """Get the config manager instance."""
        return get_config_manager()
    
    @classmethod
    def _get_vestaboard(cls) -> Dict:
        """Get vestaboard config section."""
        return cls._get_cm().get_vestaboard()
    
    @classmethod
    def _get_feature(cls, name: str) -> Dict:
        """Get a feature config section."""
        return cls._get_cm().get_feature(name) or {}
    
    @classmethod
    def _get_general(cls) -> Dict:
        """Get general config section."""
        return cls._get_cm().get_general()
    
    # ==================== Vestaboard API Configuration ====================
    
    @classmethod
    @property
    def VB_API_MODE(cls) -> str:
        """API mode: 'local' or 'cloud'."""
        return cls._get_vestaboard().get("api_mode", "local")
    
    @classmethod
    @property
    def VB_LOCAL_API_KEY(cls) -> str:
        """Local API key."""
        return cls._get_vestaboard().get("local_api_key", "")
    
    @classmethod
    @property
    def VB_READ_WRITE_KEY(cls) -> str:
        """Cloud API read/write key."""
        return cls._get_vestaboard().get("cloud_key", "")
    
    @classmethod
    @property
    def VB_HOST(cls) -> str:
        """Vestaboard host address."""
        return cls._get_vestaboard().get("host", "")
    
    @classmethod
    @property
    def VB_TRANSITION_STRATEGY(cls) -> Optional[str]:
        """Transition animation strategy."""
        return cls._get_vestaboard().get("transition_strategy")
    
    @classmethod
    @property
    def VB_TRANSITION_INTERVAL_MS(cls) -> Optional[int]:
        """Transition step interval in milliseconds."""
        return cls._get_vestaboard().get("transition_interval_ms")
    
    @classmethod
    @property
    def VB_TRANSITION_STEP_SIZE(cls) -> Optional[int]:
        """Transition step size."""
        return cls._get_vestaboard().get("transition_step_size")
    
    @classmethod
    def get_vb_api_key(cls) -> str:
        """Get the appropriate API key based on mode."""
        if cls.VB_API_MODE.lower() == "cloud":
            return cls.VB_READ_WRITE_KEY
        return cls.VB_LOCAL_API_KEY
    
    # ==================== Output Configuration ====================
    
    @classmethod
    @property
    def OUTPUT_TARGET(cls) -> str:
        """Output target: 'ui', 'board', or 'both'."""
        return cls._get_general().get("output_target", "board")
    
    # ==================== Weather Configuration ====================
    
    @classmethod
    @property
    def WEATHER_API_KEY(cls) -> str:
        """Weather API key."""
        return cls._get_feature("weather").get("api_key", "")
    
    @classmethod
    @property
    def WEATHER_PROVIDER(cls) -> str:
        """Weather provider: 'weatherapi' or 'openweathermap'."""
        return cls._get_feature("weather").get("provider", "weatherapi")
    
    @classmethod
    @property
    def WEATHER_LOCATION(cls) -> str:
        """Weather location."""
        return cls._get_feature("weather").get("location", "San Francisco, CA")
    
    @classmethod
    @property
    def WEATHER_LOCATIONS(cls) -> List[Dict[str, str]]:
        """Weather locations to monitor (list of dicts with location and name)."""
        feature_config = cls._get_feature("weather")
        
        # Check for new locations array format
        locations = feature_config.get("locations")
        if locations:
            if isinstance(locations, list):
                return locations
            else:
                return [locations]
        
        # Fallback to old single location format
        location = feature_config.get("location", "")
        if location:
            return [{
                "location": location,
                "name": "HOME"  # Default name
            }]
        
        return []
    
    @classmethod
    @property
    def WEATHER_ENABLED(cls) -> bool:
        """Whether weather is enabled."""
        return cls._get_feature("weather").get("enabled", False)
    
    @classmethod
    @property
    def WEATHER_REFRESH_SECONDS(cls) -> int:
        """Weather data refresh interval in seconds."""
        return cls._get_feature("weather").get("refresh_seconds", 300)
    
    # ==================== DateTime Configuration ====================
    
    @classmethod
    @property
    def TIMEZONE(cls) -> str:
        """Timezone for datetime display."""
        return cls._get_feature("datetime").get("timezone", "America/Los_Angeles")
    
    @classmethod
    @property
    def DATETIME_ENABLED(cls) -> bool:
        """Whether datetime is enabled."""
        return cls._get_feature("datetime").get("enabled", True)
    
    # ==================== General Configuration ====================
    
    @classmethod
    @property
    def GENERAL_TIMEZONE(cls) -> str:
        """General timezone configuration (used as default for all time displays)."""
        return cls._get_general().get("timezone", "America/Los_Angeles")
    
    @classmethod
    @property
    def REFRESH_INTERVAL_SECONDS(cls) -> int:
        """Refresh interval in seconds."""
        return cls._get_general().get("refresh_interval_seconds", 300)
    
    # ==================== Star Trek Quotes Configuration ====================
    
    @classmethod
    @property
    def STAR_TREK_QUOTES_ENABLED(cls) -> bool:
        """Whether Star Trek quotes are enabled."""
        return cls._get_feature("star_trek_quotes").get("enabled", False)
    
    @classmethod
    @property
    def STAR_TREK_QUOTES_RATIO(cls) -> str:
        """Star Trek quotes ratio (TNG:Voyager:DS9)."""
        return cls._get_feature("star_trek_quotes").get("ratio", "3:5:9")
    
    # ==================== Surf Configuration ====================
    
    @classmethod
    @property
    def SURF_ENABLED(cls) -> bool:
        """Whether surf data is enabled."""
        return cls._get_feature("surf").get("enabled", False)
    
    @classmethod
    @property
    def SURF_LATITUDE(cls) -> float:
        """Surf location latitude (default: Ocean Beach, SF)."""
        return cls._get_feature("surf").get("latitude", 37.7599)
    
    @classmethod
    @property
    def SURF_LONGITUDE(cls) -> float:
        """Surf location longitude (default: Ocean Beach, SF)."""
        return cls._get_feature("surf").get("longitude", -122.5121)
    
    @classmethod
    @property
    def SURF_REFRESH_SECONDS(cls) -> int:
        """Surf data refresh interval in seconds."""
        return cls._get_feature("surf").get("refresh_seconds", 600)
    
    # ==================== Guest WiFi Configuration ====================
    
    @classmethod
    @property
    def GUEST_WIFI_ENABLED(cls) -> bool:
        """Whether Guest WiFi display is enabled."""
        return cls._get_feature("guest_wifi").get("enabled", False)
    
    @classmethod
    @property
    def GUEST_WIFI_SSID(cls) -> str:
        """Guest WiFi SSID."""
        return cls._get_feature("guest_wifi").get("ssid", "")
    
    @classmethod
    @property
    def GUEST_WIFI_PASSWORD(cls) -> str:
        """Guest WiFi password."""
        return cls._get_feature("guest_wifi").get("password", "")
    
    @classmethod
    @property
    def GUEST_WIFI_REFRESH_SECONDS(cls) -> int:
        """Guest WiFi refresh interval."""
        return cls._get_feature("guest_wifi").get("refresh_seconds", 60)
    
    # ==================== Home Assistant Configuration ====================
    
    @classmethod
    @property
    def HOME_ASSISTANT_ENABLED(cls) -> bool:
        """Whether Home Assistant is enabled."""
        return cls._get_feature("home_assistant").get("enabled", False)
    
    @classmethod
    @property
    def HOME_ASSISTANT_BASE_URL(cls) -> str:
        """Home Assistant base URL."""
        return cls._get_feature("home_assistant").get("base_url", "")
    
    @classmethod
    @property
    def HOME_ASSISTANT_ACCESS_TOKEN(cls) -> str:
        """Home Assistant access token."""
        return cls._get_feature("home_assistant").get("access_token", "")
    
    @classmethod
    @property
    def HOME_ASSISTANT_ENTITIES(cls) -> str:
        """Home Assistant entities (JSON string for compatibility)."""
        entities = cls._get_feature("home_assistant").get("entities", [])
        import json
        return json.dumps(entities)
    
    @classmethod
    @property
    def HOME_ASSISTANT_TIMEOUT(cls) -> int:
        """Home Assistant request timeout."""
        return cls._get_feature("home_assistant").get("timeout", 5)
    
    @classmethod
    @property
    def HOME_ASSISTANT_REFRESH_SECONDS(cls) -> int:
        """Home Assistant refresh interval."""
        return cls._get_feature("home_assistant").get("refresh_seconds", 30)
    
    # ==================== Air Quality / Fog Configuration ====================
    
    @classmethod
    @property
    def AIR_FOG_ENABLED(cls) -> bool:
        """Whether air quality/fog monitoring is enabled."""
        return cls._get_feature("air_fog").get("enabled", False)
    
    @classmethod
    @property
    def PURPLEAIR_API_KEY(cls) -> str:
        """PurpleAir API key for air quality data."""
        return cls._get_feature("air_fog").get("purpleair_api_key", "")
    
    @classmethod
    @property
    def PURPLEAIR_SENSOR_ID(cls) -> Optional[str]:
        """Optional specific PurpleAir sensor ID."""
        return cls._get_feature("air_fog").get("purpleair_sensor_id")
    
    @classmethod
    @property
    def OPENWEATHERMAP_API_KEY(cls) -> str:
        """OpenWeatherMap API key for visibility/fog data."""
        return cls._get_feature("air_fog").get("openweathermap_api_key", "")
    
    @classmethod
    @property
    def AIR_FOG_LATITUDE(cls) -> float:
        """Latitude for air/fog monitoring."""
        return cls._get_feature("air_fog").get("latitude", 37.7749)
    
    @classmethod
    @property
    def AIR_FOG_LONGITUDE(cls) -> float:
        """Longitude for air/fog monitoring."""
        return cls._get_feature("air_fog").get("longitude", -122.4194)
    
    @classmethod
    @property
    def AIR_FOG_REFRESH_SECONDS(cls) -> int:
        """Air/fog data refresh interval in seconds."""
        return cls._get_feature("air_fog").get("refresh_seconds", 300)
    
    # ==================== Muni Transit Configuration ====================
    
    @classmethod
    @property
    def MUNI_ENABLED(cls) -> bool:
        """Whether Muni transit is enabled."""
        return cls._get_feature("muni").get("enabled", False)
    
    @classmethod
    @property
    def MUNI_API_KEY(cls) -> str:
        """511.org API key."""
        return cls._get_feature("muni").get("api_key", "")
    
    @classmethod
    @property
    def MUNI_STOP_CODE(cls) -> str:
        """Muni stop code to monitor (backward compatibility - returns first code)."""
        stop_codes = cls.MUNI_STOP_CODES
        if stop_codes:
            return stop_codes[0] if isinstance(stop_codes, list) else stop_codes
        # Fallback to old config format
        return cls._get_feature("muni").get("stop_code", "")
    
    @classmethod
    @property
    def MUNI_STOP_CODES(cls) -> List[str]:
        """Muni stop codes to monitor (list)."""
        feature_config = cls._get_feature("muni")
        
        # Check for new stop_codes array format
        stop_codes = feature_config.get("stop_codes")
        if stop_codes:
            if isinstance(stop_codes, list):
                return stop_codes
            else:
                return [stop_codes]
        
        # Fallback to old single stop_code format
        stop_code = feature_config.get("stop_code", "")
        if stop_code:
            return [stop_code]
        
        return []
    
    @classmethod
    @property
    def MUNI_STOP_NAMES(cls) -> List[str]:
        """Muni stop names for display (list)."""
        feature_config = cls._get_feature("muni")
        stop_names = feature_config.get("stop_names", [])
        if isinstance(stop_names, list):
            return stop_names
        return []
    
    @classmethod
    @property
    def MUNI_LINE_NAME(cls) -> str:
        """Optional line name filter (e.g., 'N' for N-Judah)."""
        return cls._get_feature("muni").get("line_name", "")
    
    @classmethod
    @property
    def MUNI_REFRESH_SECONDS(cls) -> int:
        """Muni data refresh interval in seconds."""
        return cls._get_feature("muni").get("refresh_seconds", 60)
    
    @classmethod
    @property
    def TRANSIT_CACHE_ENABLED(cls) -> bool:
        """Whether regional transit cache is enabled."""
        return cls._get_feature("muni").get("transit_cache_enabled", True)
    
    @classmethod
    @property
    def TRANSIT_CACHE_REFRESH_SECONDS(cls) -> int:
        """Regional transit cache refresh interval in seconds."""
        return cls._get_feature("muni").get("transit_cache_refresh_seconds", 90)
    
    # ==================== Bay Wheels Configuration ====================
    
    @classmethod
    @property
    def BAYWHEELS_ENABLED(cls) -> bool:
        """Whether Bay Wheels integration is enabled."""
        return cls._get_feature("baywheels").get("enabled", False)
    
    @classmethod
    @property
    def BAYWHEELS_STATION_ID(cls) -> str:
        """Bay Wheels station ID to monitor (backward compatibility - returns first ID)."""
        station_ids = cls.BAYWHEELS_STATION_IDS
        if station_ids:
            return station_ids[0] if isinstance(station_ids, list) else station_ids
        # Fallback to old config format
        return cls._get_feature("baywheels").get("station_id", "")
    
    @classmethod
    @property
    def BAYWHEELS_STATION_IDS(cls) -> List[str]:
        """Bay Wheels station IDs to monitor (list)."""
        feature_config = cls._get_feature("baywheels")
        
        # Check for new station_ids array format
        station_ids = feature_config.get("station_ids")
        if station_ids:
            if isinstance(station_ids, list):
                return station_ids
            elif isinstance(station_ids, str):
                return [station_ids]
        
        # Fallback to old station_id format for backward compatibility
        station_id = feature_config.get("station_id", "")
        if station_id:
            # Migrate single station_id to array format
            if isinstance(station_id, list):
                return station_id
            elif isinstance(station_id, str):
                return [station_id]
        
        return []
    
    @classmethod
    @property
    def BAYWHEELS_STATION_NAME(cls) -> str:
        """Display name for the Bay Wheels station (backward compatibility)."""
        return cls._get_feature("baywheels").get("station_name", "19TH")
    
    @classmethod
    @property
    def BAYWHEELS_REFRESH_SECONDS(cls) -> int:
        """Bay Wheels data refresh interval in seconds."""
        return cls._get_feature("baywheels").get("refresh_seconds", 60)
    
    # ==================== Traffic Configuration ====================
    
    @classmethod
    @property
    def TRAFFIC_ENABLED(cls) -> bool:
        """Whether traffic monitoring is enabled."""
        return cls._get_feature("traffic").get("enabled", False)
    
    @classmethod
    @property
    def GOOGLE_ROUTES_API_KEY(cls) -> str:
        """Google Routes API key."""
        return cls._get_feature("traffic").get("api_key", "")
    
    @classmethod
    @property
    def TRAFFIC_ORIGIN(cls) -> str:
        """Traffic route origin (address or lat,lng)."""
        return cls._get_feature("traffic").get("origin", "")
    
    @classmethod
    @property
    def TRAFFIC_DESTINATION(cls) -> str:
        """Traffic route destination (address or lat,lng)."""
        return cls._get_feature("traffic").get("destination", "")
    
    @classmethod
    @property
    def TRAFFIC_DESTINATION_NAME(cls) -> str:
        """Display name for traffic destination."""
        return cls._get_feature("traffic").get("destination_name", "DOWNTOWN")
    
    @classmethod
    @property
    def TRAFFIC_ROUTES(cls) -> List[Dict[str, str]]:
        """Traffic routes to monitor (list of dicts with origin, destination, destination_name)."""
        feature_config = cls._get_feature("traffic")
        
        # Check for new routes array format
        routes = feature_config.get("routes")
        if routes:
            if isinstance(routes, list):
                return routes
            else:
                return [routes]
        
        # Fallback to old single route format
        origin = feature_config.get("origin", "")
        destination = feature_config.get("destination", "")
        destination_name = feature_config.get("destination_name", "DOWNTOWN")
        
        if origin and destination:
            return [{
                "origin": origin,
                "destination": destination,
                "destination_name": destination_name
            }]
        
        return []
    
    @classmethod
    @property
    def TRAFFIC_REFRESH_SECONDS(cls) -> int:
        """Traffic data refresh interval in seconds."""
        return cls._get_feature("traffic").get("refresh_seconds", 300)
    
    # ==================== Silence Schedule Configuration ====================
    
    @classmethod
    @property
    def SILENCE_SCHEDULE_ENABLED(cls) -> bool:
        """Whether silence schedule is enabled."""
        return cls._get_feature("silence_schedule").get("enabled", False)
    
    @classmethod
    @property
    def SILENCE_SCHEDULE_START_TIME(cls) -> str:
        """Silence schedule start time (HH:MM format)."""
        return cls._get_feature("silence_schedule").get("start_time", "20:00")
    
    @classmethod
    @property
    def SILENCE_SCHEDULE_END_TIME(cls) -> str:
        """Silence schedule end time (HH:MM format)."""
        return cls._get_feature("silence_schedule").get("end_time", "07:00")
    
    @classmethod
    def is_silence_mode_active(cls) -> bool:
        """Check if we're currently in silence mode.
        
        Uses TimeService to check if current UTC time is within the configured
        silence window. Times are stored in UTC ISO format.
        
        Returns:
            True if silence schedule is enabled and current time is within the silence window.
        """
        if not cls.SILENCE_SCHEDULE_ENABLED:
            return False
        
        try:
            # Trigger migration if needed (on first call)
            from .config_manager import get_config_manager
            config_manager = get_config_manager()
            config_manager.migrate_silence_schedule_to_utc()
            
            # Get times (should now be in UTC ISO format)
            start_time = cls.SILENCE_SCHEDULE_START_TIME
            end_time = cls.SILENCE_SCHEDULE_END_TIME
            
            # Use TimeService to check if we're in the window
            from .time_service import get_time_service
            time_service = get_time_service()
            
            return time_service.is_time_in_window(start_time, end_time)
            
        except (ValueError, AttributeError) as e:
            logger.warning(f"Invalid silence schedule time format: {e}")
            return False
    
    # ==================== Stocks Configuration ====================
    
    @classmethod
    @property
    def STOCKS_ENABLED(cls) -> bool:
        """Whether stocks monitoring is enabled."""
        return cls._get_feature("stocks").get("enabled", False)
    
    @classmethod
    @property
    def FINNHUB_API_KEY(cls) -> str:
        """Finnhub API key for stock symbol search (optional)."""
        return cls._get_feature("stocks").get("finnhub_api_key", "")
    
    @classmethod
    @property
    def STOCKS_SYMBOLS(cls) -> List[str]:
        """List of stock symbols to monitor (max 5)."""
        feature_config = cls._get_feature("stocks")
        symbols = feature_config.get("symbols", [])
        if isinstance(symbols, list):
            # Limit to 5 symbols max
            return symbols[:5]
        elif isinstance(symbols, str):
            return [symbols] if symbols else []
        return []
    
    @classmethod
    @property
    def STOCKS_TIME_WINDOW(cls) -> str:
        """Time window for price comparison (human-readable format)."""
        return cls._get_feature("stocks").get("time_window", "1 Day")
    
    @classmethod
    @property
    def STOCKS_REFRESH_SECONDS(cls) -> int:
        """Stocks data refresh interval in seconds."""
        return cls._get_feature("stocks").get("refresh_seconds", 300)
    
    # ==================== Flights Configuration ====================
    
    @classmethod
    @property
    def FLIGHTS_ENABLED(cls) -> bool:
        """Whether flight tracking is enabled."""
        return cls._get_feature("flights").get("enabled", False)
    
    @classmethod
    @property
    def AVIATIONSTACK_API_KEY(cls) -> str:
        """aviationstack API key for flight tracking."""
        return cls._get_feature("flights").get("api_key", "")
    
    @classmethod
    @property
    def FLIGHTS_LATITUDE(cls) -> float:
        """Latitude for flight monitoring."""
        return cls._get_feature("flights").get("latitude", 37.7749)
    
    @classmethod
    @property
    def FLIGHTS_LONGITUDE(cls) -> float:
        """Longitude for flight monitoring."""
        return cls._get_feature("flights").get("longitude", -122.4194)
    
    @classmethod
    @property
    def FLIGHTS_RADIUS_KM(cls) -> float:
        """Search radius in kilometers for nearby flights."""
        return cls._get_feature("flights").get("radius_km", 50.0)
    
    @classmethod
    @property
    def FLIGHTS_MAX_COUNT(cls) -> int:
        """Maximum number of flights to display."""
        return cls._get_feature("flights").get("max_count", 4)
    
    @classmethod
    @property
    def FLIGHTS_REFRESH_SECONDS(cls) -> int:
        """Flight data refresh interval in seconds."""
        return cls._get_feature("flights").get("refresh_seconds", 28800)  # 8 hours default (free tier: 100 req/month)
    
    # ==================== Legacy/Unused Configuration ====================
    
    # These are kept for backward compatibility but not actively used
    USER_LATITUDE: float = 37.7749
    USER_LONGITUDE: float = -122.4194
    MAX_DISTANCE_MILES: float = 2.0
    WAYMO_ENABLED: bool = False
    
    # ==================== Helper Methods ====================
    
    @classmethod
    def get_ha_entities(cls) -> List[Dict[str, str]]:
        """Parse Home Assistant entities from config."""
        entities = cls._get_feature("home_assistant").get("entities", [])
        if isinstance(entities, list):
            return entities
        return []
    
    @classmethod
    def get_transition_settings(cls) -> Dict:
        """Get current transition settings."""
        return {
            "strategy": cls.VB_TRANSITION_STRATEGY,
            "step_interval_ms": cls.VB_TRANSITION_INTERVAL_MS,
            "step_size": cls.VB_TRANSITION_STEP_SIZE,
        }
    
    @classmethod
    def reload(cls) -> None:
        """Reload configuration from file."""
        cls._get_cm().reload()
        logger.info("Configuration reloaded")
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present."""
        is_valid, errors = cls._get_cm().validate()
        
        if not is_valid:
            logger.error("Configuration validation failed:")
            for error in errors:
                logger.error(f"  - {error}")
            return False
        
        logger.info("Configuration validated successfully")
        return True
    
    @classmethod
    def get_summary(cls) -> dict:
        """Get a summary of configuration (without sensitive keys)."""
        return {
            "weather_provider": cls.WEATHER_PROVIDER,
            "weather_location": cls.WEATHER_LOCATION,
            "timezone": cls.TIMEZONE,
            "refresh_interval_seconds": cls.REFRESH_INTERVAL_SECONDS,
            # Service enabled flags (for UI display)
            "datetime_enabled": cls.DATETIME_ENABLED,
            "weather_enabled": cls.WEATHER_ENABLED and bool(cls.WEATHER_API_KEY),
            "guest_wifi_enabled": cls.GUEST_WIFI_ENABLED,
            "home_assistant_enabled": cls.HOME_ASSISTANT_ENABLED,
            "star_trek_quotes_enabled": cls.STAR_TREK_QUOTES_ENABLED,
            "air_fog_enabled": cls.AIR_FOG_ENABLED,
            "muni_enabled": cls.MUNI_ENABLED,
            "surf_enabled": cls.SURF_ENABLED,
            "baywheels_enabled": cls.BAYWHEELS_ENABLED,
            "traffic_enabled": cls.TRAFFIC_ENABLED,
            "stocks_enabled": cls.STOCKS_ENABLED,
            "flights_enabled": cls.FLIGHTS_ENABLED,
            # Vestaboard config
            "vb_api_mode": cls.VB_API_MODE,
            "vb_host": cls.VB_HOST if cls.VB_API_MODE.lower() == "local" else "cloud",
            "vb_key_set": bool(cls.get_vb_api_key()),
            "weather_key_set": bool(cls.WEATHER_API_KEY),
            # Transition settings (only available in Local API mode)
            "transition_strategy": cls.VB_TRANSITION_STRATEGY if cls.VB_API_MODE.lower() == "local" else None,
            "transition_interval_ms": cls.VB_TRANSITION_INTERVAL_MS if cls.VB_API_MODE.lower() == "local" else None,
            "transition_step_size": cls.VB_TRANSITION_STEP_SIZE if cls.VB_API_MODE.lower() == "local" else None,
        }
