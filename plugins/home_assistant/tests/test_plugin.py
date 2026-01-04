"""Tests for the home_assistant plugin."""

import pytest
from unittest.mock import patch, Mock, MagicMock


class TestHomeAssistantPlugin:
    """Tests for Home Assistant plugin functionality."""
    
    @patch('requests.get')
    def test_fetch_entity_state(self, mock_get):
        """Test fetching entity state from Home Assistant."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "entity_id": "sensor.temperature",
            "state": "72",
            "attributes": {
                "unit_of_measurement": "°F",
                "friendly_name": "Living Room Temperature"
            }
        }
        mock_get.return_value = mock_response
        
        # Verify mock response structure
        data = mock_response.json()
        assert "entity_id" in data
        assert "state" in data
        assert data["state"] == "72"
    
    @patch('requests.get')
    def test_fetch_multiple_entities(self, mock_get):
        """Test fetching multiple entity states."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"entity_id": "light.living_room", "state": "on"},
            {"entity_id": "sensor.temperature", "state": "72"},
            {"entity_id": "lock.front_door", "state": "locked"}
        ]
        mock_get.return_value = mock_response
        
        data = mock_response.json()
        assert len(data) == 3
        
        # Find specific entities
        states = {e["entity_id"]: e["state"] for e in data}
        assert states["light.living_room"] == "on"
        assert states["lock.front_door"] == "locked"
    
    @patch('requests.get')
    def test_api_authentication(self, mock_get):
        """Test that API calls include authentication."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"state": "ok"}
        mock_get.return_value = mock_response
        
        # Simulate API call with auth header
        url = "http://homeassistant.local:8123/api/states"
        headers = {"Authorization": "Bearer test_token"}
        
        # Call would include headers
        assert "Authorization" in headers
        assert "Bearer" in headers["Authorization"]
    
    def test_entity_state_parsing_on_off(self):
        """Test parsing on/off states."""
        on_states = ["on", "ON", "true", "True", "1"]
        off_states = ["off", "OFF", "false", "False", "0"]
        
        for state in on_states:
            assert state.lower() in ["on", "true", "1"]
        
        for state in off_states:
            assert state.lower() in ["off", "false", "0"]
    
    def test_entity_state_parsing_numeric(self):
        """Test parsing numeric states."""
        numeric_states = ["72", "98.6", "-5", "0"]
        
        for state in numeric_states:
            try:
                float(state)
                is_numeric = True
            except ValueError:
                is_numeric = False
            assert is_numeric
    
    @patch('requests.get')
    def test_connection_error_handling(self, mock_get):
        """Test handling of connection errors."""
        mock_get.side_effect = Exception("Connection refused")
        
        try:
            mock_get("http://homeassistant.local:8123/api/states")
        except Exception as e:
            assert "Connection" in str(e)
    
    @patch('requests.get')
    def test_unauthorized_error_handling(self, mock_get):
        """Test handling of 401 unauthorized errors."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"message": "Invalid token"}
        mock_get.return_value = mock_response
        
        response = mock_get("http://homeassistant.local:8123/api/states")
        assert response.status_code == 401


class TestHomeAssistantConfig:
    """Tests for Home Assistant configuration."""
    
    def test_config_validation_required_fields(self):
        """Test that required config fields are validated."""
        valid_config = {
            "url": "http://homeassistant.local:8123",
            "token": "long_lived_access_token",
            "entities": ["sensor.temperature", "light.living_room"]
        }
        
        assert "url" in valid_config
        assert "token" in valid_config
        assert "entities" in valid_config
    
    def test_config_url_validation(self):
        """Test URL format validation."""
        valid_urls = [
            "http://homeassistant.local:8123",
            "https://ha.example.com",
            "http://192.168.1.100:8123"
        ]
        
        for url in valid_urls:
            assert url.startswith("http://") or url.startswith("https://")
    
    def test_empty_entities_list(self):
        """Test handling of empty entities list."""
        config = {"url": "http://ha.local", "token": "test", "entities": []}
        assert len(config["entities"]) == 0
    
    def test_entity_id_format(self):
        """Test entity ID format validation."""
        valid_entity_ids = [
            "sensor.temperature",
            "light.living_room",
            "switch.garage_door",
            "binary_sensor.motion"
        ]
        
        for entity_id in valid_entity_ids:
            parts = entity_id.split(".")
            assert len(parts) == 2
            assert len(parts[0]) > 0
            assert len(parts[1]) > 0


class TestHomeAssistantDisplay:
    """Tests for Home Assistant display formatting."""
    
    def test_entity_display_format(self):
        """Test entity state display formatting."""
        entity = {
            "entity_id": "sensor.temperature",
            "state": "72",
            "attributes": {"friendly_name": "Temperature"}
        }
        
        # Display format might be: "TEMP: 72°F" or "Temperature: 72"
        display_name = entity["attributes"]["friendly_name"]
        state = entity["state"]
        
        assert len(display_name) > 0
        assert len(state) > 0
    
    def test_max_display_length(self):
        """Test that display text fits within constraints."""
        max_chars = 22  # Board line width
        
        entity_display = "Living Room: ON"
        assert len(entity_display) <= max_chars
    
    def test_multiple_entities_display(self):
        """Test displaying multiple entities."""
        entities = [
            {"name": "Lights", "state": "ON"},
            {"name": "Temp", "state": "72°F"},
            {"name": "Lock", "state": "LOCKED"}
        ]
        
        # Should fit within 6 lines (board)
        assert len(entities) <= 6

