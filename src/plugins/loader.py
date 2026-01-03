"""Plugin discovery and loading.

The PluginLoader discovers plugins from the plugins/ directory,
validates their manifests, and loads their Python modules.
"""

import importlib.util
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Type

from .base import PluginBase
from .manifest import PluginManifest, load_manifest

logger = logging.getLogger(__name__)

# Default plugins directory (relative to project root)
DEFAULT_PLUGINS_DIR = "plugins"


class PluginLoadError(Exception):
    """Raised when a plugin fails to load."""
    pass


class PluginLoader:
    """Discovers and loads plugins from the plugins directory.
    
    The loader:
    1. Scans the plugins directory for subdirectories
    2. Validates each plugin's manifest.json
    3. Dynamically imports the plugin's __init__.py
    4. Finds and instantiates the PluginBase subclass
    """
    
    def __init__(self, plugins_dir: Optional[Path] = None):
        """Initialize the plugin loader.
        
        Args:
            plugins_dir: Path to plugins directory. If None, uses default.
        """
        if plugins_dir is None:
            # Find project root (where plugins/ should be)
            # Go up from src/plugins/ to project root
            project_root = Path(__file__).parent.parent.parent
            plugins_dir = project_root / DEFAULT_PLUGINS_DIR
        
        self.plugins_dir = Path(plugins_dir)
        self._loaded_plugins: Dict[str, Tuple[PluginBase, PluginManifest]] = {}
        self._load_errors: Dict[str, List[str]] = {}
        
        logger.info(f"PluginLoader initialized with directory: {self.plugins_dir}")
    
    @property
    def loaded_plugins(self) -> Dict[str, Tuple[PluginBase, PluginManifest]]:
        """Return all successfully loaded plugins."""
        return self._loaded_plugins.copy()
    
    @property
    def load_errors(self) -> Dict[str, List[str]]:
        """Return load errors by plugin directory name."""
        return self._load_errors.copy()
    
    def discover_plugins(self) -> List[str]:
        """Discover available plugin directories.
        
        Returns:
            List of plugin directory names (not full paths)
        """
        if not self.plugins_dir.exists():
            logger.warning(f"Plugins directory does not exist: {self.plugins_dir}")
            return []
        
        if not self.plugins_dir.is_dir():
            logger.warning(f"Plugins path is not a directory: {self.plugins_dir}")
            return []
        
        plugins = []
        for item in self.plugins_dir.iterdir():
            # Skip hidden directories and files
            if item.name.startswith(".") or item.name.startswith("_"):
                continue
            
            # Must be a directory with manifest.json
            if item.is_dir() and (item / "manifest.json").exists():
                plugins.append(item.name)
                logger.debug(f"Discovered plugin directory: {item.name}")
        
        return sorted(plugins)
    
    def load_plugin(self, plugin_name: str) -> Optional[PluginBase]:
        """Load a single plugin by directory name.
        
        Args:
            plugin_name: Name of the plugin directory
            
        Returns:
            Loaded plugin instance, or None if loading failed
        """
        plugin_dir = self.plugins_dir / plugin_name
        errors: List[str] = []
        
        # Clear previous errors
        self._load_errors.pop(plugin_name, None)
        
        # Check directory exists
        if not plugin_dir.exists():
            errors.append(f"Plugin directory not found: {plugin_dir}")
            self._load_errors[plugin_name] = errors
            return None
        
        # Load and validate manifest
        manifest_path = plugin_dir / "manifest.json"
        manifest, manifest_errors = load_manifest(manifest_path)
        
        if manifest_errors:
            errors.extend(manifest_errors)
            self._load_errors[plugin_name] = errors
            logger.error(f"Failed to load manifest for {plugin_name}: {manifest_errors}")
            return None
        
        assert manifest is not None
        
        # Verify manifest id matches directory name
        if manifest.id != plugin_name:
            errors.append(f"Manifest id '{manifest.id}' does not match directory name '{plugin_name}'")
            self._load_errors[plugin_name] = errors
            return None
        
        # Load Python module
        init_path = plugin_dir / "__init__.py"
        if not init_path.exists():
            errors.append(f"Plugin __init__.py not found: {init_path}")
            self._load_errors[plugin_name] = errors
            return None
        
        try:
            # Import the plugin module dynamically
            module_name = f"plugins.{plugin_name}"
            spec = importlib.util.spec_from_file_location(module_name, init_path)
            
            if spec is None or spec.loader is None:
                errors.append(f"Failed to create module spec for {plugin_name}")
                self._load_errors[plugin_name] = errors
                return None
            
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
        except Exception as e:
            errors.append(f"Failed to import plugin module: {e}")
            self._load_errors[plugin_name] = errors
            logger.exception(f"Error importing plugin {plugin_name}")
            return None
        
        # Find PluginBase subclass
        plugin_class = self._find_plugin_class(module, manifest.id)
        if plugin_class is None:
            errors.append(f"No PluginBase subclass found in {plugin_name}")
            self._load_errors[plugin_name] = errors
            return None
        
        # Instantiate plugin
        try:
            plugin_instance = plugin_class(manifest.raw)
            
            # Verify plugin_id property
            if plugin_instance.plugin_id != manifest.id:
                errors.append(
                    f"Plugin class plugin_id '{plugin_instance.plugin_id}' "
                    f"does not match manifest id '{manifest.id}'"
                )
                self._load_errors[plugin_name] = errors
                return None
            
            # Store loaded plugin
            self._loaded_plugins[manifest.id] = (plugin_instance, manifest)
            logger.info(f"Successfully loaded plugin: {manifest.id} v{manifest.version}")
            
            return plugin_instance
            
        except Exception as e:
            errors.append(f"Failed to instantiate plugin: {e}")
            self._load_errors[plugin_name] = errors
            logger.exception(f"Error instantiating plugin {plugin_name}")
            return None
    
    def _find_plugin_class(self, module: Any, expected_id: str) -> Optional[Type[PluginBase]]:
        """Find the PluginBase subclass in a module.
        
        Args:
            module: Loaded Python module
            expected_id: Expected plugin_id for validation
            
        Returns:
            PluginBase subclass, or None if not found
        """
        # Look for exported Plugin class
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            
            # Skip non-classes
            if not isinstance(attr, type):
                continue
            
            # Skip PluginBase itself
            if attr is PluginBase:
                continue
            
            # Check if it's a PluginBase subclass
            if issubclass(attr, PluginBase):
                logger.debug(f"Found plugin class: {attr_name}")
                return attr
        
        return None
    
    def load_all_plugins(self) -> Dict[str, PluginBase]:
        """Discover and load all available plugins.
        
        Returns:
            Dictionary mapping plugin IDs to loaded instances
        """
        plugin_dirs = self.discover_plugins()
        loaded = {}
        
        for plugin_name in plugin_dirs:
            plugin = self.load_plugin(plugin_name)
            if plugin:
                loaded[plugin.plugin_id] = plugin
        
        logger.info(f"Loaded {len(loaded)}/{len(plugin_dirs)} plugins")
        
        if self._load_errors:
            for name, errors in self._load_errors.items():
                logger.warning(f"Plugin {name} had errors: {errors}")
        
        return loaded
    
    def reload_plugin(self, plugin_id: str) -> Optional[PluginBase]:
        """Reload a plugin (unload and load again).
        
        Args:
            plugin_id: ID of plugin to reload
            
        Returns:
            Reloaded plugin instance, or None if failed
        """
        # Unload if loaded
        if plugin_id in self._loaded_plugins:
            old_plugin, _ = self._loaded_plugins[plugin_id]
            old_plugin.cleanup()
            del self._loaded_plugins[plugin_id]
            
            # Remove from sys.modules to force reimport
            module_name = f"plugins.{plugin_id}"
            if module_name in sys.modules:
                del sys.modules[module_name]
        
        # Load again
        return self.load_plugin(plugin_id)
    
    def unload_plugin(self, plugin_id: str) -> bool:
        """Unload a plugin.
        
        Args:
            plugin_id: ID of plugin to unload
            
        Returns:
            True if unloaded, False if not loaded
        """
        if plugin_id not in self._loaded_plugins:
            return False
        
        plugin, _ = self._loaded_plugins[plugin_id]
        plugin.cleanup()
        del self._loaded_plugins[plugin_id]
        
        # Remove from sys.modules
        module_name = f"plugins.{plugin_id}"
        if module_name in sys.modules:
            del sys.modules[module_name]
        
        logger.info(f"Unloaded plugin: {plugin_id}")
        return True
    
    def get_manifest(self, plugin_id: str) -> Optional[PluginManifest]:
        """Get the manifest for a loaded plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            PluginManifest or None if not loaded
        """
        if plugin_id in self._loaded_plugins:
            _, manifest = self._loaded_plugins[plugin_id]
            return manifest
        return None

