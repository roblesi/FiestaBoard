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
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius_km": 50,
        "max_aircraft": 4,
        "refresh_seconds": 120,
    }


@pytest.fixture
def sample_config_with_auth():
    """Sample configuration with OAuth credentials."""
    return {
        "enabled": True,
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius_km": 50,
        "max_aircraft": 4,
        "refresh_seconds": 120,
        "client_id": "test_client_id",
        "client_secret": "test_client_secret",
    }


@pytest.fixture
def mock_opensky_states_response():
    """Mock OpenSky API states response."""
    # OpenSky returns state vectors as arrays
    # Format: [icao24, callsign, origin_country, time_position, last_contact,
    #          longitude, latitude, baro_altitude, on_ground, velocity,
    #          true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
    return {
        "time": 1234567890,
        "states": [
            [
                "abc123",           # icao24
                "AAY453",           # callsign
                "United States",    # origin_country
                1234567890,         # time_position
                1234567890,         # last_contact
                -122.4194,          # longitude
                37.7749,            # latitude
                1394.0,             # baro_altitude (meters)
                False,              # on_ground
                143.5,              # velocity (m/s)
                180.0,              # true_track
                0.0,                # vertical_rate
                None,               # sensors
                1394.0,             # geo_altitude (meters)
                "1603",             # squawk
                False,              # spi
                0                   # position_source
            ],
            [
                "def456",           # icao24
                "DAL1792",          # callsign
                1234567890,         # time_position
                1234567890,         # last_contact
                -122.5,             # longitude
                37.8,               # latitude
                10424.0,            # baro_altitude (meters)
                False,              # on_ground
                252.0,              # velocity (m/s)
                90.0,               # true_track
                0.0,                # vertical_rate
                None,               # sensors
                10424.0,            # geo_altitude (meters)
                "2105",             # squawk
                False,              # spi
                0                   # position_source
            ],
            [
                "ghi789",           # icao24
                None,               # callsign (null)
                1234567890,         # time_position
                1234567890,         # last_contact
                -122.4,             # longitude
                37.7,               # latitude
                5158.0,             # baro_altitude (meters)
                False,              # on_ground
                225.0,              # velocity (m/s)
                270.0,              # true_track
                0.0,                # vertical_rate
                None,               # sensors
                5158.0,             # geo_altitude (meters)
                None,               # squawk (null)
                False,              # spi
                0                   # position_source
            ],
            [
                "jkl012",           # icao24
                "EDV5002",          # callsign
                1234567890,         # time_position
                1234567890,         # last_contact
                -122.3,             # longitude
                37.75,              # latitude
                12192.0,            # baro_altitude (meters)
                True,               # on_ground (should be filtered)
                0.0,                # velocity (m/s)
                0.0,                # true_track
                0.0,                # vertical_rate
                None,               # sensors
                12192.0,            # geo_altitude (meters)
                "3602",             # squawk
                False,              # spi
                0                   # position_source
            ],
        ]
    }


@pytest.fixture
def mock_opensky_empty_response():
    """Mock OpenSky API empty response."""
    return {
        "time": 1234567890,
        "states": None
    }


@pytest.fixture
def mock_oauth_token_response():
    """Mock OAuth token response."""
    return {
        "access_token": "test_access_token_12345",
        "token_type": "Bearer",
        "expires_in": 3600
    }
