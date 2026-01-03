"""Base classes for FiestaBoard plugins.

All plugins must inherit from PluginBase and implement the required methods.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class PluginResult:
    """Result from a plugin data fetch operation.
    
    Attributes:
        available: Whether the plugin is available and configured
        data: The fetched data dictionary (raw data for template variables)
        error: Error message if fetch failed
        formatted_lines: Optional pre-formatted display lines (6 lines for Vestaboard)
    """
    available: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    formatted_lines: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "available": self.available,
            "data": self.data,
            "error": self.error,
            "formatted_lines": self.formatted_lines,
        }


@dataclass
class PluginInfo:
    """Plugin metadata from manifest.
    
    Attributes:
        id: Unique plugin identifier
        name: Human-readable name
        version: Semantic version string
        description: Short description
        author: Plugin author/maintainer
        repository: Source repository URL
        documentation: Path to README or docs
    """
    id: str
    name: str
    version: str
    description: str
    author: str = "Unknown"
    repository: str = ""
    documentation: str = "README.md"


class PluginBase(ABC):
    """Abstract base class for all FiestaBoard plugins.
    
    Plugins must implement:
    - plugin_id property: Returns unique identifier matching manifest
    - fetch_data(): Returns PluginResult with data
    
    Plugins may optionally implement:
    - validate_config(): Validate configuration before use
    - get_formatted_display(): Return pre-formatted 6-line display
    - on_config_change(): Called when configuration is updated
    - cleanup(): Called when plugin is disabled/unloaded
    """
    
    def __init__(self, manifest: Dict[str, Any]):
        """Initialize plugin with its manifest.
        
        Args:
            manifest: Parsed manifest.json dictionary
        """
        self._manifest = manifest
        self._config: Dict[str, Any] = {}
        self._enabled = False
        logger.debug(f"Plugin initialized: {self.plugin_id}")
    
    @property
    @abstractmethod
    def plugin_id(self) -> str:
        """Return unique plugin identifier.
        
        Must match the 'id' field in manifest.json.
        """
        pass
    
    @property
    def manifest(self) -> Dict[str, Any]:
        """Return the plugin's manifest."""
        return self._manifest
    
    @property
    def info(self) -> PluginInfo:
        """Return plugin metadata from manifest."""
        return PluginInfo(
            id=self._manifest.get("id", self.plugin_id),
            name=self._manifest.get("name", self.plugin_id),
            version=self._manifest.get("version", "0.0.0"),
            description=self._manifest.get("description", ""),
            author=self._manifest.get("author", "Unknown"),
            repository=self._manifest.get("repository", ""),
            documentation=self._manifest.get("documentation", "README.md"),
        )
    
    @property
    def config(self) -> Dict[str, Any]:
        """Return current plugin configuration."""
        return self._config
    
    @config.setter
    def config(self, value: Dict[str, Any]) -> None:
        """Set plugin configuration."""
        old_config = self._config
        self._config = value
        if old_config != value:
            self.on_config_change(old_config, value)
    
    @property
    def enabled(self) -> bool:
        """Return whether plugin is enabled."""
        return self._enabled
    
    @enabled.setter
    def enabled(self, value: bool) -> None:
        """Set plugin enabled state."""
        if self._enabled != value:
            self._enabled = value
            if value:
                logger.info(f"Plugin enabled: {self.plugin_id}")
            else:
                logger.info(f"Plugin disabled: {self.plugin_id}")
                self.cleanup()
    
    @abstractmethod
    def fetch_data(self) -> PluginResult:
        """Fetch and return plugin data.
        
        This is the main method that plugins must implement.
        It should fetch data from external sources and return
        a PluginResult with the raw data for template variables.
        
        Returns:
            PluginResult with available=True and data if successful,
            or available=False and error message if failed.
        """
        pass
    
    def validate_config(self, config: Dict[str, Any]) -> List[str]:
        """Validate configuration before use.
        
        Override this method to add custom validation logic.
        
        Args:
            config: Configuration dictionary to validate
            
        Returns:
            List of error messages (empty if valid)
        """
        return []
    
    def get_formatted_display(self) -> Optional[List[str]]:
        """Return pre-formatted 6-line display.
        
        Override this method to provide a default formatted display.
        This is used when showing the plugin as a "single" page type.
        
        Returns:
            List of 6 strings for Vestaboard display, or None to use
            the template system for formatting.
        """
        return None
    
    def on_config_change(self, old_config: Dict[str, Any], new_config: Dict[str, Any]) -> None:
        """Called when configuration is updated.
        
        Override this method to handle configuration changes,
        e.g., to reset caches or reconnect to services.
        
        Args:
            old_config: Previous configuration
            new_config: New configuration
        """
        logger.debug(f"Config changed for {self.plugin_id}")
    
    def cleanup(self) -> None:
        """Called when plugin is disabled or unloaded.
        
        Override this method to clean up resources, close connections, etc.
        """
        pass
    
    def get_variables_schema(self) -> Dict[str, Any]:
        """Return the variables schema from manifest.
        
        Returns:
            Variables schema dictionary for the template engine.
        """
        return self._manifest.get("variables", {})
    
    def get_max_lengths(self) -> Dict[str, int]:
        """Return the max lengths from manifest.
        
        Returns:
            Dictionary mapping variable names to max character lengths.
        """
        return self._manifest.get("max_lengths", {})
    
    def get_settings_schema(self) -> Dict[str, Any]:
        """Return the settings JSON schema from manifest.
        
        Returns:
            JSON Schema for the plugin's settings form.
        """
        return self._manifest.get("settings_schema", {})
    
    def get_env_vars(self) -> List[Dict[str, Any]]:
        """Return required/optional environment variables from manifest.
        
        Returns:
            List of env var definitions with name, required, description.
        """
        return self._manifest.get("env_vars", [])

