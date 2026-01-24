"""Test fixtures for Visual Clock plugin."""

import pytest


@pytest.fixture
def manifest():
    """Return a basic manifest for testing."""
    return {
        "id": "visual_clock",
        "name": "Visual Clock",
        "version": "1.0.0",
        "description": "Displays a full-screen clock with large pixel-art style digits.",
        "settings_schema": {
            "type": "object",
            "properties": {
                "timezone": {"type": "string", "default": "America/Los_Angeles"},
                "time_format": {"type": "string", "enum": ["12h", "24h"], "default": "12h"},
                "color_pattern": {"type": "string", "enum": ["solid", "pride", "rainbow", "sunset", "ocean", "retro", "christmas", "halloween"], "default": "solid"},
                "digit_color": {"type": "string", "default": "white"},
                "background_color": {"type": "string", "default": "black"},
            }
        },
        "variables": {
            "simple": ["visual_clock", "time", "time_format", "hour", "minute"]
        }
    }
