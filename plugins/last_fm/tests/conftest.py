"""Plugin test fixtures and configuration for Last.fm."""

import pytest
from unittest.mock import patch, MagicMock

from src.plugins.testing import PluginTestCase, create_mock_response


@pytest.fixture(autouse=True)
def reset_plugin_singletons():
    """Reset plugin singletons before each test."""
    yield


@pytest.fixture
def mock_api_response():
    """Fixture to create mock API responses."""
    return create_mock_response


@pytest.fixture
def sample_manifest():
    """Return sample manifest for testing."""
    return {
        "id": "last_fm",
        "name": "Last.fm Now Playing",
        "version": "1.0.0",
        "settings_schema": {
            "type": "object",
            "properties": {
                "username": {"type": "string"},
                "api_key": {"type": "string"},
                "refresh_seconds": {"type": "integer", "default": 30},
                "show_album": {"type": "boolean", "default": False},
            },
            "required": ["username", "api_key"]
        }
    }


@pytest.fixture
def sample_config():
    """Return sample configuration for testing."""
    return {
        "username": "testuser",
        "api_key": "test_api_key_12345",
        "refresh_seconds": 30,
        "show_album": False,
        "enabled": True
    }


@pytest.fixture
def nowplaying_response():
    """Return a sample Last.fm API response with nowplaying track."""
    return {
        "recenttracks": {
            "track": [
                {
                    "name": "Test Song",
                    "artist": {"#text": "Test Artist"},
                    "album": {"#text": "Test Album"},
                    "image": [
                        {"#text": "https://example.com/small.jpg", "size": "small"},
                        {"#text": "https://example.com/medium.jpg", "size": "medium"},
                        {"#text": "https://example.com/large.jpg", "size": "large"},
                        {"#text": "https://example.com/extralarge.jpg", "size": "extralarge"}
                    ],
                    "url": "https://www.last.fm/music/Test+Artist/_/Test+Song",
                    "@attr": {"nowplaying": "true"}
                }
            ],
            "@attr": {
                "user": "testuser",
                "totalPages": "1",
                "page": "1",
                "perPage": "1",
                "total": "1"
            }
        }
    }


@pytest.fixture
def recent_track_response():
    """Return a sample Last.fm API response without nowplaying (just recent)."""
    return {
        "recenttracks": {
            "track": [
                {
                    "name": "Recent Song",
                    "artist": {"#text": "Recent Artist"},
                    "album": {"#text": "Recent Album"},
                    "image": [
                        {"#text": "https://example.com/artwork.jpg", "size": "extralarge"}
                    ],
                    "url": "https://www.last.fm/music/Recent+Artist/_/Recent+Song",
                    "date": {"uts": "1704067200", "#text": "01 Jan 2024, 00:00"}
                }
            ]
        }
    }


@pytest.fixture
def empty_tracks_response():
    """Return a sample Last.fm API response with no tracks."""
    return {
        "recenttracks": {
            "track": [],
            "@attr": {
                "user": "testuser",
                "totalPages": "0",
                "page": "1",
                "perPage": "1",
                "total": "0"
            }
        }
    }


@pytest.fixture
def error_response():
    """Return a sample Last.fm API error response."""
    return {
        "error": 6,
        "message": "User not found"
    }
