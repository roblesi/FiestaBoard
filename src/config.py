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
    
    # Vestaboard API Configuration
    # Mode: "local" for Local API (faster, requires local network) or "cloud" for Cloud API (internet-based)
    VB_API_MODE: str = os.getenv("VB_API_MODE", "local")  # "local" or "cloud"
    VB_LOCAL_API_KEY: str = os.getenv("VB_LOCAL_API_KEY", "")
    VB_READ_WRITE_KEY: str = os.getenv("VB_READ_WRITE_KEY", "")
    VB_HOST: str = os.getenv("VB_HOST", os.getenv("VB_LOCAL_API_HOST", ""))
    
    @classmethod
    def get_vb_api_key(cls) -> str:
        """Get the appropriate API key based on mode."""
        if cls.VB_API_MODE.lower() == "cloud":
            return cls.VB_READ_WRITE_KEY
        return cls.VB_LOCAL_API_KEY
    
    # Vestaboard Transition Settings (optional)
    VB_TRANSITION_STRATEGY: Optional[str] = os.getenv("VB_TRANSITION_STRATEGY", None)  # column, reverse-column, edges-to-center, row, diagonal, random
    VB_TRANSITION_INTERVAL_MS: Optional[int] = int(os.getenv("VB_TRANSITION_INTERVAL_MS", "0")) or None  # 0 = as fast as possible
    VB_TRANSITION_STEP_SIZE: Optional[int] = int(os.getenv("VB_TRANSITION_STEP_SIZE", "0")) or None  # 0 = 1 at a time
    
    # Output Target Configuration
    # Controls where display output is sent: "ui", "board", or "both"
    OUTPUT_TARGET: str = os.getenv("OUTPUT_TARGET", "board")
    
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
    
    # Valid transition strategies
    VALID_TRANSITION_STRATEGIES = [
        "column", "reverse-column", "edges-to-center",
        "row", "diagonal", "random"
    ]
    
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
    def get_transition_settings(cls) -> Dict:
        """Get current transition settings."""
        return {
            "strategy": cls.VB_TRANSITION_STRATEGY,
            "step_interval_ms": cls.VB_TRANSITION_INTERVAL_MS,
            "step_size": cls.VB_TRANSITION_STEP_SIZE,
        }
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present."""
        errors = []
        
        # Vestaboard API: validate based on mode
        if cls.VB_API_MODE.lower() == "cloud":
            # Cloud API: only requires Read/Write key
            if not cls.VB_READ_WRITE_KEY:
                errors.append("VB_READ_WRITE_KEY is required when VB_API_MODE=cloud")
        else:
            # Local API: requires both key and host
            if not cls.VB_LOCAL_API_KEY:
                errors.append("VB_LOCAL_API_KEY is required when VB_API_MODE=local")
            if not cls.VB_HOST:
                errors.append("VB_HOST is required when VB_API_MODE=local")
        
        # Validate transition strategy if set
        if cls.VB_TRANSITION_STRATEGY and cls.VB_TRANSITION_STRATEGY not in cls.VALID_TRANSITION_STRATEGIES:
            errors.append(f"VB_TRANSITION_STRATEGY must be one of {cls.VALID_TRANSITION_STRATEGIES}, got '{cls.VB_TRANSITION_STRATEGY}'")
        
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
            # Service enabled flags (for UI display)
            "datetime_enabled": True,  # DateTime is always available
            "weather_enabled": bool(cls.WEATHER_API_KEY),
            "rotation_enabled": cls.ROTATION_ENABLED,
            "baywheels_enabled": cls.BAYWHEELS_ENABLED,
            "waymo_enabled": cls.WAYMO_ENABLED,
            "apple_music_enabled": cls.APPLE_MUSIC_ENABLED,
            "guest_wifi_enabled": cls.GUEST_WIFI_ENABLED,
            "home_assistant_enabled": cls.HOME_ASSISTANT_ENABLED,
            "star_trek_quotes_enabled": cls.STAR_TREK_QUOTES_ENABLED,
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
