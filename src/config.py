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
    def REFRESH_INTERVAL_SECONDS(cls) -> int:
        """Refresh interval in seconds."""
        return cls._get_general().get("refresh_interval_seconds", 300)
    
    # ==================== Rotation Configuration ====================
    
    @classmethod
    @property
    def ROTATION_ENABLED(cls) -> bool:
        """Whether rotation is enabled."""
        return cls._get_feature("rotation").get("enabled", True)
    
    @classmethod
    @property
    def ROTATION_DEFAULT_DURATION(cls) -> int:
        """Default rotation duration in seconds."""
        return cls._get_feature("rotation").get("default_duration", 300)
    
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
    
    # ==================== Apple Music Configuration ====================
    
    @classmethod
    @property
    def APPLE_MUSIC_ENABLED(cls) -> bool:
        """Whether Apple Music is enabled."""
        return cls._get_feature("apple_music").get("enabled", False)
    
    @classmethod
    @property
    def APPLE_MUSIC_SERVICE_URL(cls) -> str:
        """Apple Music service URL."""
        return cls._get_feature("apple_music").get("service_url", "")
    
    @classmethod
    @property
    def APPLE_MUSIC_TIMEOUT(cls) -> int:
        """Apple Music request timeout."""
        return cls._get_feature("apple_music").get("timeout", 5)
    
    @classmethod
    @property
    def APPLE_MUSIC_REFRESH_SECONDS(cls) -> int:
        """Apple Music refresh interval."""
        return cls._get_feature("apple_music").get("refresh_seconds", 10)
    
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
            "rotation_enabled": cls.ROTATION_ENABLED,
            "apple_music_enabled": cls.APPLE_MUSIC_ENABLED,
            "guest_wifi_enabled": cls.GUEST_WIFI_ENABLED,
            "home_assistant_enabled": cls.HOME_ASSISTANT_ENABLED,
            "star_trek_quotes_enabled": cls.STAR_TREK_QUOTES_ENABLED,
            "surf_enabled": cls.SURF_ENABLED,
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
