"""Configuration management for Vestaboard Display Service."""

import os
import logging
from typing import Optional, List, Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class Config:
    """Application configuration loaded from environment variables."""
    
    # Vestaboard Configuration
    VB_READ_WRITE_KEY: str = os.getenv("VB_READ_WRITE_KEY", "")
    
    # Weather Configuration
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    WEATHER_PROVIDER: str = os.getenv("WEATHER_PROVIDER", "weatherapi")
    WEATHER_LOCATION: str = os.getenv("WEATHER_LOCATION", "San Francisco, CA")
    
    # DateTime Configuration
    TIMEZONE: str = os.getenv("TIMEZONE", "America/Los_Angeles")
    
    # Refresh Configuration
    REFRESH_INTERVAL_SECONDS: int = int(os.getenv("REFRESH_INTERVAL_SECONDS", "300"))  # 5 minutes
    
    # Rotation Configuration
    ROTATION_ENABLED: bool = os.getenv("ROTATION_ENABLED", "true").lower() == "true"
    ROTATION_WEATHER_DURATION: int = int(os.getenv("ROTATION_WEATHER_DURATION", "300"))  # 5 minutes
    ROTATION_HOME_ASSISTANT_DURATION: int = int(os.getenv("ROTATION_HOME_ASSISTANT_DURATION", "300"))  # 5 minutes
    ROTATION_STAR_TREK_DURATION: int = int(os.getenv("ROTATION_STAR_TREK_DURATION", "180"))  # 3 minutes
    ROTATION_ORDER: str = os.getenv("ROTATION_ORDER", "weather,home_assistant")  # Comma-separated list
    
    # Star Trek Quotes Configuration
    STAR_TREK_QUOTES_ENABLED: bool = os.getenv("STAR_TREK_QUOTES_ENABLED", "false").lower() == "true"
    STAR_TREK_QUOTES_RATIO: str = os.getenv("STAR_TREK_QUOTES_RATIO", "3:5:9")  # TNG:Voyager:DS9
    
    # Baywheels Configuration (Phase 3)
    BAYWHEELS_ENABLED: bool = os.getenv("BAYWHEELS_ENABLED", "false").lower() == "true"
    USER_LATITUDE: float = float(os.getenv("USER_LATITUDE", "37.7749"))
    USER_LONGITUDE: float = float(os.getenv("USER_LONGITUDE", "-122.4194"))
    MAX_DISTANCE_MILES: float = float(os.getenv("MAX_DISTANCE_MILES", "2.0"))
    
    # Waymo Configuration (Phase 4)
    WAYMO_ENABLED: bool = os.getenv("WAYMO_ENABLED", "false").lower() == "true"
    
    # Apple Music Configuration
    APPLE_MUSIC_ENABLED: bool = os.getenv("APPLE_MUSIC_ENABLED", "false").lower() == "true"
    APPLE_MUSIC_SERVICE_URL: str = os.getenv("APPLE_MUSIC_SERVICE_URL", "")
    APPLE_MUSIC_TIMEOUT: int = int(os.getenv("APPLE_MUSIC_TIMEOUT", "5"))
    APPLE_MUSIC_REFRESH_SECONDS: int = int(os.getenv("APPLE_MUSIC_REFRESH_SECONDS", "10"))  # Check every 10 seconds when enabled
    
    # Guest WiFi Configuration
    GUEST_WIFI_ENABLED: bool = os.getenv("GUEST_WIFI_ENABLED", "false").lower() == "true"
    GUEST_WIFI_SSID: str = os.getenv("GUEST_WIFI_SSID", "")
    GUEST_WIFI_PASSWORD: str = os.getenv("GUEST_WIFI_PASSWORD", "")
    GUEST_WIFI_REFRESH_SECONDS: int = int(os.getenv("GUEST_WIFI_REFRESH_SECONDS", "60"))  # Refresh every minute when enabled
    
    # Home Assistant Configuration
    HOME_ASSISTANT_ENABLED: bool = os.getenv("HOME_ASSISTANT_ENABLED", "false").lower() == "true"
    HOME_ASSISTANT_BASE_URL: str = os.getenv("HOME_ASSISTANT_BASE_URL", "")
    HOME_ASSISTANT_ACCESS_TOKEN: str = os.getenv("HOME_ASSISTANT_ACCESS_TOKEN", "")
    HOME_ASSISTANT_ENTITIES: str = os.getenv("HOME_ASSISTANT_ENTITIES", "[]")  # JSON array of entity configs
    HOME_ASSISTANT_TIMEOUT: int = int(os.getenv("HOME_ASSISTANT_TIMEOUT", "5"))
    HOME_ASSISTANT_REFRESH_SECONDS: int = int(os.getenv("HOME_ASSISTANT_REFRESH_SECONDS", "30"))  # Check every 30 seconds
    
    @classmethod
    def get_ha_entities(cls) -> List[Dict[str, str]]:
        """Parse Home Assistant entities from JSON string."""
        import json
        try:
            entities = json.loads(cls.HOME_ASSISTANT_ENTITIES)
            if isinstance(entities, list):
                return entities
            return []
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid HOME_ASSISTANT_ENTITIES format: {cls.HOME_ASSISTANT_ENTITIES}")
            return []
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present."""
        errors = []
        
        if not cls.VB_READ_WRITE_KEY:
            errors.append("VB_READ_WRITE_KEY is required")
        
        if not cls.WEATHER_API_KEY:
            errors.append("WEATHER_API_KEY is required")
        
        if cls.WEATHER_PROVIDER not in ["weatherapi", "openweathermap"]:
            errors.append(f"WEATHER_PROVIDER must be 'weatherapi' or 'openweathermap', got '{cls.WEATHER_PROVIDER}'")
        
        if cls.APPLE_MUSIC_ENABLED and not cls.APPLE_MUSIC_SERVICE_URL:
            errors.append("APPLE_MUSIC_SERVICE_URL is required when APPLE_MUSIC_ENABLED is true")
        
        if cls.GUEST_WIFI_ENABLED:
            if not cls.GUEST_WIFI_SSID:
                errors.append("GUEST_WIFI_SSID is required when GUEST_WIFI_ENABLED is true")
            if not cls.GUEST_WIFI_PASSWORD:
                errors.append("GUEST_WIFI_PASSWORD is required when GUEST_WIFI_ENABLED is true")
        
        if cls.HOME_ASSISTANT_ENABLED:
            if not cls.HOME_ASSISTANT_BASE_URL:
                errors.append("HOME_ASSISTANT_BASE_URL is required when HOME_ASSISTANT_ENABLED is true")
            if not cls.HOME_ASSISTANT_ACCESS_TOKEN:
                errors.append("HOME_ASSISTANT_ACCESS_TOKEN is required when HOME_ASSISTANT_ENABLED is true")
            entities = cls.get_ha_entities()
            if not entities:
                errors.append("HOME_ASSISTANT_ENTITIES must contain at least one entity when HOME_ASSISTANT_ENABLED is true")
        
        if errors:
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
            "baywheels_enabled": cls.BAYWHEELS_ENABLED,
            "waymo_enabled": cls.WAYMO_ENABLED,
            "apple_music_enabled": cls.APPLE_MUSIC_ENABLED,
            "guest_wifi_enabled": cls.GUEST_WIFI_ENABLED,
            "home_assistant_enabled": cls.HOME_ASSISTANT_ENABLED,
            "star_trek_quotes_enabled": cls.STAR_TREK_QUOTES_ENABLED,
            "vb_key_set": bool(cls.VB_READ_WRITE_KEY),
            "weather_key_set": bool(cls.WEATHER_API_KEY),
        }

