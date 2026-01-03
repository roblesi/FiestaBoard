"""Tests for flight tracking data source."""

import pytest
from unittest.mock import Mock, patch
from src.data_sources.flights import FlightsSource


@pytest.fixture
def flights_source():
    """Create a flights source for testing."""
    return FlightsSource(
        api_key="test_api_key",
        latitude=37.7749,
        longitude=-122.4194,
        radius_km=50.0,
        max_flights=4
    )


def test_haversine_distance(flights_source):
    """Test haversine distance calculation."""
    # Test distance between San Francisco and Los Angeles (approx 560km)
    sf_lat, sf_lon = 37.7749, -122.4194
    la_lat, la_lon = 34.0522, -118.2437
    
    distance = FlightsSource.haversine_distance(sf_lat, sf_lon, la_lat, la_lon)
    
    # Should be approximately 560km (allow 10km margin)
    assert 550 <= distance <= 570


def test_haversine_distance_zero(flights_source):
    """Test haversine distance for same point."""
    lat, lon = 37.7749, -122.4194
    
    distance = FlightsSource.haversine_distance(lat, lon, lat, lon)
    
    # Distance to same point should be ~0
    assert distance < 0.1


def test_format_flight_line():
    """Test flight line formatting."""
    formatted = FlightsSource._format_flight_line(
        call_sign="UAL123",
        altitude=35000,
        ground_speed=450,
        squawk="1234"
    )
    
    # Check format has proper spacing
    assert "UAL123" in formatted
    assert "35000" in formatted
    assert "450" in formatted
    assert "1234" in formatted
    
    # Check length is reasonable (should be around 22 chars max)
    assert len(formatted) <= 24  # Allow some padding


def test_format_flight_line_truncation():
    """Test that long call signs are truncated."""
    formatted = FlightsSource._format_flight_line(
        call_sign="VERYLONGCALLSIGN123",  # 19 chars
        altitude=35000,
        ground_speed=450,
        squawk="1234"
    )
    
    # Call sign should be truncated to 8 chars
    assert "VERYLONGCALLSIGN123" not in formatted
    assert "VERYLONG" in formatted


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_success(mock_get, flights_source):
    """Test successful flight data fetch."""
    # Mock API response
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "flight": {
                    "icao": "UAL123",
                    "iata": "UA123"
                },
                "live": {
                    "latitude": 37.8,
                    "longitude": -122.5,
                    "altitude": 35000,
                    "speed_horizontal": 450,
                    "squawk": "1234"
                },
                "aircraft": {}
            }
        ]
    }
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    assert len(flights) == 1
    assert flights[0]["call_sign"] == "UAL123"
    assert flights[0]["altitude"] == 35000
    assert flights[0]["ground_speed"] == 450
    assert flights[0]["squawk"] == "1234"


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_no_position(mock_get, flights_source):
    """Test that flights without position data fall back to random selection."""
    # Mock API response with flight lacking position
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "flight": {
                    "icao": "UAL123"
                },
                "live": {
                    # Missing latitude/longitude
                    "altitude": 35000
                },
                "aircraft": {}
            }
        ]
    }
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # When no position data is available, should fall back to random selection
    assert len(flights) == 1
    assert flights[0]["call_sign"] == "UAL123"
    # Without position, distance should be 0.0
    assert flights[0]["distance_km"] == 0.0


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_filters_by_distance(mock_get, flights_source):
    """Test that flights outside radius are filtered."""
    # Mock API response with one close flight and one far flight
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            # Close flight (within 50km)
            {
                "flight": {"icao": "CLOSE1"},
                "live": {
                    "latitude": 37.8,  # ~10km from SF
                    "longitude": -122.5,
                    "altitude": 35000,
                    "speed_horizontal": 450
                },
                "aircraft": {}
            },
            # Far flight (>50km away)
            {
                "flight": {"icao": "FAR1"},
                "live": {
                    "latitude": 38.5,  # ~100km from SF
                    "longitude": -123.0,
                    "altitude": 35000,
                    "speed_horizontal": 450
                },
                "aircraft": {}
            }
        ]
    }
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # Only close flight should be included
    assert len(flights) == 1
    assert flights[0]["call_sign"] == "CLOSE1"


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_sorted_by_distance(mock_get, flights_source):
    """Test that flights are sorted by distance."""
    # Mock API response with multiple flights at different distances
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            # Far flight
            {
                "flight": {"icao": "FAR1"},
                "live": {
                    "latitude": 37.9,  # ~20km
                    "longitude": -122.6,
                    "altitude": 35000,
                    "speed_horizontal": 450
                },
                "aircraft": {}
            },
            # Close flight
            {
                "flight": {"icao": "CLOSE1"},
                "live": {
                    "latitude": 37.78,  # ~5km
                    "longitude": -122.43,
                    "altitude": 35000,
                    "speed_horizontal": 450
                },
                "aircraft": {}
            }
        ]
    }
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # Closest flight should be first
    assert len(flights) == 2
    assert flights[0]["call_sign"] == "CLOSE1"
    assert flights[1]["call_sign"] == "FAR1"


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_max_count(mock_get):
    """Test that max_flights limit is respected."""
    source = FlightsSource(
        api_key="test_key",
        latitude=37.7749,
        longitude=-122.4194,
        radius_km=50.0,
        max_flights=2  # Limit to 2 flights
    )
    
    # Mock API response with 3 close flights
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "flight": {"icao": f"FL{i}"},
                "live": {
                    "latitude": 37.78,
                    "longitude": -122.43,
                    "altitude": 35000,
                    "speed_horizontal": 450
                },
                "aircraft": {}
            }
            for i in range(3)
        ]
    }
    mock_get.return_value = mock_response
    
    flights = source.fetch_nearby_flights()
    
    # Should only return 2 flights
    assert len(flights) == 2


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_api_error(mock_get, flights_source):
    """Test handling of API errors."""
    mock_response = Mock()
    mock_response.status_code = 403
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # Should return empty list on error
    assert flights == []


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_rate_limit(mock_get, flights_source):
    """Test handling of rate limit errors."""
    mock_response = Mock()
    mock_response.status_code = 429
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # Should return empty list on rate limit
    assert flights == []


