"""Tests for property data source."""

import pytest
import json
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from src.data_sources.property import (
    PropertySource,
    get_property_source,
    reset_property_source,
)


class TestPropertySource:
    """Tests for PropertySource main class."""

    @patch("src.data_sources.property.Path")
    def test_property_source_initialization_manual(self, mock_path_class):
        """Test PropertySource initializes with manual provider."""
        properties = [{"address": "123 Main St", "display_name": "HOME"}]
        source = PropertySource(
            properties=properties,
            time_window="1 Month",
            api_provider="manual"
        )
        
        assert source.api_provider == "manual"
        assert len(source.properties) == 1
        assert source.redfin_client is None

    @patch("src.data_sources.property.Path")
    def test_property_source_limits_to_3_properties(self, mock_path_class):
        """Test PropertySource limits to maximum 3 properties."""
        properties = [
            {"address": "123 Main St", "display_name": "HOME"},
            {"address": "456 Oak Ave", "display_name": "RENTAL"},
            {"address": "789 Pine Dr", "display_name": "CABIN"},
            {"address": "999 Elm St", "display_name": "EXTRA"},
        ]
        
        source = PropertySource(
            properties=properties,
            time_window="1 Month",
            api_provider="manual"
        )
        
        assert len(source.properties) == 3

    @patch("src.data_sources.property.Path")
    def test_property_source_format_value(self, mock_path_class):
        """Test property value formatting."""
        mock_path = MagicMock()
        mock_path_class.return_value = mock_path
        mock_path.exists.return_value = False
        
        source = PropertySource(
            properties=[],
            time_window="1 Month",
            api_provider="manual"
        )
        
        assert source._format_value(1250000) == "$1.25M"
        assert source._format_value(850000) == "$850K"  # Under 1M shows K format
        assert source._format_value(750000) == "$750K"
        assert source._format_value(50000) == "$50K"

    @patch("src.data_sources.property.Path")
    def test_property_source_format_percentage(self, mock_path_class):
        """Test percentage formatting."""
        mock_path = MagicMock()
        mock_path_class.return_value = mock_path
        mock_path.exists.return_value = False
        
        source = PropertySource(
            properties=[],
            time_window="1 Month",
            api_provider="manual"
        )
        
        assert source._format_percentage(2.5) == "+2.5%"
        assert source._format_percentage(-1.8) == "-1.8%"
        assert source._format_percentage(0.0) == "+0.0%"

    @patch("src.data_sources.property.Path")
    def test_property_source_handles_empty_properties(self, mock_path_class):
        """Test PropertySource handles empty property list."""
        mock_path = MagicMock()
        mock_path_class.return_value = mock_path
        mock_path.exists.return_value = False
        
        source = PropertySource(
            properties=[],
            time_window="1 Month",
            api_provider="manual"
        )
        
        results = source.fetch_property_data()
        assert isinstance(results, dict)
        assert results["properties"] == []

    @patch("src.data_sources.property.Path")
    def test_property_source_handles_non_list_properties(self, mock_path_class):
        """Test PropertySource handles non-list properties input."""
        mock_path = MagicMock()
        mock_path_class.return_value = mock_path
        mock_path.exists.return_value = False
        
        source = PropertySource(
            properties=None,
            time_window="1 Month",
            api_provider="manual"
        )
        
        assert source.properties == []


class TestPropertySourceSingleton:
    """Tests for property source singleton management."""

    def test_get_property_source_disabled(self):
        """Test get_property_source returns None when disabled."""
        with patch("src.config.Config") as mock_config:
            mock_config.PROPERTY_ENABLED = False
            
            source = get_property_source()
            assert source is None

    @patch("src.data_sources.property.Path")
    def test_get_property_source_creates_singleton(self, mock_path_class):
        """Test get_property_source creates and returns singleton."""
        mock_path = MagicMock()
        mock_path_class.return_value = mock_path
        mock_path.exists.return_value = False
        
        with patch("src.config.Config") as mock_config:
            mock_config.PROPERTY_ENABLED = True
            mock_config.PROPERTY_ADDRESSES = [
                {"address": "123 Main St", "display_name": "HOME"}
            ]
            mock_config.PROPERTY_TIME_WINDOW = "1 Month"
            mock_config.PROPERTY_API_PROVIDER = "manual"
            
            reset_property_source()  # Ensure clean state
            
            source1 = get_property_source()
            source2 = get_property_source()
            
            assert source1 is source2  # Same instance
            assert source1 is not None

    @patch("src.data_sources.property.Path")
    def test_reset_property_source(self, mock_path_class):
        """Test reset_property_source clears singleton."""
        mock_path = MagicMock()
        mock_path_class.return_value = mock_path
        mock_path.exists.return_value = False
        
        with patch("src.config.Config") as mock_config:
            mock_config.PROPERTY_ENABLED = True
            mock_config.PROPERTY_ADDRESSES = [{"address": "123 Main St", "display_name": "HOME"}]
            mock_config.PROPERTY_TIME_WINDOW = "1 Month"
            mock_config.PROPERTY_API_PROVIDER = "manual"
            
            source1 = get_property_source()
            reset_property_source()
            source2 = get_property_source()
            
            assert source1 is not source2  # Different instances
