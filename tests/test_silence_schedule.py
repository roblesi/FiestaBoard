"""Tests for silence schedule feature."""

import pytest
import threading
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, time

from src.config import Config
from src.config_manager import ConfigManager, get_config_manager


class TestSilenceScheduleConfig:
    """Tests for silence schedule configuration properties."""
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_enabled_default(self, mock_get_cm):
        """Test default enabled state is False."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {"enabled": False}
        mock_get_cm.return_value = mock_cm
        
        assert Config.SILENCE_SCHEDULE_ENABLED is False
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_enabled_true(self, mock_get_cm):
        """Test enabled state can be True."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {"enabled": True}
        mock_get_cm.return_value = mock_cm
        
        assert Config.SILENCE_SCHEDULE_ENABLED is True
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_start_time_default(self, mock_get_cm):
        """Test default start time is 20:00."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {"start_time": "20:00"}
        mock_get_cm.return_value = mock_cm
        
        assert Config.SILENCE_SCHEDULE_START_TIME == "20:00"
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_end_time_default(self, mock_get_cm):
        """Test default end time is 07:00."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {"end_time": "07:00"}
        mock_get_cm.return_value = mock_cm
        
        assert Config.SILENCE_SCHEDULE_END_TIME == "07:00"
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_missing_config_uses_defaults(self, mock_get_cm):
        """Test missing config returns default values."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {}  # Empty config
        mock_get_cm.return_value = mock_cm
        
        assert Config.SILENCE_SCHEDULE_ENABLED is False
        assert Config.SILENCE_SCHEDULE_START_TIME == "20:00"
        assert Config.SILENCE_SCHEDULE_END_TIME == "07:00"  # Default from code


class TestIsSilenceModeActive:
    """Tests for is_silence_mode_active() method."""
    
    @patch('src.config.get_config_manager')
    def test_disabled_returns_false(self, mock_get_cm):
        """Test that disabled silence schedule returns False."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {"enabled": False},
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Should return False regardless of time
        assert Config.is_silence_mode_active() is False
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_same_day_window_inside(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule with same-day window, time inside."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "10:00",
                "end_time": "14:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to 12:00 (inside window)
        mock_now = Mock()
        mock_now.time.return_value = time(12, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is True
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_same_day_window_outside(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule with same-day window, time outside."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "10:00",
                "end_time": "14:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to 15:00 (outside window)
        mock_now = Mock()
        mock_now.time.return_value = time(15, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is False
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_midnight_spanning_inside_before_midnight(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule spanning midnight, time before midnight."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to 22:00 (after start, before midnight)
        mock_now = Mock()
        mock_now.time.return_value = time(22, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is True
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_midnight_spanning_inside_after_midnight(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule spanning midnight, time after midnight."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to 06:00 (after midnight, before end)
        mock_now = Mock()
        mock_now.time.return_value = time(6, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is True
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_midnight_spanning_outside(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule spanning midnight, time outside window."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to 10:00 (after end, before start)
        mock_now = Mock()
        mock_now.time.return_value = time(10, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is False
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_at_start_time(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule at exact start time."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to exactly 20:00
        mock_now = Mock()
        mock_now.time.return_value = time(20, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is True
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_enabled_at_end_time(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test enabled schedule at exact end time."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        # Mock current time to exactly 08:00
        mock_now = Mock()
        mock_now.time.return_value = time(8, 0)
        mock_datetime.now.return_value = mock_now
        
        assert Config.is_silence_mode_active() is True
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_invalid_time_format_returns_false(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test that invalid time format returns False and logs warning."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "invalid",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        mock_now = Mock()
        mock_now.time.return_value = time(10, 0)
        mock_datetime.now.return_value = mock_now
        
        with patch('src.config.logger') as mock_logger:
            result = Config.is_silence_mode_active()
            assert result is False
            mock_logger.warning.assert_called_once()
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_missing_time_returns_false(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test that missing time values return False."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": None,
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/Los_Angeles"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone
        mock_tz = Mock()
        mock_pytz_timezone.return_value = mock_tz
        
        mock_now = Mock()
        mock_now.time.return_value = time(10, 0)
        mock_datetime.now.return_value = mock_now
        
        with patch('src.config.logger') as mock_logger:
            result = Config.is_silence_mode_active()
            assert result is False
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    def test_uses_configured_timezone(self, mock_datetime, mock_get_cm):
        """Test that silence schedule works with configured timezone."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "America/New_York"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock current time to 22:00 (inside window)
        mock_now = Mock()
        mock_now.time.return_value = time(22, 0)
        mock_datetime.now.return_value = mock_now
        
        # Should work correctly with timezone
        result = Config.is_silence_mode_active()
        assert result is True
    
    @patch('src.config.get_config_manager')
    @patch('src.config.datetime')
    @patch('pytz.timezone')
    def test_invalid_timezone_falls_back_to_system_time(self, mock_pytz_timezone, mock_datetime, mock_get_cm):
        """Test that invalid timezone falls back to system local time."""
        mock_cm = Mock()
        mock_cm.get_feature.side_effect = lambda name: {
            "silence_schedule": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "08:00"
            },
            "datetime": {"timezone": "Invalid/Timezone"}
        }.get(name, {})
        mock_get_cm.return_value = mock_cm
        
        # Mock timezone to raise exception
        import pytz
        mock_pytz_timezone.side_effect = pytz.exceptions.UnknownTimeZoneError("Unknown timezone")
        
        # Mock current time to 22:00 (inside window) - system local time (no timezone)
        mock_now = Mock()
        mock_now.time.return_value = time(22, 0)
        mock_datetime.now.return_value = mock_now
        
        # Should still work, using system local time (fallback)
        result = Config.is_silence_mode_active()
        assert result is True
        # Verify that datetime.now() was called (fallback path)
        assert mock_datetime.now.called


class TestSilenceScheduleConfigManager:
    """Tests for silence schedule in ConfigManager."""
    
    @pytest.fixture
    def temp_config_file(self):
        """Create a temporary config file."""
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{"features": {}}')
            yield f.name
        os.unlink(f.name)
    
    def test_silence_schedule_in_default_config(self):
        """Test that silence_schedule is in DEFAULT_CONFIG."""
        from src.config_manager import DEFAULT_CONFIG
        assert "silence_schedule" in DEFAULT_CONFIG.get("features", {})
        silence_config = DEFAULT_CONFIG["features"]["silence_schedule"]
        assert silence_config["enabled"] is False
        assert silence_config["start_time"] == "20:00"
        assert silence_config["end_time"] == "07:00"
    
    def test_get_feature_returns_defaults_when_missing(self, temp_config_file):
        """Test that get_feature returns defaults when feature not in config."""
        # Reset singleton to allow new config path
        ConfigManager._instance = None
        ConfigManager._lock = threading.Lock()
        
        cm = ConfigManager(config_path=temp_config_file)
        feature = cm.get_feature("silence_schedule")
        
        assert feature is not None
        assert feature["enabled"] is False
        assert feature["start_time"] == "20:00"
        assert feature["end_time"] == "07:00"
        
        # Clean up: reset singleton after test
        ConfigManager._instance = None
    
    def test_set_feature_creates_silence_schedule(self, temp_config_file):
        """Test that set_feature can update silence_schedule."""
        # Reset singleton to allow new config path
        ConfigManager._instance = None
        ConfigManager._lock = threading.Lock()
        
        cm = ConfigManager(config_path=temp_config_file)
        
        success = cm.set_feature("silence_schedule", {
            "enabled": True,
            "start_time": "21:00",
            "end_time": "06:00"
        })
        
        assert success is True
        feature = cm.get_feature("silence_schedule")
        assert feature["enabled"] is True
        assert feature["start_time"] == "21:00"
        assert feature["end_time"] == "06:00"
        
        # Clean up: reset singleton after test
        ConfigManager._instance = None
    
    def test_silence_schedule_in_feature_list(self):
        """Test that silence_schedule is in get_feature_list()."""
        cm = ConfigManager()
        features = cm.get_feature_list()
        assert "silence_schedule" in features

