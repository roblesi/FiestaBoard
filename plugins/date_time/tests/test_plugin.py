"""Tests for the datetime plugin."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from src.data_sources.datetime import DateTimeSource, get_datetime_source


class TestDateTimeSource:
    """Tests for DateTimeSource class."""
    
    def test_init_default_timezone(self):
        """Test initialization with default timezone."""
        source = DateTimeSource()
        assert source is not None
        assert source.timezone is not None
    
    def test_init_custom_timezone(self):
        """Test initialization with custom timezone."""
        source = DateTimeSource(timezone="America/New_York")
        assert source is not None
        assert source.timezone == "America/New_York"
    
    def test_get_current_datetime(self):
        """Test getting current date and time."""
        source = DateTimeSource()
        result = source.get_current_datetime()
        
        assert result is not None
        assert "date" in result
        assert "time" in result
        assert "day_of_week" in result
    
    def test_get_current_datetime_fields(self):
        """Test all fields in datetime result."""
        source = DateTimeSource()
        result = source.get_current_datetime()
        
        # Verify all expected fields
        assert "date" in result
        assert "time" in result
        assert "datetime" in result
        assert "day_of_week" in result
        assert "month" in result
        assert "day" in result
        assert "year" in result
        assert "hour" in result
        assert "minute" in result
        assert "timezone_abbr" in result
    
    def test_format_date(self):
        """Test date formatting."""
        source = DateTimeSource()
        result = source.get_current_datetime()
        
        # Date should be in YYYY-MM-DD format
        date_str = result["date"]
        assert len(date_str) == 10
        assert date_str[4] == "-"
        assert date_str[7] == "-"
    
    def test_format_time(self):
        """Test time format (24-hour)."""
        source = DateTimeSource()
        result = source.get_current_datetime()
        
        # Time should be in HH:MM format
        time_str = result["time"]
        assert len(time_str) == 5
        assert time_str[2] == ":"
    
    def test_day_of_week_valid(self):
        """Test day of week is a valid day name."""
        source = DateTimeSource()
        result = source.get_current_datetime()
        
        valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", 
                      "Friday", "Saturday", "Sunday"]
        day = result["day_of_week"]
        assert day in valid_days


class TestGetDateTimeSource:
    """Tests for get_datetime_source factory function."""
    
    def test_get_datetime_source_returns_instance(self):
        """Test that factory returns a DateTimeSource instance."""
        source = get_datetime_source()
        assert source is not None
        assert isinstance(source, DateTimeSource)
    
    def test_get_datetime_source_uses_config_timezone(self):
        """Test that factory uses timezone from config."""
        with patch('src.data_sources.datetime.Config') as mock_config:
            mock_config.TIMEZONE = "Europe/London"
            source = get_datetime_source()
            assert source.timezone == "Europe/London"


class TestDateTimeEdgeCases:
    """Edge case tests for datetime plugin."""
    
    def test_invalid_timezone_handling(self):
        """Test handling of invalid timezone string."""
        # Should use the invalid timezone string (TimeService handles errors)
        source = DateTimeSource(timezone="Invalid/Timezone")
        # The source should still be created
        assert source.timezone == "Invalid/Timezone"
    
    def test_utc_timezone(self):
        """Test with UTC timezone."""
        source = DateTimeSource(timezone="UTC")
        result = source.get_current_datetime()
        assert result is not None
        assert "date" in result

    def test_format_for_display(self):
        """Test custom format_for_display method."""
        source = DateTimeSource()
        formatted = source.format_for_display("%Y-%m-%d")
        assert len(formatted) == 10  # YYYY-MM-DD format
