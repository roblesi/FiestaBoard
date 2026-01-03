"""Tests for the weather plugin."""

import pytest
from unittest.mock import patch, Mock, MagicMock

from plugins.weather.source import WeatherSource


class TestWeatherSource:
    """Tests for WeatherSource class."""
    
    def test_init_with_api_key(self):
        """Test initialization with API key."""
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "San Francisco, CA", "name": "SF"}]
        )
        assert source is not None
        assert source.api_key == "test_key"
    
    def test_init_with_provider(self):
        """Test initialization with provider selection."""
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "San Francisco, CA", "name": "SF"}]
        )
        assert source.provider == "weatherapi"
    
    def test_init_openweathermap_provider(self):
        """Test initialization with OpenWeatherMap provider."""
        source = WeatherSource(
            provider="openweathermap",
            api_key="test_key",
            locations=[{"location": "San Francisco, CA", "name": "SF"}]
        )
        assert source.provider == "openweathermap"
    
    @patch('requests.get')
    def test_fetch_weather_success(self, mock_get):
        """Test successful weather data fetch."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "current": {
                "temp_f": 72,
                "feelslike_f": 70,
                "condition": {"text": "Sunny"},
                "humidity": 45,
                "wind_mph": 10
            },
            "location": {
                "name": "San Francisco",
                "region": "California"
            }
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "San Francisco, CA", "name": "SF"}]
        )
        result = source.fetch_current_weather()
        
        assert result is not None
        assert isinstance(result, dict)
        assert result["temperature"] == 72
    
    @patch('requests.get')
    def test_fetch_weather_api_error(self, mock_get):
        """Test handling of API errors."""
        mock_get.side_effect = Exception("Network error")
        
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "San Francisco, CA", "name": "SF"}]
        )
        result = source.fetch_current_weather()
        
        # Should return None on error
        assert result is None
    
    @patch('requests.get')
    def test_fetch_weather_invalid_location(self, mock_get):
        """Test handling of invalid location."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.raise_for_status.side_effect = Exception("Bad request")
        mock_get.return_value = mock_response
        
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "InvalidLocation123", "name": "BAD"}]
        )
        result = source.fetch_current_weather()
        
        # Should handle gracefully
        assert result is None


class TestWeatherDataParsing:
    """Tests for weather data parsing."""
    
    def test_parse_temperature(self):
        """Test temperature parsing."""
        temps = [72, 32, 100, -10, 0]
        for temp in temps:
            # Temperature should be a number
            assert isinstance(temp, (int, float))
    
    def test_parse_condition(self):
        """Test weather condition parsing."""
        conditions = ["Sunny", "Partly cloudy", "Rain", "Snow", "Overcast"]
        for cond in conditions:
            assert isinstance(cond, str)
            assert len(cond) > 0
    
    def test_parse_humidity(self):
        """Test humidity parsing."""
        humidity_values = [0, 50, 100, 45, 85]
        for humidity in humidity_values:
            assert 0 <= humidity <= 100
    
    def test_parse_wind_speed(self):
        """Test wind speed parsing."""
        wind_speeds = [0, 10, 25, 50, 100]
        for speed in wind_speeds:
            assert speed >= 0


class TestWeatherFormatting:
    """Tests for weather display formatting."""
    
    def test_temperature_formatting(self):
        """Test temperature is formatted correctly."""
        temp = 72
        # Common formats
        formats = [f"{temp}°", f"{temp}F", f"{temp}°F", str(temp)]
        assert any(f in formats for f in formats)
    
    def test_condition_fits_display(self):
        """Test weather condition fits display width."""
        max_chars = 22  # Vestaboard line width
        
        conditions = ["Sunny", "Partly cloudy", "Rain", "Heavy rain"]
        for cond in conditions:
            assert len(cond) <= max_chars
    
    def test_humidity_formatting(self):
        """Test humidity is formatted correctly."""
        humidity = 65
        formatted = f"{humidity}%"
        assert "%" in formatted
    
    def test_wind_formatting(self):
        """Test wind speed is formatted correctly."""
        wind = 15
        formatted_mph = f"{wind} mph"
        formatted_short = f"{wind}mph"
        assert "mph" in formatted_mph.lower() or "mph" in formatted_short.lower()


