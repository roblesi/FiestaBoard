"""Plugin system for FiestaBoard.

This module provides a plugin-based architecture for data source integrations.
Each plugin is self-contained with its own manifest, code, and documentation.
"""

from .base import PluginBase, PluginResult
from .registry import PluginRegistry, get_plugin_registry
from .loader import PluginLoader
from .manifest import PluginManifest, validate_manifest

__all__ = [
    "PluginBase",
    "PluginResult",
    "PluginRegistry",
    "get_plugin_registry",
    "PluginLoader",
    "PluginManifest",
    "validate_manifest",
]

# Testing utilities (imported separately to avoid test dependencies in production)
# Usage: from src.plugins.testing import PluginTestCase

