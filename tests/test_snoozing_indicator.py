"""Tests for snoozing indicator functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, time

from src.main import VestaboardDisplayService
from src.config import Config


class TestSnoozingIndicator:
    """Tests for the snoozing indicator feature."""
    
    def test_add_snoozing_indicator_simple(self):
        """Test adding snoozing indicator to simple content."""
        service = VestaboardDisplayService()
        
        content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6"
        result = service._add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6
        assert "(snoozing)" in lines[5]
        assert lines[5].endswith("(snoozing)")
    
    def test_add_snoozing_indicator_short_last_line(self):
        """Test adding indicator when last line is short."""
        service = VestaboardDisplayService()
        
        content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nShort"
        result = service._add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6
        # Should have space between content and indicator
        assert "Short" in lines[5]
        assert "(snoozing)" in lines[5]
    
    def test_add_snoozing_indicator_long_last_line(self):
        """Test adding indicator when last line is long (needs truncation)."""
        service = VestaboardDisplayService()
        
        # Create content where last line is longer than 11 chars
        content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nThis is a very long line"
        result = service._add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6
        assert "(snoozing)" in lines[5]
        # Should be truncated to make room
        assert len(lines[5]) <= 22  # Vestaboard max width
    
    def test_add_snoozing_indicator_empty_last_line(self):
        """Test adding indicator when last line is empty."""
        service = VestaboardDisplayService()
        
        content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n"
        result = service._add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6
        assert "(snoozing)" in lines[5]
    
    def test_add_snoozing_indicator_fewer_than_six_lines(self):
        """Test adding indicator when content has fewer than 6 lines."""
        service = VestaboardDisplayService()
        
        content = "Line 1\nLine 2\nLine 3"
        result = service._add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6  # Should pad to 6 lines
        assert "(snoozing)" in lines[5]
    
    def test_add_snoozing_indicator_more_than_six_lines(self):
        """Test adding indicator when content has more than 6 lines."""
        service = VestaboardDisplayService()
        
        content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8"
        result = service._add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6  # Should truncate to 6 lines
        assert "(snoozing)" in lines[5]
    
    @patch('src.main.Config')
    @patch.object(VestaboardDisplayService, '_add_snoozing_indicator')
    def test_check_and_send_active_page_adds_indicator_when_silenced(self, mock_add_indicator, mock_config):
        """Test that check_and_send_active_page adds indicator during silence mode."""
        # Setup mocks
        mock_config.is_silence_mode_active.return_value = True
        mock_config.validate.return_value = True
        mock_config.VB_API_MODE = "local"
        mock_config.get_vb_api_key.return_value = "test_key"
        mock_config.VB_HOST = "localhost"
        mock_config.get_transition_settings.return_value = {
            "strategy": None,
            "step_interval_ms": None,
            "step_size": None
        }
        
        service = VestaboardDisplayService()
        service.vb_client = Mock()
        service.vb_client.read_current_message.return_value = None
        service.vb_client.send_characters.return_value = (True, True)
        
        mock_add_indicator.return_value = "Modified content\nwith indicator\n\n\n\n (snoozing)"
        
        # Mock page service
        with patch('src.main.get_page_service') as mock_page_svc:
            with patch('src.main.get_settings_service') as mock_settings_svc:
                mock_page = Mock()
                mock_page.transition_strategy = None
                mock_page.transition_interval_ms = None
                mock_page.transition_step_size = None
                
                mock_result = Mock()
                mock_result.formatted = "Original content"
                mock_result.available = True
                
                mock_page_svc_instance = Mock()
                mock_page_svc_instance.list_pages.return_value = [Mock(id="page1")]
                mock_page_svc_instance.get_page.return_value = mock_page
                mock_page_svc_instance.preview_page.return_value = mock_result
                mock_page_svc.return_value = mock_page_svc_instance
                
                mock_settings_instance = Mock()
                mock_settings_instance.get_active_page_id.return_value = "page1"
                mock_settings_instance.get_transition_settings.return_value = Mock(
                    strategy=None,
                    step_interval_ms=None,
                    step_size=None
                )
                mock_settings_svc.return_value = mock_settings_instance
                
                # Call the method
                result = service.check_and_send_active_page(dev_mode=False)
                
                # Verify indicator was added
                mock_add_indicator.assert_called_once_with("Original content")
    
    @patch('src.main.Config')
    def test_check_and_send_active_page_no_indicator_when_not_silenced(self, mock_config):
        """Test that no indicator is added when silence mode is not active."""
        # Setup mocks
        mock_config.is_silence_mode_active.return_value = False
        mock_config.validate.return_value = True
        mock_config.VB_API_MODE = "local"
        mock_config.get_vb_api_key.return_value = "test_key"
        mock_config.VB_HOST = "localhost"
        mock_config.get_transition_settings.return_value = {
            "strategy": None,
            "step_interval_ms": None,
            "step_size": None
        }
        
        service = VestaboardDisplayService()
        service.vb_client = Mock()
        service.vb_client.read_current_message.return_value = None
        service.vb_client.send_characters.return_value = (True, True)
        
        # Mock page service
        with patch('src.main.get_page_service') as mock_page_svc:
            with patch('src.main.get_settings_service') as mock_settings_svc:
                with patch('src.main.text_to_board_array') as mock_text_to_board:
                    mock_page = Mock()
                    mock_page.transition_strategy = None
                    mock_page.transition_interval_ms = None
                    mock_page.transition_step_size = None
                    
                    mock_result = Mock()
                    mock_result.formatted = "Original content"
                    mock_result.available = True
                    
                    mock_page_svc_instance = Mock()
                    mock_page_svc_instance.list_pages.return_value = [Mock(id="page1")]
                    mock_page_svc_instance.get_page.return_value = mock_page
                    mock_page_svc_instance.preview_page.return_value = mock_result
                    mock_page_svc.return_value = mock_page_svc_instance
                    
                    mock_settings_instance = Mock()
                    mock_settings_instance.get_active_page_id.return_value = "page1"
                    mock_settings_instance.get_transition_settings.return_value = Mock(
                        strategy=None,
                        step_interval_ms=None,
                        step_size=None
                    )
                    mock_settings_svc.return_value = mock_settings_instance
                    
                    mock_text_to_board.return_value = [[0] * 22 for _ in range(6)]
                    
                    # Call the method
                    result = service.check_and_send_active_page(dev_mode=False)
                    
                    # Verify text_to_board_array was called with original content (not modified)
                    mock_text_to_board.assert_called_once_with("Original content")


class TestSnoozingIndicatorAPIServer:
    """Tests for snoozing indicator in API server."""
    
    def test_add_snoozing_indicator_function(self):
        """Test the standalone _add_snoozing_indicator function in api_server."""
        from src.api_server import _add_snoozing_indicator
        
        content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6"
        result = _add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert len(lines) == 6
        assert "(snoozing)" in lines[5]
        assert lines[5].endswith("(snoozing)")
    
    def test_add_snoozing_indicator_maintains_formatting(self):
        """Test that indicator preserves content formatting."""
        from src.api_server import _add_snoozing_indicator
        
        # Test with color markers
        content = "{{red}} Alert\nLine 2\nLine 3\nLine 4\nLine 5\nLast line"
        result = _add_snoozing_indicator(content)
        
        lines = result.split('\n')
        assert "{{red}}" in lines[0]  # Color marker preserved
        assert "(snoozing)" in lines[5]  # Indicator added


class TestSilenceModeStateTransitions:
    """Tests for silence mode state transitions during polling."""
    
    @patch('src.main.Config')
    def test_silence_mode_activation_triggers_update(self, mock_config):
        """Test that entering silence mode triggers board update even if content unchanged."""
        # Setup
        mock_config.is_silence_mode_active.return_value = False  # Initially not in silence mode
        mock_config.validate.return_value = True
        mock_config.VB_API_MODE = "local"
        mock_config.get_vb_api_key.return_value = "test_key"
        mock_config.VB_HOST = "localhost"
        mock_config.get_transition_settings.return_value = {
            "strategy": None,
            "step_interval_ms": None,
            "step_size": None
        }
        
        service = VestaboardDisplayService()
        service.vb_client = Mock()
        service.vb_client.read_current_message.return_value = None
        service.vb_client.send_characters.return_value = (True, True)
        
        with patch('src.main.get_page_service') as mock_page_svc:
            with patch('src.main.get_settings_service') as mock_settings_svc:
                with patch('src.main.text_to_board_array') as mock_text_to_board:
                    # Setup mocks
                    mock_page = Mock()
                    mock_page.transition_strategy = None
                    mock_page.transition_interval_ms = None
                    mock_page.transition_step_size = None
                    
                    mock_result = Mock()
                    mock_result.formatted = "Test content"
                    mock_result.available = True
                    
                    mock_page_svc_instance = Mock()
                    mock_page_svc_instance.list_pages.return_value = [Mock(id="page1")]
                    mock_page_svc_instance.get_page.return_value = mock_page
                    mock_page_svc_instance.preview_page.return_value = mock_result
                    mock_page_svc.return_value = mock_page_svc_instance
                    
                    mock_settings_instance = Mock()
                    mock_settings_instance.get_active_page_id.return_value = "page1"
                    mock_settings_instance.get_transition_settings.return_value = Mock(
                        strategy=None,
                        step_interval_ms=None,
                        step_size=None
                    )
                    mock_settings_svc.return_value = mock_settings_instance
                    
                    mock_text_to_board.return_value = [[0] * 22 for _ in range(6)]
                    
                    # First poll - not in silence mode
                    result1 = service.check_and_send_active_page(dev_mode=False)
                    assert result1 is True  # Content sent
                    assert service._last_silence_mode_active is False
                    
                    # Now activate silence mode
                    mock_config.is_silence_mode_active.return_value = True
                    
                    # Second poll - same content but silence mode activated
                    result2 = service.check_and_send_active_page(dev_mode=False)
                    assert result2 is True  # Should send update due to silence mode change
                    assert service._last_silence_mode_active is True
                    
                    # Verify indicator was added
                    calls = mock_text_to_board.call_args_list
                    assert len(calls) == 2
                    second_call_content = calls[1][0][0]
                    assert "(snoozing)" in second_call_content
    
    @patch('src.main.Config')
    def test_silence_mode_deactivation_triggers_update(self, mock_config):
        """Test that exiting silence mode triggers board update to remove indicator."""
        # Setup - start in silence mode
        mock_config.is_silence_mode_active.return_value = True
        mock_config.validate.return_value = True
        mock_config.VB_API_MODE = "local"
        mock_config.get_vb_api_key.return_value = "test_key"
        mock_config.VB_HOST = "localhost"
        mock_config.get_transition_settings.return_value = {
            "strategy": None,
            "step_interval_ms": None,
            "step_size": None
        }
        
        service = VestaboardDisplayService()
        service.vb_client = Mock()
        service.vb_client.read_current_message.return_value = None
        service.vb_client.send_characters.return_value = (True, True)
        
        with patch('src.main.get_page_service') as mock_page_svc:
            with patch('src.main.get_settings_service') as mock_settings_svc:
                with patch('src.main.text_to_board_array') as mock_text_to_board:
                    # Setup mocks
                    mock_page = Mock()
                    mock_page.transition_strategy = None
                    mock_page.transition_interval_ms = None
                    mock_page.transition_step_size = None
                    
                    mock_result = Mock()
                    mock_result.formatted = "Test content"
                    mock_result.available = True
                    
                    mock_page_svc_instance = Mock()
                    mock_page_svc_instance.list_pages.return_value = [Mock(id="page1")]
                    mock_page_svc_instance.get_page.return_value = mock_page
                    mock_page_svc_instance.preview_page.return_value = mock_result
                    mock_page_svc.return_value = mock_page_svc_instance
                    
                    mock_settings_instance = Mock()
                    mock_settings_instance.get_active_page_id.return_value = "page1"
                    mock_settings_instance.get_transition_settings.return_value = Mock(
                        strategy=None,
                        step_interval_ms=None,
                        step_size=None
                    )
                    mock_settings_svc.return_value = mock_settings_instance
                    
                    mock_text_to_board.return_value = [[0] * 22 for _ in range(6)]
                    
                    # First poll - in silence mode
                    result1 = service.check_and_send_active_page(dev_mode=False)
                    assert result1 is True
                    assert service._last_silence_mode_active is True
                    
                    # Deactivate silence mode
                    mock_config.is_silence_mode_active.return_value = False
                    
                    # Second poll - same content but silence mode deactivated
                    result2 = service.check_and_send_active_page(dev_mode=False)
                    assert result2 is True  # Should send update due to silence mode change
                    assert service._last_silence_mode_active is False
                    
                    # Verify indicator was removed
                    calls = mock_text_to_board.call_args_list
                    assert len(calls) == 2
                    second_call_content = calls[1][0][0]
                    assert "(snoozing)" not in second_call_content
    
    @patch('src.main.Config')
    def test_no_update_when_silence_mode_unchanged(self, mock_config):
        """Test that no update occurs when silence mode and content are both unchanged."""
        # Setup
        mock_config.is_silence_mode_active.return_value = True
        mock_config.validate.return_value = True
        mock_config.VB_API_MODE = "local"
        mock_config.get_vb_api_key.return_value = "test_key"
        mock_config.VB_HOST = "localhost"
        mock_config.get_transition_settings.return_value = {
            "strategy": None,
            "step_interval_ms": None,
            "step_size": None
        }
        
        service = VestaboardDisplayService()
        service.vb_client = Mock()
        service.vb_client.read_current_message.return_value = None
        service.vb_client.send_characters.return_value = (True, True)
        
        with patch('src.main.get_page_service') as mock_page_svc:
            with patch('src.main.get_settings_service') as mock_settings_svc:
                with patch('src.main.text_to_board_array') as mock_text_to_board:
                    # Setup mocks
                    mock_page = Mock()
                    mock_page.transition_strategy = None
                    mock_page.transition_interval_ms = None
                    mock_page.transition_step_size = None
                    
                    mock_result = Mock()
                    mock_result.formatted = "Test content"
                    mock_result.available = True
                    
                    mock_page_svc_instance = Mock()
                    mock_page_svc_instance.list_pages.return_value = [Mock(id="page1")]
                    mock_page_svc_instance.get_page.return_value = mock_page
                    mock_page_svc_instance.preview_page.return_value = mock_result
                    mock_page_svc.return_value = mock_page_svc_instance
                    
                    mock_settings_instance = Mock()
                    mock_settings_instance.get_active_page_id.return_value = "page1"
                    mock_settings_instance.get_transition_settings.return_value = Mock(
                        strategy=None,
                        step_interval_ms=None,
                        step_size=None
                    )
                    mock_settings_svc.return_value = mock_settings_instance
                    
                    mock_text_to_board.return_value = [[0] * 22 for _ in range(6)]
                    
                    # First poll
                    result1 = service.check_and_send_active_page(dev_mode=False)
                    assert result1 is True
                    
                    # Second poll - nothing changed
                    result2 = service.check_and_send_active_page(dev_mode=False)
                    assert result2 is False  # Should not send, nothing changed
                    
                    # Verify only one send occurred
                    assert mock_text_to_board.call_count == 1

