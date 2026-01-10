"""Plugin test fixtures and configuration."""

import pytest
from unittest.mock import patch, MagicMock
import json
from pathlib import Path


@pytest.fixture(autouse=True)
def reset_plugin_singletons():
    """Reset plugin singletons before each test."""
    yield


@pytest.fixture
def sample_manifest():
    """Load the plugin manifest for testing."""
    manifest_path = Path(__file__).parent.parent / "manifest.json"
    with open(manifest_path) as f:
        return json.load(f)


@pytest.fixture
def sample_config():
    """Sample configuration for testing."""
    return {
        "enabled": True,
        "sports": ["NFL", "NBA"],
        "api_key": "test_api_key",
        "refresh_seconds": 300,
        "max_games_per_sport": 3
    }


@pytest.fixture
def mock_api_response_nfl():
    """Mock API response for NFL events."""
    return {
        "event": [
            {
                "strEvent": "Patriots vs Bills",
                "strHomeTeam": "New England Patriots",
                "strAwayTeam": "Buffalo Bills",
                "intHomeScore": "24",
                "intAwayScore": "17",
                "strStatus": "Match Finished",
                "dateEvent": "2024-01-15",
                "strTime": "20:00:00"
            },
            {
                "strEvent": "Chiefs vs Broncos",
                "strHomeTeam": "Kansas City Chiefs",
                "strAwayTeam": "Denver Broncos",
                "intHomeScore": "31",
                "intAwayScore": "14",
                "strStatus": "Match Finished",
                "dateEvent": "2024-01-14",
                "strTime": "17:00:00"
            }
        ]
    }


@pytest.fixture
def mock_api_response_nba():
    """Mock API response for NBA events."""
    return {
        "event": [
            {
                "strEvent": "Lakers vs Warriors",
                "strHomeTeam": "Los Angeles Lakers",
                "strAwayTeam": "Golden State Warriors",
                "intHomeScore": "98",
                "intAwayScore": "95",
                "strStatus": "Match Finished",
                "dateEvent": "2024-01-15",
                "strTime": "22:30:00"
            }
        ]
    }


@pytest.fixture
def mock_api_response_empty():
    """Mock empty API response."""
    return {
        "event": None
    }


@pytest.fixture
def mock_api_response_no_events():
    """Mock API response with no events."""
    return {
        "event": []
    }
