"""Updated tests for silence schedule feature with UTC storage."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, time

from src.config import Config
from src.config_manager import ConfigManager, get_config_manager
from src.time_service import TimeService, get_time_service, reset_time_service


class TestSilenceScheduleUTCStorage:
    """Tests for silence schedule with UTC storage format."""
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_with_utc_format(self, mock_get_cm):
        """Test that silence schedule works with UTC ISO format."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {
            "enabled": True,
            "start_time": "03:00+00:00",  # UTC format
            "end_time": "14:00+00:00"
        }
        mock_cm.migrate_silence_schedule_to_utc = Mock()
        mock_get_cm.return_value = mock_cm
        
        # Mock TimeService to return that we're in the window
        with patch('src.config.get_time_service') as mock_get_ts:
            mock_ts = Mock()
            mock_ts.is_time_in_window.return_value = True
            mock_get_ts.return_value = mock_ts
            
            result = Config.is_silence_mode_active()
            
            assert result is True
            mock_ts.is_time_in_window.assert_called_once_with("03:00+00:00", "14:00+00:00")
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_disabled(self, mock_get_cm):
        """Test that disabled silence schedule returns False."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {"enabled": False}
        mock_cm.migrate_silence_schedule_to_utc = Mock()
        mock_get_cm.return_value = mock_cm
        
        result = Config.is_silence_mode_active()
        
        assert result is False
    
    @patch('src.config.get_config_manager')
    def test_silence_schedule_outside_window(self, mock_get_cm):
        """Test that time outside window returns False."""
        mock_cm = Mock()
        mock_cm.get_feature.return_value = {
            "enabled": True,
            "start_time": "03:00+00:00",
            "end_time": "14:00+00:00"
        }
        mock_cm.migrate_silence_schedule_to_utc = Mock()
        mock_get_cm.return_value = mock_cm
        
        with patch('src.config.get_time_service') as mock_get_ts:
            mock_ts = Mock()
            mock_ts.is_time_in_window.return_value = False
            mock_get_ts.return_value = mock_ts
            
            result = Config.is_silence_mode_active()
            
            assert result is False


class TestSilenceScheduleMigration:
    """Tests for silence schedule migration from old format to UTC."""
    
    def test_migration_detects_old_format(self):
        """Test that migration detects old HH:MM format."""
        reset_time_service()
        
        # Create a config manager with old format
        import tempfile
        import os
        import json
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {
                "features": {
                    "silence_schedule": {
                        "enabled": True,
                        "start_time": "20:00",  # Old format
                        "end_time": "07:00"
                    },
                    "datetime": {
                        "timezone": "America/Los_Angeles"
                    }
                },
                "general": {
                    "timezone": "America/Los_Angeles"
                }
            }
            json.dump(config, f)
            temp_path = f.name
        
        try:
            # Reset singleton
            ConfigManager._instance = None
            ConfigManager._lock = __import__('threading').Lock()
            
            cm = ConfigManager(config_path=temp_path)
            
            # Trigger migration
            migrated = cm.migrate_silence_schedule_to_utc()
            
            assert migrated is True
            
            # Check that times are now in UTC format
            silence_config = cm.get_feature("silence_schedule")
            assert "+00:00" in silence_config["start_time"]
            assert "+00:00" in silence_config["end_time"]
            assert len(silence_config["start_time"]) > 5  # Longer than HH:MM
            
        finally:
            os.unlink(temp_path)
            ConfigManager._instance = None
    
    def test_migration_skips_new_format(self):
        """Test that migration skips already-migrated configs."""
        reset_time_service()
        
        import tempfile
        import os
        import json
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {
                "features": {
                    "silence_schedule": {
                        "enabled": True,
                        "start_time": "04:00+00:00",  # Already UTC format
                        "end_time": "15:00+00:00"
                    }
                },
                "general": {
                    "timezone": "America/Los_Angeles"
                }
            }
            json.dump(config, f)
            temp_path = f.name
        
        try:
            ConfigManager._instance = None
            ConfigManager._lock = __import__('threading').Lock()
            
            cm = ConfigManager(config_path=temp_path)
            
            # Try migration
            migrated = cm.migrate_silence_schedule_to_utc()
            
            assert migrated is False  # Should not migrate
            
        finally:
            os.unlink(temp_path)
            ConfigManager._instance = None


class TestTimeServiceIntegration:
    """Tests for TimeService integration with silence schedule."""
    
    def test_time_service_window_check(self):
        """Test TimeService correctly checks time windows."""
        reset_time_service()
        ts = get_time_service()
        
        # Mock current time to be 12:00 UTC
        with patch('src.time_service.datetime') as mock_dt:
            mock_now = MagicMock()
            mock_now.time.return_value = time(12, 0)
            mock_dt.now.return_value = mock_now
            
            # Window: 10:00 UTC to 14:00 UTC (should be inside)
            result = ts.is_time_in_window("10:00+00:00", "14:00+00:00")
            assert result is True
            
            # Window: 15:00 UTC to 18:00 UTC (should be outside)
            result = ts.is_time_in_window("15:00+00:00", "18:00+00:00")
            assert result is False
    
    def test_time_service_midnight_spanning(self):
        """Test TimeService handles midnight-spanning windows."""
        reset_time_service()
        ts = get_time_service()
        
        # Mock current time to be 22:00 UTC (10pm)
        with patch('src.time_service.datetime') as mock_dt:
            mock_now = MagicMock()
            mock_now.time.return_value = time(22, 0)
            mock_dt.now.return_value = mock_now
            
            # Window: 20:00 UTC to 08:00 UTC (spans midnight, should be inside)
            result = ts.is_time_in_window("20:00+00:00", "08:00+00:00")
            assert result is True
        
        # Mock current time to be 06:00 UTC (6am)
        with patch('src.time_service.datetime') as mock_dt:
            mock_now = MagicMock()
            mock_now.time.return_value = time(6, 0)
            mock_dt.now.return_value = mock_now
            
            # Same window (should still be inside)
            result = ts.is_time_in_window("20:00+00:00", "08:00+00:00")
            assert result is True
        
        # Mock current time to be 12:00 UTC (noon)
        with patch('src.time_service.datetime') as mock_dt:
            mock_now = MagicMock()
            mock_now.time.return_value = time(12, 0)
            mock_dt.now.return_value = mock_now
            
            # Same window (should be outside)
            result = ts.is_time_in_window("20:00+00:00", "08:00+00:00")
            assert result is False


class TestConfigManagerGeneralSettings:
    """Tests for general settings in ConfigManager."""
    
    def test_get_general_returns_timezone(self):
        """Test that get_general returns timezone."""
        reset_time_service()
        
        import tempfile
        import os
        import json
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {
                "general": {
                    "timezone": "America/New_York",
                    "refresh_interval_seconds": 300
                }
            }
            json.dump(config, f)
            temp_path = f.name
        
        try:
            ConfigManager._instance = None
            ConfigManager._lock = __import__('threading').Lock()
            
            cm = ConfigManager(config_path=temp_path)
            general = cm.get_general()
            
            assert general["timezone"] == "America/New_York"
            assert general["refresh_interval_seconds"] == 300
            
        finally:
            os.unlink(temp_path)
            ConfigManager._instance = None
    
    def test_set_general_updates_timezone(self):
        """Test that set_general updates timezone."""
        reset_time_service()
        
        import tempfile
        import os
        import json
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {"general": {"timezone": "America/Los_Angeles"}}
            json.dump(config, f)
            temp_path = f.name
        
        try:
            ConfigManager._instance = None
            ConfigManager._lock = __import__('threading').Lock()
            
            cm = ConfigManager(config_path=temp_path)
            
            # Update timezone
            success = cm.set_general({"timezone": "America/New_York"})
            
            assert success is True
            
            # Verify it was saved
            general = cm.get_general()
            assert general["timezone"] == "America/New_York"
            
        finally:
            os.unlink(temp_path)
            ConfigManager._instance = None