@patch('src.data_sources.flights.requests.get')
def test_fetch_nearby_flights_network_error(mock_get, flights_source):
    """Test handling of network errors."""
    mock_get.side_effect = Exception("Network error")
    
    flights = flights_source.fetch_nearby_flights()
    
    # Should return empty list on exception
    assert flights == []


def test_parse_flight_missing_call_sign(flights_source):
    """Test that flights without call sign are skipped."""
    flight_data = {
        "flight": {},  # No call sign
        "live": {
            "latitude": 37.8,
            "longitude": -122.5,
            "altitude": 35000,
            "speed_horizontal": 450
        },
        "aircraft": {}
    }
    
    result = flights_source._parse_flight(flight_data)
    
    # Should return None for flight without call sign
    assert result is None


def test_parse_flight_fallback_squawk(flights_source):
    """Test that missing squawk code gets placeholder."""
    flight_data = {
        "flight": {"icao": "UAL123"},
        "live": {
            "latitude": 37.8,
            "longitude": -122.5,
            "altitude": 35000,
            "speed_horizontal": 450
            # No squawk
        },
        "aircraft": {}
    }
    
    result = flights_source._parse_flight(flight_data)
    
    # Should have placeholder squawk
    assert result is not None
    assert result["squawk"] == "----"


@patch('src.data_sources.flights.requests.get')
def test_fetch_flights_without_position_data(mock_get, flights_source):
    """Test that random flights are selected when no position data is available."""
    # Mock API response with flights lacking live position data (free tier)
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "flight": {"icao": "FL001"},
                "live": None,  # No live data
                "aircraft": {"icao24": "ABC123"}
            },
            {
                "flight": {"icao": "FL002"},
                "live": {},  # Empty live data
                "aircraft": {"icao24": "DEF456"}
            },
            {
                "flight": {"icao": "FL003"},
                "live": {"altitude": 35000},  # Live data but no position
                "aircraft": {"icao24": "GHI789"}
            },
            {
                "flight": {"icao": "FL004"},
                "live": {"speed_horizontal": 450},  # Live data but no position
                "aircraft": {}
            },
            {
                "flight": {"icao": "FL005"},
                "live": None,
                "aircraft": {}
            }
        ]
    }
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # Should return random selection (max 4 flights)
    assert len(flights) <= 4
    assert len(flights) > 0
    
    # Check that flights have expected structure with default values
    for flight in flights:
        assert "call_sign" in flight
        assert "altitude" in flight
        assert "ground_speed" in flight
        assert "squawk" in flight
        assert flight["latitude"] == 0.0  # No position data
        assert flight["longitude"] == 0.0
        assert flight["distance_km"] == 0.0


def test_parse_flight_without_position(flights_source):
    """Test parsing flight without position data when not required."""
    flight_data = {
        "flight": {"icao": "UAL123"},
        "live": None,  # No live data
        "aircraft": {"icao24": "ABC123"}
    }
    
    # Should return None when position is required (default)
    result = flights_source._parse_flight(flight_data, require_position=True)
    assert result is None
    
    # Should return data when position is not required
    result = flights_source._parse_flight(flight_data, require_position=False)
    assert result is not None
    assert result["call_sign"] == "UAL123"
    assert result["latitude"] == 0.0
    assert result["longitude"] == 0.0
    assert result["altitude"] == 0
    assert result["ground_speed"] == 0


@patch('src.data_sources.flights.requests.get')
def test_fetch_with_mixed_position_data(mock_get, flights_source):
    """Test that system prefers position data when available."""
    # Mock API response with one flight having position data
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            # Flight WITH position data (close)
            {
                "flight": {"icao": "CLOSE1"},
                "live": {
                    "latitude": 37.78,
                    "longitude": -122.43,
                    "altitude": 35000,
                    "speed_horizontal": 450
                },
                "aircraft": {}
            },
            # Flight WITHOUT position data (would be filtered out)
            {
                "flight": {"icao": "NOPOS1"},
                "live": None,
                "aircraft": {}
            }
        ]
    }
    mock_get.return_value = mock_response
    
    flights = flights_source.fetch_nearby_flights()
    
    # Should use position-based filtering and return the close flight
    assert len(flights) == 1
    assert flights[0]["call_sign"] == "CLOSE1"
    assert flights[0]["latitude"] != 0.0  # Has real position
    assert "distance_km" in flights[0]
    assert flights[0]["distance_km"] > 0  # Real calculated distance

