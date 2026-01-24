"""Tests for sun_art plugin."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import pytz
import json
from pathlib import Path
import sys

# Ensure astral is mocked before import
if 'astral' not in sys.modules or not hasattr(sys.modules['astral'], 'LocationInfo'):
    mock_astral_module = MagicMock()
    mock_astral_module.LocationInfo = MagicMock()
    mock_astral_module.sun = MagicMock()
    mock_astral_module.sun.sun = MagicMock()
    mock_astral_module.sun.elevation = MagicMock()
    mock_astral_module.sun.azimuth = MagicMock()
    sys.modules['astral'] = mock_astral_module
    sys.modules['astral.sun'] = mock_astral_module.sun

from src.plugins.base import PluginResult
from src.board_chars import BoardChars
from plugins.sun_art import SunArtPlugin


class TestSunArtPlugin:
    """Test suite for SunArtPlugin."""
    
    def test_plugin_id(self, sample_manifest):
        """Test plugin ID matches directory name."""
        plugin = SunArtPlugin(sample_manifest)
        assert plugin.plugin_id == "sun_art"
    
    def test_validate_config_valid(self, sample_manifest):
        """Test config validation with valid config."""
        plugin = SunArtPlugin(sample_manifest)
        config = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "refresh_seconds": 300
        }
        errors = plugin.validate_config(config)
        assert len(errors) == 0
    
    def test_validate_config_missing_latitude(self, sample_manifest):
        """Test config validation detects missing latitude."""
        plugin = SunArtPlugin(sample_manifest)
        config = {"longitude": -122.4194}
        errors = plugin.validate_config(config)
        assert len(errors) > 0
        assert any("latitude" in e.lower() for e in errors)
    
    def test_validate_config_missing_longitude(self, sample_manifest):
        """Test config validation detects missing longitude."""
        plugin = SunArtPlugin(sample_manifest)
        config = {"latitude": 37.7749}
        errors = plugin.validate_config(config)
        assert len(errors) > 0
        assert any("longitude" in e.lower() for e in errors)
    
    def test_validate_config_invalid_latitude(self, sample_manifest):
        """Test config validation detects invalid latitude."""
        plugin = SunArtPlugin(sample_manifest)
        config = {"latitude": 100, "longitude": -122.4194}
        errors = plugin.validate_config(config)
        assert len(errors) > 0
        assert any("latitude" in e.lower() for e in errors)
    
    def test_validate_config_invalid_longitude(self, sample_manifest):
        """Test config validation detects invalid longitude."""
        plugin = SunArtPlugin(sample_manifest)
        config = {"latitude": 37.7749, "longitude": 200}
        errors = plugin.validate_config(config)
        assert len(errors) > 0
        assert any("longitude" in e.lower() for e in errors)
    
    def test_validate_config_invalid_refresh(self, sample_manifest):
        """Test config validation detects invalid refresh interval."""
        plugin = SunArtPlugin(sample_manifest)
        config = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "refresh_seconds": 30  # Below minimum
        }
        errors = plugin.validate_config(config)
        assert len(errors) > 0
        assert any("refresh" in e.lower() for e in errors)
    
    @patch('plugins.sun_art.Config')
    def test_fetch_data_missing_config(self, mock_config, sample_manifest):
        """Test error handling for missing config."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {}
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "latitude" in result.error.lower() or "longitude" in result.error.lower()
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.elevation')
    @patch('plugins.sun_art.azimuth')
    @patch('plugins.sun_art.sun')
    def test_fetch_data_success(
        self, mock_sun, mock_azimuth, mock_elevation, mock_config, sample_manifest
    ):
        """Test successful data fetch."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        # Mock sun events
        tz = pytz.timezone("America/Los_Angeles")
        now = datetime.now(tz)
        mock_sun.return_value = {
            "sunrise": now.replace(hour=6, minute=30),
            "sunset": now.replace(hour=18, minute=30),
            "noon": now.replace(hour=12, minute=0)
        }
        
        # Mock elevation and azimuth
        mock_elevation.return_value = 45.0  # High sun (noon)
        mock_azimuth.return_value = 180.0
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "refresh_seconds": 300
        }
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.error is None
        assert "sun_art" in result.data
        assert "sun_art_array" in result.data
        assert "sun_stage" in result.data
        assert "sun_position" in result.data
        assert "is_daytime" in result.data
        assert "time_to_sunrise" in result.data
        assert "time_to_sunset" in result.data
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.elevation')
    @patch('plugins.sun_art.azimuth')
    @patch('plugins.sun_art.sun')
    def test_fetch_data_night_stage(
        self, mock_sun, mock_azimuth, mock_elevation, mock_config, sample_manifest
    ):
        """Test pattern generation for night stage."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        tz = pytz.timezone("America/Los_Angeles")
        now = datetime.now(tz)
        mock_sun.return_value = {
            "sunrise": now.replace(hour=6, minute=30),
            "sunset": now.replace(hour=18, minute=30),
            "noon": now.replace(hour=12, minute=0)
        }
        
        # Night: elevation below -12
        mock_elevation.return_value = -15.0
        mock_azimuth.return_value = 0.0
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["sun_stage"] == "night"
        assert result.data["is_daytime"] is False
        assert "sun_art" in result.data
        assert len(result.data["sun_art"].split("\n")) == 6
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.elevation')
    @patch('plugins.sun_art.azimuth')
    @patch('plugins.sun_art.sun')
    def test_fetch_data_noon_stage(
        self, mock_sun, mock_azimuth, mock_elevation, mock_config, sample_manifest
    ):
        """Test pattern generation for noon stage."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        tz = pytz.timezone("America/Los_Angeles")
        now = datetime.now(tz)
        mock_sun.return_value = {
            "sunrise": now.replace(hour=6, minute=30),
            "sunset": now.replace(hour=18, minute=30),
            "noon": now.replace(hour=12, minute=0)
        }
        
        # Noon: high elevation
        mock_elevation.return_value = 60.0
        mock_azimuth.return_value = 180.0
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["sun_stage"] == "noon"
        assert result.data["is_daytime"] is True
        assert result.data["sun_position"] > 0
    
    def test_determine_sun_stage_night(self, sample_manifest):
        """Test sun stage determination for night (elevation < -12)."""
        plugin = SunArtPlugin(sample_manifest)
        # Both rising and setting should return night when very low
        stage = plugin._determine_sun_stage(-15.0, False)
        assert stage == "night"
        stage = plugin._determine_sun_stage(-15.0, True)
        assert stage == "night"
    
    def test_determine_sun_stage_late_night(self, sample_manifest):
        """Test sun stage determination for late_night (-12 to -6, rising)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(-9.0, True)
        assert stage == "late_night"
    
    def test_determine_sun_stage_twilight(self, sample_manifest):
        """Test sun stage determination for twilight (-12 to -6, setting)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(-9.0, False)
        assert stage == "twilight"
    
    def test_determine_sun_stage_dawn(self, sample_manifest):
        """Test sun stage determination for dawn (-6 to -1, rising)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(-3.0, True)
        assert stage == "dawn"
    
    def test_determine_sun_stage_dusk(self, sample_manifest):
        """Test sun stage determination for dusk (-6 to -1, setting)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(-3.0, False)
        assert stage == "dusk"
    
    def test_determine_sun_stage_early_sunrise(self, sample_manifest):
        """Test sun stage determination for early_sunrise (-1 to 3, rising)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(1.0, True)
        assert stage == "early_sunrise"
    
    def test_determine_sun_stage_late_sunset(self, sample_manifest):
        """Test sun stage determination for late_sunset (-1 to 3, setting)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(1.0, False)
        assert stage == "late_sunset"
    
    def test_determine_sun_stage_sunrise(self, sample_manifest):
        """Test sun stage determination for sunrise (3 to 10, rising)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(6.0, True)
        assert stage == "sunrise"
    
    def test_determine_sun_stage_sunset(self, sample_manifest):
        """Test sun stage determination for sunset (3 to 10, setting)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(6.0, False)
        assert stage == "sunset"
    
    def test_determine_sun_stage_morning(self, sample_manifest):
        """Test sun stage determination for morning (10 to 30, rising)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(20.0, True)
        assert stage == "morning"
    
    def test_determine_sun_stage_afternoon(self, sample_manifest):
        """Test sun stage determination for afternoon (10 to 30, setting)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(20.0, False)
        assert stage == "afternoon"
    
    def test_determine_sun_stage_noon(self, sample_manifest):
        """Test sun stage determination for noon (>30)."""
        plugin = SunArtPlugin(sample_manifest)
        stage = plugin._determine_sun_stage(45.0, False)
        assert stage == "noon"
    
    def test_generate_pattern_dimensions(self, sample_manifest):
        """Test that generated patterns are 6x22."""
        plugin = SunArtPlugin(sample_manifest)
        
        for stage in ["night", "dawn", "sunrise", "morning", "noon", "afternoon", "sunset", "dusk"]:
            pattern = plugin._generate_pattern(stage, 0.0)
            assert len(pattern) == 6, f"Pattern for {stage} should have 6 rows"
            for row in pattern:
                assert len(row) == 22, f"Pattern for {stage} should have 22 columns per row"
    
    def test_pattern_to_string(self, sample_manifest):
        """Test pattern to string conversion."""
        plugin = SunArtPlugin(sample_manifest)
        pattern = plugin._generate_pattern("noon", 60.0)
        pattern_str = plugin._pattern_to_string(pattern)
        
        assert isinstance(pattern_str, str)
        lines = pattern_str.split("\n")
        assert len(lines) == 6
    
    def test_data_variables_match_manifest(self, sample_manifest):
        """Test that returned data includes variables declared in manifest."""
        # Load manifest
        manifest_path = Path(__file__).parent.parent / "manifest.json"
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        declared_vars = manifest["variables"]["simple"]
        
        # Mock fetch_data to return sample data
        with patch('plugins.sun_art.Config') as mock_config, \
             patch('plugins.sun_art.elevation') as mock_elevation, \
             patch('plugins.sun_art.azimuth') as mock_azimuth, \
             patch('plugins.sun_art.sun') as mock_sun:
            
            mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
            tz = pytz.timezone("America/Los_Angeles")
            now = datetime.now(tz)
            mock_sun.return_value = {
                "sunrise": now.replace(hour=6, minute=30),
                "sunset": now.replace(hour=18, minute=30),
                "noon": now.replace(hour=12, minute=0)
            }
            mock_elevation.return_value = 45.0
            mock_azimuth.return_value = 180.0
            
            plugin = SunArtPlugin(sample_manifest)
            plugin.config = {
                "latitude": 37.7749,
                "longitude": -122.4194
            }
            
            result = plugin.fetch_data()
            
            if result.available:
                for var in declared_vars:
                    assert var in result.data, f"Variable '{var}' declared in manifest but not in data"


class TestSunArtEdgeCases:
    """Edge case tests for sun art plugin."""
    
    @patch('plugins.sun_art.Config')
    def test_fetch_data_exception_handling(self, mock_config, sample_manifest):
        """Test exception handling during data fetch."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        
        # Force an exception
        with patch('plugins.sun_art.LocationInfo', side_effect=Exception("Test error")):
            result = plugin.fetch_data()
            assert result.available is False
            assert result.error is not None
    
    def test_generate_pattern_all_stages(self, sample_manifest):
        """Test pattern generation for all sun stages."""
        plugin = SunArtPlugin(sample_manifest)
        
        stages = ["night", "dawn", "sunrise", "morning", "noon", "afternoon", "sunset", "dusk"]
        for stage in stages:
            pattern = plugin._generate_pattern(stage, 0.0)
            # Verify pattern is valid (6x22, all codes are valid)
            assert len(pattern) == 6
            for row in pattern:
                assert len(row) == 22
                for code in row:
                    assert 0 <= code <= 71, f"Invalid character code {code} in {stage} pattern"
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.elevation')
    @patch('plugins.sun_art.azimuth')
    @patch('plugins.sun_art.sun')
    def test_fetch_data_cache_hit(
        self, mock_sun, mock_azimuth, mock_elevation, mock_config, sample_manifest
    ):
        """Test that cached data is returned when cache is valid."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        tz = pytz.timezone("America/Los_Angeles")
        now = datetime.now(tz)
        mock_sun.return_value = {
            "sunrise": now.replace(hour=6, minute=30),
            "sunset": now.replace(hour=18, minute=30),
            "noon": now.replace(hour=12, minute=0)
        }
        mock_elevation.return_value = 45.0
        mock_azimuth.return_value = 180.0
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "refresh_seconds": 300
        }
        
        # First fetch - should calculate
        result1 = plugin.fetch_data()
        assert result1.available is True
        
        # Set up cache
        plugin._cache = result1.data.copy()
        plugin._cache["calculated_at"] = now
        plugin._cache_date = now.strftime("%Y-%m-%d")
        
        # Second fetch within refresh interval - should use cache
        result2 = plugin.fetch_data()
        assert result2.available is True
        # Verify cache was used (sun calculation should not be called again)
        assert mock_elevation.call_count == 1  # Only called once (first fetch)
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.elevation')
    @patch('plugins.sun_art.azimuth')
    @patch('plugins.sun_art.sun')
    def test_calculate_sun_position_during_day(
        self, mock_sun, mock_azimuth, mock_elevation, mock_config, sample_manifest
    ):
        """Test sun position calculation during daytime (between sunrise and sunset, before noon)."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        tz = pytz.timezone("America/Los_Angeles")
        # Set time to 10 AM (after sunrise, before noon)
        now = datetime.now(tz).replace(hour=10, minute=0, second=0, microsecond=0)
        sunrise = now.replace(hour=6, minute=30)
        sunset = now.replace(hour=18, minute=30)
        noon = now.replace(hour=12, minute=0)
        
        mock_sun.return_value = {
            "sunrise": sunrise,
            "sunset": sunset,
            "noon": noon
        }
        mock_elevation.return_value = 30.0
        mock_azimuth.return_value = 120.0
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        
        sun_data = plugin._calculate_sun_position(37.7749, -122.4194, now, tz)
        
        assert sun_data["elevation"] == 30.0
        assert sun_data["azimuth"] == 120.0
        assert sun_data["is_rising"] is True  # Before noon, so rising
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.elevation')
    @patch('plugins.sun_art.azimuth')
    @patch('plugins.sun_art.sun')
    def test_calculate_sun_position_after_sunset(
        self, mock_sun, mock_azimuth, mock_elevation, mock_config, sample_manifest
    ):
        """Test sun position calculation after sunset (is_rising = False)."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        tz = pytz.timezone("America/Los_Angeles")
        # Set time to 8 PM (after sunset)
        now = datetime.now(tz).replace(hour=20, minute=0, second=0, microsecond=0)
        sunrise = now.replace(hour=6, minute=30)
        sunset = now.replace(hour=18, minute=30)
        noon = now.replace(hour=12, minute=0)
        
        mock_sun.return_value = {
            "sunrise": sunrise,
            "sunset": sunset,
            "noon": noon
        }
        mock_elevation.return_value = -10.0
        mock_azimuth.return_value = 0.0
        
        plugin = SunArtPlugin(sample_manifest)
        plugin.config = {
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        
        sun_data = plugin._calculate_sun_position(37.7749, -122.4194, now, tz)
        
        assert sun_data["elevation"] == -10.0
        assert sun_data["is_rising"] is False  # After sunset, so setting
    
    def test_pattern_to_string_with_spaces(self, sample_manifest):
        """Test pattern to string conversion includes space characters."""
        plugin = SunArtPlugin(sample_manifest)
        # Create a pattern with spaces
        pattern = [[BoardChars.SPACE] * 22 for _ in range(6)]
        pattern[0][0] = BoardChars.YELLOW
        pattern[0][1] = BoardChars.SPACE
        pattern[0][2] = BoardChars.O
        
        pattern_str = plugin._pattern_to_string(pattern)
        lines = pattern_str.split("\n")
        assert len(lines) == 6
        # First line should have yellow, space, and O
        assert "{yellow}" in lines[0]
        assert "O" in lines[0]
    
    def test_code_to_char_numbers(self, sample_manifest):
        """Test _code_to_char with number codes."""
        plugin = SunArtPlugin(sample_manifest)
        
        # Test numbers 1-9 (codes 27-35)
        assert plugin._code_to_char(27) == "1"
        assert plugin._code_to_char(28) == "2"
        assert plugin._code_to_char(35) == "9"
        
        # Test zero (code 36)
        assert plugin._code_to_char(36) == "0"
        
        # Test O character (code 15) - this should hit the elif BoardChars.O branch
        o_code = BoardChars.O
        assert o_code == 15, "BoardChars.O should be code 15"
        result = plugin._code_to_char(o_code)
        assert result == "O", f"Expected 'O' for code {o_code}, got '{result}'"
        
        # Test else branch (unknown code)
        assert plugin._code_to_char(999) == " "
    
    @patch('plugins.sun_art.Config')
    @patch('plugins.sun_art.sun')
    def test_calculate_next_events_after_today(
        self, mock_sun, mock_config, sample_manifest
    ):
        """Test _calculate_next_events when current time is after today's sunrise/sunset."""
        mock_config.GENERAL_TIMEZONE = "America/Los_Angeles"
        
        tz = pytz.timezone("America/Los_Angeles")
        # Set time to 8 PM (after sunset)
        now = datetime.now(tz).replace(hour=20, minute=0, second=0, microsecond=0)
        
        today = now.date()
        tomorrow = today + timedelta(days=1)
        
        sunrise_today = now.replace(hour=6, minute=30)
        sunset_today = now.replace(hour=18, minute=30)
        sunrise_tomorrow = now.replace(hour=6, minute=30) + timedelta(days=1)
        sunset_tomorrow = now.replace(hour=18, minute=30) + timedelta(days=1)
        
        def sun_side_effect(observer, date, tzinfo):
            if date == today:
                return {
                    "sunrise": sunrise_today,
                    "sunset": sunset_today,
                    "noon": now.replace(hour=12, minute=0)
                }
            else:
                return {
                    "sunrise": sunrise_tomorrow,
                    "sunset": sunset_tomorrow,
                    "noon": now.replace(hour=12, minute=0) + timedelta(days=1)
                }
        
        mock_sun.side_effect = sun_side_effect
        
        plugin = SunArtPlugin(sample_manifest)
        time_to_sunrise, time_to_sunset = plugin._calculate_next_events(
            37.7749, -122.4194, now, tz
        )
        
        # Should return time to tomorrow's sunrise (since we're after today's)
        assert time_to_sunrise is not None
        assert time_to_sunset is not None
        # Format should be HH:MM
        assert ":" in time_to_sunrise
        assert ":" in time_to_sunset
