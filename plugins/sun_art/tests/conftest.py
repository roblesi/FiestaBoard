"""Plugin test fixtures and configuration."""

import sys
from unittest.mock import MagicMock

# Mock astral modules BEFORE any other imports
# This must happen before the plugin module is imported
def _setup_astral_mocks():
    """Set up astral mocks before plugin import."""
    if 'astral' not in sys.modules:
        mock_astral_module = MagicMock()
        mock_astral_module.LocationInfo = MagicMock()
        sys.modules['astral'] = mock_astral_module
    
    if 'astral.sun' not in sys.modules:
        mock_sun_module = MagicMock()
        mock_sun_module.sun = MagicMock()
        mock_sun_module.elevation = MagicMock()
        mock_sun_module.azimuth = MagicMock()
        sys.modules['astral.sun'] = mock_sun_module

# Set up mocks immediately
_setup_astral_mocks()

# Now safe to import other modules
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
import pytz

from src.plugins.testing import PluginTestCase, create_mock_response


def pytest_configure(config):
    """Pytest configuration hook - ensures mocks are set up."""
    _setup_astral_mocks()


@pytest.fixture(autouse=True)
def reset_plugin_singletons():
    """Reset plugin singletons before each test."""
    yield


@pytest.fixture
def sample_config():
    """Sample configuration for testing."""
    return {
        "latitude": 37.7749,  # San Francisco
        "longitude": -122.4194,
        "refresh_seconds": 300,
        "enabled": True
    }


@pytest.fixture
def sample_manifest():
    """Sample manifest for plugin initialization."""
    return {
        "id": "sun_art",
        "name": "Sun Art",
        "version": "1.0.0",
        "description": "Display sun art patterns",
        "author": "FiestaBoard Team",
        "settings_schema": {},
        "variables": {
            "simple": ["sun_art", "sun_stage", "sun_position", "is_daytime"]
        }
    }
