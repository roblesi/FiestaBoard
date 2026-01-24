"""Pytest configuration hook to mock astral before imports."""

import sys
from unittest.mock import MagicMock

# This runs very early in pytest's import process
# Mock astral modules before any plugin code tries to import them
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
