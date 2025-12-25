"""Configuration file manager for Vestaboard Display Service.

Manages reading and writing configuration to a JSON file with validation
and thread-safe file operations.
"""

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Default configuration schema
DEFAULT_CONFIG: Dict[str, Any] = {
    "vestaboard": {
        "api_mode": "local",
        "local_api_key": "",
        "cloud_key": "",
        "host": "",
        "transition_strategy": None,
        "transition_interval_ms": None,
        "transition_step_size": None,
    },
    "features": {
        "weather": {
            "enabled": False,
            "api_key": "",
            "provider": "weatherapi",
            "location": "San Francisco, CA",
            "refresh_seconds": 300,  # 5 minutes - weather doesn't change fast
            "color_rules": {
                # Temperature color rules: prepend color tile based on value
                "temp": [
                    {"condition": ">=", "value": 90, "color": "red"},
                    {"condition": ">=", "value": 80, "color": "orange"},
                    {"condition": ">=", "value": 70, "color": "yellow"},
                    {"condition": ">=", "value": 60, "color": "green"},
                    {"condition": ">=", "value": 45, "color": "blue"},
                    {"condition": "<", "value": 45, "color": "violet"},
                ],
            },
        },
        "datetime": {
            "enabled": True,
            "timezone": "America/Los_Angeles",
            # No refresh_seconds - always current
            "color_rules": {},
        },
        "home_assistant": {
            "enabled": False,
            "base_url": "",
            "access_token": "",
            "entities": [],
            "timeout": 5,
            "refresh_seconds": 30,  # 30 seconds for home status
            "color_rules": {
                # Entity state colors: shows status at a glance
                "state": [
                    {"condition": "==", "value": "on", "color": "red"},
                    {"condition": "==", "value": "open", "color": "red"},
                    {"condition": "==", "value": "unlocked", "color": "red"},
                    {"condition": "==", "value": "off", "color": "green"},
                    {"condition": "==", "value": "closed", "color": "green"},
                    {"condition": "==", "value": "locked", "color": "green"},
                ],
            },
        },
        "apple_music": {
            "enabled": False,
            "service_url": "",
            "timeout": 5,
            "refresh_seconds": 10,  # 10 seconds to catch song changes
            "color_rules": {},
        },
        "guest_wifi": {
            "enabled": False,
            "ssid": "",
            "password": "",
            # No refresh_seconds - static data
            "color_rules": {},
        },
        "star_trek_quotes": {
            "enabled": False,
            "ratio": "3:5:9",
            # No refresh_seconds - changes per rotation
            "color_rules": {
                # Series colors match the show themes
                "series": [
                    {"condition": "==", "value": "TNG", "color": "yellow"},
                    {"condition": "==", "value": "VOY", "color": "blue"},
                    {"condition": "==", "value": "DS9", "color": "red"},
                ],
            },
        },
        "baywheels": {
            "enabled": False,
            "station_id": "",  # Bay Wheels/GBFS station ID
            "station_name": "",  # Display name for the station
            "refresh_seconds": 60,  # 1 minute for bike availability
            "color_rules": {
                # Status colors based on electric bike availability
                "electric_bikes": [
                    {"condition": "<", "value": 2, "color": "red"},
                    {"condition": "<=", "value": 5, "color": "yellow"},
                    {"condition": ">", "value": 5, "color": "green"},
                ],
            },
        },
        "rotation": {
            "enabled": True,
            "default_duration": 300,
        },
    },
    "general": {
        "refresh_interval_seconds": 300,
        "output_target": "board",
    },
}

# Fields that should be masked in API responses
SENSITIVE_FIELDS = {
    "api_key",
    "local_api_key",
    "cloud_key",
    "access_token",
    "password",
}


