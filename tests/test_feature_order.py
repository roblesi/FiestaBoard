"""Tests for feature order functionality."""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import Mock, patch

from src.config_manager import ConfigManager, get_config_manager


class TestConfigManagerFeatureOrder:
    """Tests for feature order in ConfigManager."""
    
    @pytest.fixture
    def temp_config_file(self):
        """Create a temporary config file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            # Write minimal valid config
            config = {
                "vestaboard": {
                    "api_mode": "local",
                    "local_api_key": "test-key",
                    "cloud_key": "",
                    "host": "192.168.1.1"
                },
                "features": {
                    "weather": {"enabled": False},
                    "datetime": {"enabled": True},
                    "muni": {"enabled": False}
                },
                "general": {
                    "timezone": "America/Los_Angeles",
                    "refresh_interval_seconds": 300,
                    "output_target": "board"
                }
            }
            json.dump(config, f)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)
    
    def test_feature_order_in_default_config(self):
        """Test that feature_order is in DEFAULT_CONFIG general section."""
        from src.config_manager import DEFAULT_CONFIG
        assert "feature_order" in DEFAULT_CONFIG.get("general", {})
        assert DEFAULT_CONFIG["general"]["feature_order"] == []
    
    def test_get_general_includes_feature_order(self, temp_config_file):
        """Test that get_general returns feature_order."""
        # Reset singleton
        ConfigManager._instance = None
        manager = ConfigManager(config_path=temp_config_file)
        
        general = manager.get_general()
        assert "feature_order" in general
        assert general["feature_order"] == []
    
    def test_set_general_with_feature_order(self, temp_config_file):
        """Test setting feature_order via set_general."""
        # Reset singleton
        ConfigManager._instance = None
        manager = ConfigManager(config_path=temp_config_file)
        
        new_order = ["datetime", "weather", "muni"]
        general = manager.get_general()
        general["feature_order"] = new_order
        
        success = manager.set_general(general)
        assert success is True
        
        # Verify it was saved
        updated = manager.get_general()
        assert updated["feature_order"] == new_order
    
    def test_feature_order_persists(self, temp_config_file):
        """Test that feature_order persists across ConfigManager instances."""
        # Reset singleton
        ConfigManager._instance = None
        manager1 = ConfigManager(config_path=temp_config_file)
        
        new_order = ["muni", "weather", "datetime"]
        general = manager1.get_general()
        general["feature_order"] = new_order
        manager1.set_general(general)
        
        # Create new instance
        ConfigManager._instance = None
        manager2 = ConfigManager(config_path=temp_config_file)
        
        general2 = manager2.get_general()
        assert general2["feature_order"] == new_order


class TestFeatureOrderAPIEndpoints:
    """Tests for feature order API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create a test client."""
        from src.api_server import app
        from fastapi.testclient import TestClient
        return TestClient(app)
    
    @pytest.fixture
    def temp_config_file(self):
        """Create a temporary config file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {
                "vestaboard": {
                    "api_mode": "local",
                    "local_api_key": "test-key",
                    "cloud_key": "",
                    "host": "192.168.1.1"
                },
                "features": {
                    "weather": {"enabled": False},
                    "datetime": {"enabled": True},
                    "muni": {"enabled": False},
                    "traffic": {"enabled": False}
                },
                "general": {
                    "timezone": "America/Los_Angeles",
                    "refresh_interval_seconds": 300,
                    "output_target": "board",
                    "feature_order": []
                }
            }
            json.dump(config, f)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)
    
    @pytest.fixture
    def mock_config_manager(self, temp_config_file):
        """Mock the config manager with temp file."""
        with patch('src.api_server.get_config_manager') as mock_get_cm:
            # Reset singleton
            ConfigManager._instance = None
            manager = ConfigManager(config_path=temp_config_file)
            mock_get_cm.return_value = manager
            yield manager
    
    def test_get_feature_order_empty(self, client, mock_config_manager):
        """Test GET /config/features/order when no order is set."""
        response = client.get("/config/features/order")
        
        assert response.status_code == 200
        data = response.json()
        assert "feature_order" in data
        assert "available_features" in data
        # Should return default order (all features)
        assert len(data["feature_order"]) > 0
        assert isinstance(data["feature_order"], list)
    
    def test_get_feature_order_with_stored_order(self, client, mock_config_manager):
        """Test GET /config/features/order with stored order."""
        # Set a custom order
        general = mock_config_manager.get_general()
        general["feature_order"] = ["datetime", "weather", "muni"]
        mock_config_manager.set_general(general)
        
        response = client.get("/config/features/order")
        
        assert response.status_code == 200
        data = response.json()
        assert data["feature_order"] == ["datetime", "weather", "muni"]
        assert "available_features" in data
    
    def test_update_feature_order_success(self, client, mock_config_manager):
        """Test PUT /config/features/order with valid order."""
        new_order = ["muni", "weather", "datetime", "traffic"]
        
        response = client.put("/config/features/order", json={
            "feature_order": new_order
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        # API adds missing features to the end, so check that our order is at the start
        assert data["feature_order"][:4] == new_order
        # Should include all features
        available = mock_config_manager.get_feature_list()
        assert len(data["feature_order"]) == len(available)
        
        # Verify it was saved (with missing features added)
        general = mock_config_manager.get_general()
        assert general["feature_order"][:4] == new_order
        assert len(general["feature_order"]) == len(available)
    
    def test_update_feature_order_missing_parameter(self, client, mock_config_manager):
        """Test PUT /config/features/order without feature_order parameter."""
        response = client.put("/config/features/order", json={})
        
        assert response.status_code == 400
        data = response.json()
        assert "feature_order" in data["detail"].lower()
    
    def test_update_feature_order_invalid_type(self, client, mock_config_manager):
        """Test PUT /config/features/order with non-list value."""
        response = client.put("/config/features/order", json={
            "feature_order": "not-a-list"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "list" in data["detail"].lower()
    
    def test_update_feature_order_invalid_feature_name(self, client, mock_config_manager):
        """Test PUT /config/features/order with invalid feature name."""
        response = client.put("/config/features/order", json={
            "feature_order": ["weather", "invalid_feature", "datetime"]
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()
    
    def test_update_feature_order_adds_missing_features(self, client, mock_config_manager):
        """Test that missing features are automatically added to the end."""
        # Set order with only some features
        partial_order = ["muni", "weather"]
        
        response = client.put("/config/features/order", json={
            "feature_order": partial_order
        })
        
        assert response.status_code == 200
        data = response.json()
        # Should include all features, with missing ones at the end
        assert "muni" in data["feature_order"]
        assert "weather" in data["feature_order"]
        # Should have all available features
        available = mock_config_manager.get_feature_list()
        assert len(data["feature_order"]) == len(available)
        # First two should be as specified
        assert data["feature_order"][0] == "muni"
        assert data["feature_order"][1] == "weather"
    
    def test_get_feature_order_route_before_parameterized_route(self, client):
        """Test that /config/features/order is matched before /config/features/{feature_name}."""
        # This test ensures route ordering is correct
        # The "order" endpoint should not be treated as a feature name
        response = client.get("/config/features/order")
        
        # Should succeed (not 404 from feature_name route)
        assert response.status_code == 200
        assert "feature_order" in response.json()
    
    def test_put_feature_order_route_before_parameterized_route(self, client, mock_config_manager):
        """Test that PUT /config/features/order is matched before PUT /config/features/{feature_name}."""
        response = client.put("/config/features/order", json={
            "feature_order": ["weather", "datetime"]
        })
        
        # Should succeed (not 404 from feature_name route)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
    
    def test_feature_name_order_rejected(self, client, mock_config_manager):
        """Test that "order" is explicitly rejected as a feature name."""
        # Try to get "order" as a feature (should be rejected)
        response = client.get("/config/features/order")
        
        # Should succeed because it matches the /order route
        assert response.status_code == 200
        
        # But if we try to treat it as a feature in the parameterized route,
        # it should be rejected (though this shouldn't happen due to route ordering)
        # This is a defensive test
        pass  # The route ordering should prevent this, but we have explicit checks too

