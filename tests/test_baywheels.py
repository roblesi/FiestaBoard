"""Unit tests for Bay Wheels GBFS integration."""

import pytest
import json
from unittest.mock import Mock, patch
from src.data_sources.baywheels import BayWheelsSource, STATION_STATUS_URL


class TestBayWheelsSource:
    """Test Bay Wheels data source."""
    
    def test_init(self):
        """Test source initialization."""
        source = BayWheelsSource(station_id="test-station-123")
        assert source.station_id == "test-station-123"
    
    def test_fetch_station_status_success(self):
        """Test successful station data fetch."""
        source = BayWheelsSource(station_id="station-123")
        
        # Mock response data
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-123",
                        "num_bikes_available": 10,
                        "is_renting": 1,
                        "num_docks_available": 5,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 7},
                            {"vehicle_type_id": "classic_bike", "count": 3}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["station_id"] == "station-123"
            assert result["num_bikes_available"] == 10
            assert result["electric_bikes"] == 7
            assert result["classic_bikes"] == 3
            assert result["is_renting"] is True
            assert result["status_color"] == "green"  # 7 e-bikes > 5
            assert result["num_docks_available"] == 5
            
            # Verify correct URL was called
            mock_get.assert_called_once_with(STATION_STATUS_URL, timeout=10)
    
    def test_fetch_station_status_zero_ebikes(self):
        """Test edge case: station has 0 electric bikes."""
        source = BayWheelsSource(station_id="station-456")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-456",
                        "num_bikes_available": 5,
                        "is_renting": 1,
                        "num_docks_available": 10,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 0},
                            {"vehicle_type_id": "classic_bike", "count": 5}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 0
            assert result["classic_bikes"] == 5
            assert result["status_color"] == "red"  # 0 e-bikes < 2
    
    def test_fetch_station_status_one_ebike(self):
        """Test edge case: station has exactly 1 electric bike."""
        source = BayWheelsSource(station_id="station-789")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-789",
                        "num_bikes_available": 4,
                        "is_renting": 1,
                        "num_docks_available": 8,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 1},
                            {"vehicle_type_id": "classic_bike", "count": 3}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 1
            assert result["status_color"] == "red"  # 1 e-bike < 2
    
    def test_fetch_station_status_two_ebikes(self):
        """Test boundary: station has exactly 2 electric bikes (yellow)."""
        source = BayWheelsSource(station_id="station-abc")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-abc",
                        "num_bikes_available": 5,
                        "is_renting": 1,
                        "num_docks_available": 7,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 2},
                            {"vehicle_type_id": "classic_bike", "count": 3}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 2
            assert result["status_color"] == "yellow"  # 2 e-bikes (2 <= x <= 5)
    
    def test_fetch_station_status_five_ebikes(self):
        """Test boundary: station has exactly 5 electric bikes (yellow)."""
        source = BayWheelsSource(station_id="station-def")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-def",
                        "num_bikes_available": 8,
                        "is_renting": 1,
                        "num_docks_available": 4,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 5},
                            {"vehicle_type_id": "classic_bike", "count": 3}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 5
            assert result["status_color"] == "yellow"  # 5 e-bikes (2 <= x <= 5)
    
    def test_fetch_station_status_six_ebikes(self):
        """Test boundary: station has exactly 6 electric bikes (green)."""
        source = BayWheelsSource(station_id="station-ghi")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-ghi",
                        "num_bikes_available": 10,
                        "is_renting": 1,
                        "num_docks_available": 2,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 6},
                            {"vehicle_type_id": "classic_bike", "count": 4}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 6
            assert result["status_color"] == "green"  # 6 e-bikes > 5
    
    def test_fetch_station_status_not_renting(self):
        """Test station that is not currently renting bikes."""
        source = BayWheelsSource(station_id="station-xyz")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-xyz",
                        "num_bikes_available": 8,
                        "is_renting": 0,  # Not renting
                        "num_docks_available": 3,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 5},
                            {"vehicle_type_id": "classic_bike", "count": 3}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["is_renting"] is False
    
    def test_fetch_station_status_missing_vehicle_types(self):
        """Test edge case: API response missing vehicle_types_available field."""
        source = BayWheelsSource(station_id="station-missing")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-missing",
                        "num_bikes_available": 5,
                        "is_renting": 1,
                        "num_docks_available": 7,
                        # vehicle_types_available field is missing
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            # Should default to 0 for both types when missing
            assert result["electric_bikes"] == 0
            assert result["classic_bikes"] == 0
            assert result["status_color"] == "red"  # 0 e-bikes
    
    def test_fetch_station_status_unknown_vehicle_type(self):
        """Test edge case: API adds new vehicle type IDs."""
        source = BayWheelsSource(station_id="station-new-type")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-new-type",
                        "num_bikes_available": 10,
                        "is_renting": 1,
                        "num_docks_available": 5,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "electric_bike", "count": 3},
                            {"vehicle_type_id": "classic_bike", "count": 2},
                            {"vehicle_type_id": "new_scooter_type", "count": 5}  # New type
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 3
            # Unknown types should be counted as classic
            assert result["classic_bikes"] == 7  # 2 classic + 5 unknown
    
    def test_fetch_station_status_boost_keyword(self):
        """Test that 'boost' keyword is recognized as electric bikes."""
        source = BayWheelsSource(station_id="station-boost")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "station-boost",
                        "num_bikes_available": 6,
                        "is_renting": 1,
                        "num_docks_available": 8,
                        "vehicle_types_available": [
                            {"vehicle_type_id": "boost_bike", "count": 4},
                            {"vehicle_type_id": "classic_bike", "count": 2}
                        ]
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is not None
            assert result["electric_bikes"] == 4  # 'boost' counted as electric
            assert result["classic_bikes"] == 2
    
    def test_fetch_station_status_station_not_found(self):
        """Test error handling when station ID not found in feed."""
        source = BayWheelsSource(station_id="nonexistent-station")
        
        mock_response_data = {
            "data": {
                "stations": [
                    {
                        "station_id": "different-station",
                        "num_bikes_available": 5,
                        "is_renting": 1,
                        "num_docks_available": 7,
                        "vehicle_types_available": []
                    }
                ]
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is None
    
    def test_fetch_station_status_network_error(self):
        """Test error handling for network failures."""
        source = BayWheelsSource(station_id="station-123")
        
        with patch('requests.get') as mock_get:
            mock_get.side_effect = Exception("Network error")
            
            result = source.fetch_station_status()
            
            assert result is None
    
    def test_fetch_station_status_malformed_json(self):
        """Test error handling for malformed JSON response."""
        source = BayWheelsSource(station_id="station-123")
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.side_effect = ValueError("Invalid JSON")
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            assert result is None
    
    def test_fetch_station_status_missing_data_field(self):
        """Test edge case: API response missing 'data' field."""
        source = BayWheelsSource(station_id="station-123")
        
        mock_response_data = {
            "stations": []  # Missing 'data' wrapper
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = source.fetch_station_status()
            
            # Should handle gracefully and return None (no stations found)
            assert result is None
    
    def test_get_status_color_logic(self):
        """Test the color determination logic directly."""
        source = BayWheelsSource(station_id="test")
        
        # Test red zone (< 2)
        assert source._get_status_color(0) == "red"
        assert source._get_status_color(1) == "red"
        
        # Test yellow zone (2-5)
        assert source._get_status_color(2) == "yellow"
        assert source._get_status_color(3) == "yellow"
        assert source._get_status_color(4) == "yellow"
        assert source._get_status_color(5) == "yellow"
        
        # Test green zone (> 5)
        assert source._get_status_color(6) == "green"
        assert source._get_status_color(10) == "green"
        assert source._get_status_color(100) == "green"


class TestBayWheelsConfig:
    """Test Bay Wheels configuration integration."""
    
    def test_get_baywheels_source_disabled(self):
        """Test that source is None when disabled."""
        from src.data_sources.baywheels import get_baywheels_source
        
        with patch('src.data_sources.baywheels.Config.BAYWHEELS_ENABLED', False):
            source = get_baywheels_source()
            assert source is None
    
    def test_get_baywheels_source_no_station_id(self):
        """Test that source is None when station ID not configured."""
        from src.data_sources.baywheels import get_baywheels_source
        
        with patch('src.data_sources.baywheels.Config.BAYWHEELS_ENABLED', True), \
             patch('src.data_sources.baywheels.Config.BAYWHEELS_STATION_ID', ""):
            source = get_baywheels_source()
            assert source is None
    
    def test_get_baywheels_source_configured(self):
        """Test that source is created when properly configured."""
        from src.data_sources.baywheels import get_baywheels_source
        
        with patch('src.data_sources.baywheels.Config.BAYWHEELS_ENABLED', True), \
             patch('src.data_sources.baywheels.Config.BAYWHEELS_STATION_ID', "test-station"):
            source = get_baywheels_source()
            assert source is not None
            assert source.station_id == "test-station"