class ConfigManager:
    """Manages configuration file read/write operations."""

    _instance: Optional["ConfigManager"] = None
    _lock = threading.Lock()

    def __new__(cls, config_path: Optional[str] = None) -> "ConfigManager":
        """Singleton pattern to ensure only one config manager exists."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, config_path: Optional[str] = None) -> None:
        """Initialize the config manager.
        
        Args:
            config_path: Path to the config file. Defaults to config.json in project root.
        """
        if self._initialized:
            return

        self._file_lock = threading.Lock()
        
        # Determine config file path
        if config_path:
            self._config_path = Path(config_path)
        else:
            # Default to data directory
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            self._config_path = data_dir / "config.json"
        
        self._config: Dict[str, Any] = {}
        self._load_or_create()
        self._initialized = True

    def _load_or_create(self) -> None:
        """Load config from file or create with defaults if missing."""
        with self._file_lock:
            if self._config_path.exists():
                try:
                    with open(self._config_path, "r") as f:
                        self._config = json.load(f)
                    logger.info(f"Loaded config from {self._config_path}")
                    
                    # Merge with defaults to handle missing keys
                    self._config = self._merge_with_defaults(self._config)
                    self._save_internal()
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in config file: {e}")
                    logger.info("Creating new config with defaults")
                    self._config = DEFAULT_CONFIG.copy()
                    self._save_internal()
            else:
                logger.info(f"Config file not found, creating defaults at {self._config_path}")
                self._config = self._deep_copy(DEFAULT_CONFIG)
                self._save_internal()

    def _deep_copy(self, obj: Any) -> Any:
        """Create a deep copy of a nested dict/list structure."""
        if isinstance(obj, dict):
            return {k: self._deep_copy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._deep_copy(item) for item in obj]
        return obj

    # Fields that should be replaced entirely (not recursively merged)
    REPLACE_FIELDS = {"color_rules"}

    def _merge_with_defaults(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively merge config with defaults to handle missing keys.
        
        Note: Some fields like 'color_rules' are replaced entirely rather than
        recursively merged, so user deletions are preserved.
        """
        result = self._deep_copy(DEFAULT_CONFIG)
        
        def merge(base: Dict, update: Dict, path: str = "") -> Dict:
            for key, value in update.items():
                current_path = f"{path}.{key}" if path else key
                # Check if this field should be replaced entirely
                if key in self.REPLACE_FIELDS:
                    base[key] = self._deep_copy(value)
                elif key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    merge(base[key], value, current_path)
                else:
                    base[key] = value
            return base
        
        return merge(result, config)

    def _save_internal(self) -> None:
        """Internal save without acquiring lock (called from locked context)."""
        try:
            with open(self._config_path, "w") as f:
                json.dump(self._config, f, indent=2)
            logger.debug(f"Saved config to {self._config_path}")
        except IOError as e:
            logger.error(f"Failed to save config: {e}")
            raise

    def reload(self) -> None:
        """Reload configuration from file."""
        self._load_or_create()
        logger.info("Configuration reloaded from file")

    def get_all(self) -> Dict[str, Any]:
        """Get full configuration (internal use - includes secrets)."""
        with self._file_lock:
            return self._deep_copy(self._config)

    def get_all_masked(self) -> Dict[str, Any]:
        """Get full configuration with sensitive fields masked."""
        config = self.get_all()
        return self._mask_sensitive(config)

    def _mask_sensitive(self, obj: Any, path: str = "") -> Any:
        """Recursively mask sensitive fields in config."""
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                if key in SENSITIVE_FIELDS and value:
                    # Show that a value is set without revealing it
                    result[key] = "***" if value else ""
                else:
                    result[key] = self._mask_sensitive(value, current_path)
            return result
        elif isinstance(obj, list):
            return [self._mask_sensitive(item, path) for item in obj]
        return obj

    def get_vestaboard(self) -> Dict[str, Any]:
        """Get Vestaboard configuration."""
        with self._file_lock:
            return self._deep_copy(self._config.get("vestaboard", {}))

    def set_vestaboard(self, settings: Dict[str, Any]) -> None:
        """Update Vestaboard configuration.
        
        Args:
            settings: Partial Vestaboard settings to update.
        """
        with self._file_lock:
            if "vestaboard" not in self._config:
                self._config["vestaboard"] = {}
            
            # Only update provided fields
            for key, value in settings.items():
                if key in DEFAULT_CONFIG["vestaboard"]:
                    self._config["vestaboard"][key] = value
            
            self._save_internal()
        logger.info("Vestaboard settings updated")

    def get_feature(self, feature_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific feature.
        
        Args:
            feature_name: Name of the feature (e.g., 'weather', 'guest_wifi').
            
        Returns:
            Feature configuration dict or None if not found.
        """
        with self._file_lock:
            features = self._config.get("features", {})
            if feature_name in features:
                return self._deep_copy(features[feature_name])
            return None

    def set_feature(self, feature_name: str, settings: Dict[str, Any]) -> bool:
        """Update configuration for a specific feature.
        
        Args:
            feature_name: Name of the feature.
            settings: Partial feature settings to update.
            
        Returns:
            True if successful, False if feature doesn't exist.
        """
        with self._file_lock:
            if "features" not in self._config:
                self._config["features"] = {}
            
            if feature_name not in DEFAULT_CONFIG.get("features", {}):
                logger.warning(f"Unknown feature: {feature_name}")
                return False
            
            if feature_name not in self._config["features"]:
                self._config["features"][feature_name] = self._deep_copy(
                    DEFAULT_CONFIG["features"][feature_name]
                )
            
            # Only update provided fields
            for key, value in settings.items():
                # Allow any key that exists in defaults, 'enabled', or 'color_rules'
                if key in DEFAULT_CONFIG["features"].get(feature_name, {}) or key in ("enabled", "color_rules"):
                    self._config["features"][feature_name][key] = value
            
            self._save_internal()
        logger.info(f"Feature '{feature_name}' settings updated")
        return True

    def get_general(self) -> Dict[str, Any]:
        """Get general configuration."""
        with self._file_lock:
            return self._deep_copy(self._config.get("general", {}))

    def set_general(self, settings: Dict[str, Any]) -> None:
        """Update general configuration.
        
        Args:
            settings: Partial general settings to update.
        """
        with self._file_lock:
            if "general" not in self._config:
                self._config["general"] = {}
            
            for key, value in settings.items():
                if key in DEFAULT_CONFIG.get("general", {}):
                    self._config["general"][key] = value
            
            self._save_internal()
        logger.info("General settings updated")

    def is_feature_enabled(self, feature_name: str) -> bool:
        """Check if a feature is enabled.
        
        Args:
            feature_name: Name of the feature.
            
        Returns:
            True if feature is enabled, False otherwise.
        """
        feature = self.get_feature(feature_name)
        if feature:
            return feature.get("enabled", False)
        return False

    def get_feature_list(self) -> list:
        """Get list of all available features."""
        return list(DEFAULT_CONFIG.get("features", {}).keys())

    def get_color_rules(self, feature_name: str, field_name: str) -> list:
        """Get color rules for a specific feature field.
        
        Args:
            feature_name: Name of the feature (e.g., 'weather').
            field_name: Name of the field (e.g., 'temp').
            
        Returns:
            List of color rule dicts, or empty list if none defined.
        """
        feature = self.get_feature(feature_name)
        if not feature:
            return []
        
        color_rules = feature.get("color_rules", {})
        return color_rules.get(field_name, [])

    def validate(self) -> tuple[bool, list[str]]:
        """Validate the current configuration.
        
        Returns:
            Tuple of (is_valid, list of error messages).
        """
        errors = []
        config = self.get_all()
        
        # Validate Vestaboard settings
        vb = config.get("vestaboard", {})
        api_mode = vb.get("api_mode", "local")
        
        if api_mode == "cloud":
            if not vb.get("cloud_key"):
                errors.append("Vestaboard cloud_key is required when api_mode is 'cloud'")
        else:
            if not vb.get("local_api_key"):
                errors.append("Vestaboard local_api_key is required when api_mode is 'local'")
            if not vb.get("host"):
                errors.append("Vestaboard host is required when api_mode is 'local'")
        
        # Validate features that are enabled
        features = config.get("features", {})
        
        if features.get("weather", {}).get("enabled"):
            if not features["weather"].get("api_key"):
                errors.append("Weather API key is required when weather is enabled")
        
        if features.get("home_assistant", {}).get("enabled"):
            ha = features["home_assistant"]
            if not ha.get("base_url"):
                errors.append("Home Assistant base_url is required when enabled")
            if not ha.get("access_token"):
                errors.append("Home Assistant access_token is required when enabled")
        
        if features.get("apple_music", {}).get("enabled"):
            if not features["apple_music"].get("service_url"):
                errors.append("Apple Music service_url is required when enabled")
        
        if features.get("guest_wifi", {}).get("enabled"):
            wifi = features["guest_wifi"]
            if not wifi.get("ssid"):
                errors.append("Guest WiFi SSID is required when enabled")
            if not wifi.get("password"):
                errors.append("Guest WiFi password is required when enabled")
        
        return (len(errors) == 0, errors)


# Global instance getter
def get_config_manager() -> ConfigManager:
    """Get the singleton ConfigManager instance."""
    return ConfigManager()

