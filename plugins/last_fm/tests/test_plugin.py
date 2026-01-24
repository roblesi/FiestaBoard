"""Unit tests for Last.fm Now Playing plugin."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from plugins.last_fm import LastFmPlugin, LASTFM_API_URL


class TestLastFmPlugin:
    """Test Last.fm plugin."""
    
    def test_plugin_id(self, sample_manifest):
        """Test plugin ID matches manifest."""
        plugin = LastFmPlugin(sample_manifest)
        assert plugin.plugin_id == "last_fm"
    
    def test_init(self, sample_manifest):
        """Test plugin initialization."""
        plugin = LastFmPlugin(sample_manifest)
        assert plugin._cache is None
        assert plugin._cache_time is None
    
    def test_validate_config_valid(self, sample_manifest, sample_config):
        """Test config validation with valid config."""
        plugin = LastFmPlugin(sample_manifest)
        errors = plugin.validate_config(sample_config)
        assert errors == []
    
    def test_validate_config_missing_username(self, sample_manifest):
        """Test config validation with missing username."""
        plugin = LastFmPlugin(sample_manifest)
        config = {"api_key": "test_key", "refresh_seconds": 30}
        errors = plugin.validate_config(config)
        assert any("username" in e.lower() for e in errors)
    
    def test_validate_config_missing_api_key(self, sample_manifest):
        """Test config validation with missing API key."""
        plugin = LastFmPlugin(sample_manifest)
        config = {"username": "testuser", "refresh_seconds": 30}
        errors = plugin.validate_config(config)
        assert any("api key" in e.lower() for e in errors)
    
    def test_validate_config_invalid_refresh(self, sample_manifest):
        """Test config validation with invalid refresh interval."""
        plugin = LastFmPlugin(sample_manifest)
        config = {"username": "testuser", "api_key": "key", "refresh_seconds": 5}
        errors = plugin.validate_config(config)
        assert any("refresh" in e.lower() or "10 seconds" in e.lower() for e in errors)
    
    @patch.dict('os.environ', {'LASTFM_USERNAME': 'envuser', 'LASTFM_API_KEY': 'envkey'})
    def test_validate_config_from_env(self, sample_manifest):
        """Test config validation uses environment variables as fallback."""
        plugin = LastFmPlugin(sample_manifest)
        config = {}  # Empty config, should use env vars
        errors = plugin.validate_config(config)
        assert errors == []
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_nowplaying(self, mock_get, sample_manifest, sample_config, nowplaying_response):
        """Test fetch_data with currently playing track."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["title"] == "Test Song"
        assert result.data["artist"] == "Test Artist"
        assert result.data["album"] == "Test Album"
        assert result.data["is_playing"] is True
        assert result.data["status"] == "NOW PLAYING"
        assert "extralarge" in result.data["artwork_url"]
        assert "Test Song by Test Artist" in result.data["formatted"]
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_recent_track(self, mock_get, sample_manifest, sample_config, recent_track_response):
        """Test fetch_data with recently played track (not currently playing)."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = recent_track_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["title"] == "Recent Song"
        assert result.data["artist"] == "Recent Artist"
        assert result.data["is_playing"] is False
        assert result.data["status"] == "LAST PLAYED"
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_no_tracks(self, mock_get, sample_manifest, sample_config, empty_tracks_response):
        """Test fetch_data with no recent tracks."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = empty_tracks_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["title"] == ""
        assert result.data["is_playing"] is False
        assert "No recent tracks" in result.data["status"]
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_api_error(self, mock_get, sample_manifest, sample_config, error_response):
        """Test fetch_data handles API error response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = error_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "User not found" in result.error
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_invalid_api_key(self, mock_get, sample_manifest, sample_config):
        """Test fetch_data handles 403 invalid API key."""
        mock_response = Mock()
        mock_response.status_code = 403
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "Invalid API key" in result.error
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_user_not_found(self, mock_get, sample_manifest, sample_config):
        """Test fetch_data handles 404 user not found."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "not found" in result.error.lower()
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_network_error(self, mock_get, sample_manifest, sample_config):
        """Test fetch_data handles network errors."""
        import requests
        mock_get.side_effect = requests.exceptions.ConnectionError("Network error")
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "Network error" in result.error
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_timeout(self, mock_get, sample_manifest, sample_config):
        """Test fetch_data handles timeout."""
        import requests
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "timed out" in result.error.lower()
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_uses_cache(self, mock_get, sample_manifest, sample_config, nowplaying_response):
        """Test fetch_data uses cache within refresh interval."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        # First call
        result1 = plugin.fetch_data()
        assert result1.available is True
        assert mock_get.call_count == 1
        
        # Second call (should use cache)
        result2 = plugin.fetch_data()
        assert result2.available is True
        assert mock_get.call_count == 1  # No additional API call
        assert result2.data["title"] == result1.data["title"]
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_cache_expires(self, mock_get, sample_manifest, sample_config, nowplaying_response):
        """Test fetch_data refreshes cache after interval."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        # First call
        plugin.fetch_data()
        assert mock_get.call_count == 1
        
        # Simulate cache expiration
        plugin._cache_time = datetime.now() - timedelta(seconds=60)
        
        # Second call (should refresh)
        plugin.fetch_data()
        assert mock_get.call_count == 2
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_fallback_to_cache_on_error(self, mock_get, sample_manifest, sample_config, nowplaying_response):
        """Test fetch_data falls back to cache on network error."""
        # First successful call
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result1 = plugin.fetch_data()
        assert result1.available is True
        
        # Simulate cache expiration
        plugin._cache_time = datetime.now() - timedelta(seconds=60)
        
        # Second call fails
        import requests
        mock_get.side_effect = requests.exceptions.ConnectionError("Network error")
        
        result2 = plugin.fetch_data()
        
        # Should return cached data
        assert result2.available is True
        assert result2.data["title"] == "Test Song"
    
    def test_fetch_data_missing_username(self, sample_manifest):
        """Test fetch_data returns error when username missing."""
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = {"api_key": "test_key"}
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "username" in result.error.lower()
    
    def test_fetch_data_missing_api_key(self, sample_manifest):
        """Test fetch_data returns error when API key missing."""
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = {"username": "testuser"}
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "api key" in result.error.lower()
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_artist_as_string(self, mock_get, sample_manifest, sample_config):
        """Test fetch_data handles artist as string (not dict)."""
        response = {
            "recenttracks": {
                "track": [
                    {
                        "name": "Test Song",
                        "artist": "String Artist",  # Artist as string, not dict
                        "album": {"#text": "Test Album"},
                        "image": [],
                        "url": "https://example.com"
                    }
                ]
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["artist"] == "String Artist"
    
    @patch('plugins.last_fm.requests.get')
    def test_fetch_data_single_track_dict(self, mock_get, sample_manifest, sample_config):
        """Test fetch_data handles single track as dict (not list)."""
        response = {
            "recenttracks": {
                "track": {  # Single track as dict, not list
                    "name": "Single Song",
                    "artist": {"#text": "Single Artist"},
                    "album": {"#text": "Single Album"},
                    "image": [],
                    "url": "https://example.com"
                }
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["title"] == "Single Song"
    
    @patch('plugins.last_fm.requests.get')
    def test_get_formatted_display(self, mock_get, sample_manifest, sample_config, nowplaying_response):
        """Test get_formatted_display returns 6 lines."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        lines = plugin.get_formatted_display()
        
        assert lines is not None
        assert len(lines) == 6
        assert "NOW PLAYING" in lines[0]
        assert "Test Song" in lines[2]
        assert "Test Artist" in lines[3]
    
    @patch('plugins.last_fm.requests.get')
    def test_get_formatted_display_with_album(self, mock_get, sample_manifest, nowplaying_response):
        """Test get_formatted_display includes album when configured."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = {
            "username": "testuser",
            "api_key": "test_key",
            "show_album": True
        }
        
        lines = plugin.get_formatted_display()
        
        assert lines is not None
        assert len(lines) == 6
        # Album should be in one of the lines
        assert any("Test Album" in line for line in lines)
    
    def test_cleanup(self, sample_manifest):
        """Test cleanup clears cache."""
        plugin = LastFmPlugin(sample_manifest)
        plugin._cache = {"title": "cached"}
        plugin._cache_time = datetime.now()
        
        plugin.cleanup()
        
        assert plugin._cache is None
        assert plugin._cache_time is None
    
    @patch('plugins.last_fm.requests.get')
    def test_api_request_params(self, mock_get, sample_manifest, sample_config, nowplaying_response):
        """Test correct API parameters are sent."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = nowplaying_response
        mock_get.return_value = mock_response
        
        plugin = LastFmPlugin(sample_manifest)
        plugin.config = sample_config
        
        plugin.fetch_data()
        
        # Check API was called with correct params
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        
        assert call_args[0][0] == LASTFM_API_URL
        params = call_args[1]["params"]
        assert params["method"] == "user.getRecentTracks"
        assert params["user"] == "testuser"
        assert params["api_key"] == "test_api_key_12345"
        assert params["format"] == "json"
        assert params["limit"] == 1
