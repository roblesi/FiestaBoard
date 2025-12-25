"""Tests for display service and API endpoints."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

from src.displays.service import DisplayService, DisplayResult, DISPLAY_TYPES, get_display_service


class TestDisplayTypes:
    """Test display type constants."""
    
    def test_all_display_types_defined(self):
        """Test that all expected display types are defined."""
        expected = ["weather", "datetime", "weather_datetime", "home_assistant", 
                    "apple_music", "star_trek", "guest_wifi", "baywheels"]
        assert DISPLAY_TYPES == expected


class TestDisplayService:
    """Tests for DisplayService class."""
    
    @pytest.fixture
    def service(self):
        """Create a display service with mocked sources."""
        with patch('src.displays.service.get_weather_source') as mock_weather, \
             patch('src.displays.service.get_datetime_source') as mock_datetime, \
             patch('src.displays.service.get_apple_music_source') as mock_apple, \
             patch('src.displays.service.get_home_assistant_source') as mock_ha, \
             patch('src.displays.service.get_star_trek_quotes_source') as mock_trek, \
             patch('src.displays.service.get_baywheels_source') as mock_baywheels:
            
            # Setup mock sources
            mock_weather.return_value = Mock()
            mock_datetime.return_value = Mock()
            mock_apple.return_value = None  # Disabled by default
            mock_ha.return_value = None
            mock_trek.return_value = None
            mock_baywheels.return_value = None
            
            service = DisplayService()
            yield service
    
    def test_get_available_displays(self, service):
        """Test listing available displays."""
        displays = service.get_available_displays()
        
        assert len(displays) == 8
        display_types = [d["type"] for d in displays]
        assert "weather" in display_types
        assert "datetime" in display_types
        assert "guest_wifi" in display_types
    
    def test_get_available_displays_includes_availability(self, service):
        """Test that availability is correctly reported."""
        displays = service.get_available_displays()
        
        weather = next(d for d in displays if d["type"] == "weather")
        assert "available" in weather
        assert "description" in weather
    
    def test_get_display_invalid_type(self, service):
        """Test that invalid display type returns error."""
        result = service.get_display("invalid_type")
        
        assert result.available is False
        assert "Unknown display type" in result.error
    
    def test_get_display_weather_success(self, service):
        """Test successful weather display fetch."""
        service.weather_source.fetch_current_weather.return_value = {
            "temperature": 72,
            "condition": "Sunny",
            "location": "San Francisco"
        }
        
        result = service.get_display("weather")
        
        assert result.display_type == "weather"
        assert result.available is True
        assert result.error is None
        assert "San Francisco" in result.formatted or "72" in result.formatted
    
    def test_get_display_weather_unavailable(self, service):
        """Test weather display when source returns None."""
        service.weather_source.fetch_current_weather.return_value = None
        
        result = service.get_display("weather")
        
        assert result.display_type == "weather"
        assert "Unavailable" in result.formatted or result.error is not None
    
    def test_get_display_datetime_success(self, service):
        """Test successful datetime display fetch."""
        service.datetime_source.get_current_datetime.return_value = {
            "day_of_week": "Monday",
            "date": "Dec 25",
            "time": "10:30 AM"
        }
        
        result = service.get_display("datetime")
        
        assert result.display_type == "datetime"
        assert result.available is True
        assert "Monday" in result.formatted or "Dec 25" in result.formatted
    
    def test_get_display_combined(self, service):
        """Test combined weather/datetime display."""
        service.weather_source.fetch_current_weather.return_value = {
            "temperature": 72,
            "condition": "Sunny"
        }
        service.datetime_source.get_current_datetime.return_value = {
            "day_of_week": "Monday",
            "date": "Dec 25"
        }
        
        result = service.get_display("weather_datetime")
        
        assert result.display_type == "weather_datetime"
        assert result.available is True
        assert "weather" in result.raw
        assert "datetime" in result.raw


class TestDisplayResult:
    """Tests for DisplayResult dataclass."""
    
    def test_display_result_creation(self):
        """Test creating a DisplayResult."""
        result = DisplayResult(
            display_type="weather",
            formatted="Sunny, 72F",
            raw={"temp": 72},
            available=True
        )
        
        assert result.display_type == "weather"
        assert result.formatted == "Sunny, 72F"
        assert result.raw == {"temp": 72}
        assert result.available is True
        assert result.error is None
    
    def test_display_result_with_error(self):
        """Test DisplayResult with error."""
        result = DisplayResult(
            display_type="weather",
            formatted="",
            raw={},
            available=False,
            error="Source not configured"
        )
        
        assert result.available is False
        assert result.error == "Source not configured"


class TestDisplayAPIEndpoints:
    """Tests for display API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create a test client."""
        # Import here to avoid circular imports
        from src.api_server import app
        return TestClient(app)
    
    @pytest.fixture
    def mock_display_service(self):
        """Mock the display service."""
        with patch('src.api_server.get_display_service') as mock:
            mock_service = Mock()
            mock.return_value = mock_service
            yield mock_service
    
    def test_list_displays(self, client, mock_display_service):
        """Test GET /displays endpoint."""
        mock_display_service.get_available_displays.return_value = [
            {"type": "weather", "available": True, "description": "Weather"},
            {"type": "datetime", "available": True, "description": "DateTime"},
        ]
        
        response = client.get("/displays")
        
        assert response.status_code == 200
        data = response.json()
        assert "displays" in data
        assert data["total"] == 2
        assert data["available_count"] == 2
    
    def test_get_display_success(self, client, mock_display_service):
        """Test GET /displays/{type} endpoint."""
        mock_display_service.get_display.return_value = DisplayResult(
            display_type="weather",
            formatted="Sunny, 72F\nSan Francisco",
            raw={"temp": 72},
            available=True
        )
        
        response = client.get("/displays/weather")
        
        assert response.status_code == 200
        data = response.json()
        assert data["display_type"] == "weather"
        assert data["message"] == "Sunny, 72F\nSan Francisco"
        assert len(data["lines"]) == 2
    
    def test_get_display_invalid_type(self, client):
        """Test GET /displays/{type} with invalid type."""
        response = client.get("/displays/invalid_type")
        
        assert response.status_code == 400
        assert "Invalid display type" in response.json()["detail"]
    
    def test_get_display_unavailable(self, client, mock_display_service):
        """Test GET /displays/{type} when source unavailable."""
        mock_display_service.get_display.return_value = DisplayResult(
            display_type="home_assistant",
            formatted="",
            raw={},
            available=False,
            error="Home Assistant not configured"
        )
        
        response = client.get("/displays/home_assistant")
        
        assert response.status_code == 503
        assert "not configured" in response.json()["detail"]
    
    def test_get_display_raw(self, client, mock_display_service):
        """Test GET /displays/{type}/raw endpoint."""
        mock_display_service.get_display.return_value = DisplayResult(
            display_type="weather",
            formatted="Sunny",
            raw={"temperature": 72, "condition": "Sunny", "humidity": 45},
            available=True
        )
        
        response = client.get("/displays/weather/raw")
        
        assert response.status_code == 200
        data = response.json()
        assert data["display_type"] == "weather"
        assert data["data"]["temperature"] == 72
        assert data["available"] is True
    
    def test_get_display_raw_invalid_type(self, client):
        """Test GET /displays/{type}/raw with invalid type."""
        response = client.get("/displays/invalid_type/raw")
        
        assert response.status_code == 400

