"""Tests for property API endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.api_server import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestPropertySearchEndpoint:
    """Tests for /property/search endpoint."""

    def test_property_search_missing_address(self, client):
        """Test search without address parameter."""
        response = client.get("/property/search")
        
        assert response.status_code == 422  # Validation error


class TestPropertyValidateEndpoint:
    """Tests for /property/validate endpoint."""

    def test_property_validate_missing_address(self, client):
        """Test validation without address in body."""
        response = client.post("/property/validate", json={})
        
        assert response.status_code == 400


class TestPropertyConfigEndpoints:
    """Tests for property feature configuration endpoints."""

    def test_get_property_config(self, client):
        """Test getting property feature configuration."""
        with patch("src.config_manager.get_config_manager") as mock_cm:
            mock_config_manager = MagicMock()
            mock_cm.return_value = mock_config_manager
            
            mock_config_manager.get_feature.return_value = {
                "enabled": True,
                "api_provider": "redfin",
                "addresses": [
                    {"address": "123 Main St", "display_name": "HOME"}
                ],
                "time_window": "1 Month",
                "refresh_seconds": 86400
            }
            
            response = client.get("/config/features/property")
            
            assert response.status_code == 200
            data = response.json()
            assert data["feature"] == "property"
            assert data["config"]["enabled"] is True
            assert len(data["config"]["addresses"]) == 1