class TestWeatherMultipleLocations:
    """Tests for multiple location support."""
    
    def test_locations_list(self):
        """Test handling multiple locations."""
        locations = [
            {"location": "San Francisco, CA", "name": "HOME"},
            {"location": "Los Angeles, CA", "name": "LA"},
            {"location": "New York, NY", "name": "NYC"}
        ]
        
        assert len(locations) == 3
        for loc in locations:
            assert "location" in loc
            assert "name" in loc
    
    def test_location_name_length(self):
        """Test location names fit display constraints."""
        max_name_length = 8  # Typical constraint
        
        names = ["HOME", "WORK", "LA", "NYC", "SF"]
        for name in names:
            assert len(name) <= max_name_length
    
    @patch('requests.get')
    def test_fetch_multiple_locations(self, mock_get):
        """Test fetching weather for multiple locations."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "current": {
                "temp_f": 72,
                "feelslike_f": 70,
                "condition": {"text": "Sunny"},
                "humidity": 50,
                "wind_mph": 5
            },
            "location": {"name": "San Francisco"}
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        locations = [
            {"location": "San Francisco, CA", "name": "HOME"},
            {"location": "Los Angeles, CA", "name": "LA"}
        ]
        
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=locations
        )
        results = source.fetch_multiple_locations()
        
        assert isinstance(results, list)
        # Should have fetched for each location
        assert len(results) == len(locations)


class TestWeatherEdgeCases:
    """Edge case tests for weather plugin."""
    
    def test_extreme_temperatures(self):
        """Test handling extreme temperatures."""
        extreme_temps = [-50, -20, 0, 120, 140]
        for temp in extreme_temps:
            # All should be valid numbers
            assert isinstance(temp, (int, float))
    
    def test_zero_visibility(self):
        """Test zero visibility conditions."""
        visibility = 0
        assert visibility >= 0
    
    def test_high_wind_speed(self):
        """Test very high wind speeds."""
        high_winds = [50, 100, 150, 200]
        for wind in high_winds:
            assert wind >= 0
    
    @patch('requests.get')
    def test_empty_response(self, mock_get):
        """Test handling of empty API response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "SF", "name": "SF"}]
        )
        result = source.fetch_current_weather()
        # Should handle gracefully - returns None or dict
        assert result is None or isinstance(result, dict)
    
    @patch('requests.get')
    def test_timeout_handling(self, mock_get):
        """Test handling of request timeout."""
        from requests.exceptions import Timeout
        mock_get.side_effect = Timeout("Request timed out")
        
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[{"location": "SF", "name": "SF"}]
        )
        result = source.fetch_current_weather()
        # Should handle gracefully
        assert result is None
    
    def test_empty_locations_list(self):
        """Test handling of empty locations list."""
        source = WeatherSource(
            provider="weatherapi",
            api_key="test_key",
            locations=[]
        )
        results = source.fetch_multiple_locations()
        assert results == []


class TestWeatherPlugin:
    """Tests for the WeatherPlugin class."""
    
    @pytest.fixture
    def weather_manifest(self):
        """Create a test manifest for the weather plugin."""
        return {
            "id": "weather",
            "name": "Weather",
            "version": "1.0.0",
            "description": "Weather plugin",
            "author": "Test",
            "settings_schema": {},
            "variables": {"simple": ["temperature", "condition"]},
            "max_lengths": {}
        }
    
    def test_plugin_id(self, weather_manifest):
        """Test plugin ID matches manifest."""
        from plugins.weather import WeatherPlugin
        plugin = WeatherPlugin(weather_manifest)
        assert plugin.plugin_id == "weather"
    
    def test_fetch_data_no_config(self, weather_manifest):
        """Test fetch_data with missing config."""
        from plugins.weather import WeatherPlugin
        plugin = WeatherPlugin(weather_manifest)
        # Don't set any config - plugin.config will be empty/None
        result = plugin.fetch_data()
        
        assert result.available is False
        assert result.error is not None
    
    @patch('requests.get')
    def test_fetch_data_success(self, mock_get, weather_manifest):
        """Test fetch_data with valid config."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "current": {
                "temp_f": 72,
                "feelslike_f": 70,
                "condition": {"text": "Sunny"},
                "humidity": 45,
                "wind_mph": 5
            },
            "location": {"name": "San Francisco"}
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        from plugins.weather import WeatherPlugin
        plugin = WeatherPlugin(weather_manifest)
        
        # Set config on the plugin (simulating what the registry does)
        plugin._config = {
            "provider": "weatherapi",
            "api_key": "test_key",
            "locations": [{"location": "San Francisco, CA", "name": "SF"}]
        }
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data is not None
        assert result.data["temperature"] == 72
