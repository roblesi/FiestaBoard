"""Unit tests for Sports Scores plugin."""

import pytest
from unittest.mock import patch, MagicMock, Mock
import json
from pathlib import Path

from plugins.sports_scores import SportsScoresPlugin
from src.plugins.base import PluginResult


class TestSportsScoresPlugin:
    """Test suite for SportsScoresPlugin."""
    
    def test_plugin_id(self, sample_manifest):
        """Test plugin ID matches directory name."""
        plugin = SportsScoresPlugin(sample_manifest)
        assert plugin.plugin_id == "sports_scores"
    
    def test_validate_config_valid(self, sample_manifest, sample_config):
        """Test config validation with valid config."""
        plugin = SportsScoresPlugin(sample_manifest)
        errors = plugin.validate_config(sample_config)
        assert len(errors) == 0
    
    def test_validate_config_no_sports(self, sample_manifest):
        """Test config validation detects missing sports."""
        plugin = SportsScoresPlugin(sample_manifest)
        errors = plugin.validate_config({"enabled": True})
        assert len(errors) > 0
        assert any("sport" in e.lower() for e in errors)
    
    def test_validate_config_invalid_sport(self, sample_manifest):
        """Test config validation detects invalid sport names."""
        plugin = SportsScoresPlugin(sample_manifest)
        errors = plugin.validate_config({
            "sports": ["InvalidSport", "NFL"]
        })
        assert len(errors) > 0
        assert any("invalid" in e.lower() for e in errors)
    
    def test_validate_config_refresh_too_low(self, sample_manifest):
        """Test config validation detects refresh interval too low."""
        plugin = SportsScoresPlugin(sample_manifest)
        errors = plugin.validate_config({
            "sports": ["NFL"],
            "refresh_seconds": 30
        })
        assert len(errors) > 0
        assert any("refresh" in e.lower() or "60" in e for e in errors)
    
    def test_validate_config_max_games_invalid(self, sample_manifest):
        """Test config validation detects invalid max_games_per_sport."""
        plugin = SportsScoresPlugin(sample_manifest)
        
        # Too low
        errors = plugin.validate_config({
            "sports": ["NFL"],
            "max_games_per_sport": 0
        })
        assert len(errors) > 0
        
        # Too high
        errors = plugin.validate_config({
            "sports": ["NFL"],
            "max_games_per_sport": 15
        })
        assert len(errors) > 0
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_success_free_tier(self, mock_get, sample_manifest, sample_config, mock_api_response_nfl):
        """Test successful data fetch with free tier API key."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_api_response_nfl
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.error is None
        assert result.data is not None
        assert "games" in result.data
        assert len(result.data["games"]) > 0
        assert result.data["sport_count"] == 2
        assert result.data["game_count"] > 0
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_success_with_api_key(self, mock_get, sample_manifest, sample_config, mock_api_response_nfl):
        """Test successful data fetch with custom API key."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_api_response_nfl
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = {
            **sample_config,
            "api_key": "custom_key_123"
        }
        result = plugin.fetch_data()
        
        assert result.available is True
        # Verify API key was used in request
        call_args = mock_get.call_args
        assert "custom_key_123" in call_args[0][0] or "custom_key_123" in str(call_args)
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_no_sports(self, mock_get, sample_manifest):
        """Test fetch with no sports selected."""
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = {"enabled": True}
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "sport" in result.error.lower()
        mock_get.assert_not_called()
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_rate_limit(self, mock_get, sample_manifest, sample_config):
        """Test handling of API rate limit (429)."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        # Should handle gracefully, may return empty games or error
        # The plugin should not crash
        assert result is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_network_error(self, mock_get, sample_manifest, sample_config):
        """Test handling of network errors."""
        import requests
        mock_get.side_effect = requests.exceptions.RequestException("Network error")
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        # Should handle gracefully
        assert result is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_empty_response(self, mock_get, sample_manifest, sample_config, mock_api_response_empty):
        """Test handling of empty API response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_api_response_empty
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        # Should handle empty response
        assert result is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_no_events(self, mock_get, sample_manifest, sample_config, mock_api_response_no_events):
        """Test handling when API returns no events."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_api_response_no_events
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is False
        assert "no games" in result.error.lower() or "no events" in result.error.lower()
    
    @patch('plugins.sports_scores.requests.get')
    def test_fetch_data_multiple_sports(self, mock_get, sample_manifest, sample_config, mock_api_response_nfl, mock_api_response_nba):
        """Test fetching data for multiple sports."""
        # Return different responses for different sports
        def side_effect(*args, **kwargs):
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.raise_for_status = Mock()
            mock_response.headers = {"content-type": "application/json"}
            
            # Check which sport is being requested
            if "American%20Football" in args[0] or "American" in str(kwargs):
                mock_response.json.return_value = mock_api_response_nfl
            elif "Basketball" in args[0] or "Basketball" in str(kwargs):
                mock_response.json.return_value = mock_api_response_nba
            else:
                mock_response.json.return_value = {"event": []}
            
            return mock_response
        
        mock_get.side_effect = side_effect
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["sport_count"] == 2
        assert result.data["game_count"] > 0
        assert len(result.data["games"]) > 0
    
    @patch('plugins.sports_scores.requests.get')
    def test_parse_event_with_scores(self, mock_get, sample_manifest, sample_config, mock_api_response_nfl):
        """Test parsing event with scores."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_api_response_nfl
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        assert len(games) > 0
        
        first_game = games[0]
        assert "team1" in first_game
        assert "team2" in first_game
        assert "score1" in first_game
        assert "score2" in first_game
        assert "formatted" in first_game
        assert first_game["score1"] >= 0
        assert first_game["score2"] >= 0
    
    @patch('plugins.sports_scores.requests.get')
    def test_parse_event_scheduled_game(self, mock_get, sample_manifest, sample_config):
        """Test parsing scheduled game (no scores yet)."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Lakers vs Warriors",
                    "strHomeTeam": "Los Angeles Lakers",
                    "strAwayTeam": "Golden State Warriors",
                    "intHomeScore": None,
                    "intAwayScore": None,
                    "strStatus": "Not Started",
                    "dateEvent": "2024-01-20",
                    "strTime": "22:30:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        if len(games) > 0:
            game = games[0]
            assert game["score1"] == 0 or game["score1"] is not None
            assert game["score2"] == 0 or game["score2"] is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_max_games_per_sport_limit(self, mock_get, sample_manifest, sample_config):
        """Test that max_games_per_sport limit is respected."""
        # Create response with many events
        many_events = {
            "event": [
                {
                    "strEvent": f"Game {i}",
                    "strHomeTeam": f"Team A {i}",
                    "strAwayTeam": f"Team B {i}",
                    "intHomeScore": "10",
                    "intAwayScore": "5",
                    "strStatus": "Match Finished",
                    "dateEvent": "2024-01-15",
                    "strTime": "20:00:00"
                }
                for i in range(20)
            ]
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = many_events
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = {
            **sample_config,
            "max_games_per_sport": 3
        }
        result = plugin.fetch_data()
        
        assert result.available is True
        # Should only get max_games_per_sport games per sport
        # With 2 sports and max 3 each, should have at most 6 games
        assert result.data["game_count"] <= 6
    
    def test_get_formatted_display(self, sample_manifest, sample_config):
        """Test get_formatted_display method."""
        with patch('plugins.sports_scores.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "event": [
                    {
                        "strEvent": "Lakers vs Warriors",
                        "strHomeTeam": "Los Angeles Lakers",
                        "strAwayTeam": "Golden State Warriors",
                        "intHomeScore": "98",
                        "intAwayScore": "95",
                        "strStatus": "Match Finished",
                        "dateEvent": "2024-01-15",
                        "strTime": "22:30:00"
                    }
                ]
            }
            mock_response.raise_for_status = Mock()
            mock_response.headers = {"content-type": "application/json"}
            mock_get.return_value = mock_response
            
            plugin = SportsScoresPlugin(sample_manifest)
            plugin.config = sample_config
            display = plugin.get_formatted_display()
            
            assert display is not None
            assert isinstance(display, list)
            assert len(display) == 6
            assert "SPORTS SCORES" in display[0]
    
    def test_get_formatted_display_no_cache(self, sample_manifest):
        """Test get_formatted_display when no cache exists."""
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = {"sports": []}  # Invalid config
        
        display = plugin.get_formatted_display()
        # Should return None when fetch fails
        assert display is None
    
    def test_data_variables_match_manifest(self, sample_manifest, sample_config):
        """Test that returned data includes variables declared in manifest."""
        import json
        from pathlib import Path
        
        manifest_path = Path(__file__).parent.parent / "manifest.json"
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        declared_simple = manifest["variables"]["simple"]
        
        with patch('plugins.sports_scores.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "event": [
                    {
                        "strEvent": "Test Game",
                        "strHomeTeam": "Team A",
                        "strAwayTeam": "Team B",
                        "intHomeScore": "10",
                        "intAwayScore": "5",
                        "strStatus": "Match Finished",
                        "dateEvent": "2024-01-15",
                        "strTime": "20:00:00"
                    }
                ]
            }
            mock_response.raise_for_status = Mock()
            mock_response.headers = {"content-type": "application/json"}
            mock_get.return_value = mock_response
            
            plugin = SportsScoresPlugin(sample_manifest)
            plugin.config = sample_config
            result = plugin.fetch_data()
            
            assert result.available is True
            for var in declared_simple:
                assert var in result.data, f"Variable '{var}' declared in manifest but not in data"


class TestPluginEdgeCases:
    """Tests for edge cases and error handling."""
    
    @patch('plugins.sports_scores.requests.get')
    def test_malformed_response_handling(self, mock_get, sample_manifest, sample_config):
        """Test handling of malformed API responses."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"invalid": "data"}  # Missing "event" key
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        # Should handle gracefully
        assert result is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_timeout_handling(self, mock_get, sample_manifest, sample_config):
        """Test handling of request timeouts."""
        import requests
        mock_get.side_effect = requests.exceptions.Timeout("Request timeout")
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        # Should handle gracefully
        assert result is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_event_missing_teams(self, mock_get, sample_manifest, sample_config):
        """Test handling of events with missing team names."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Invalid Game",
                    "strHomeTeam": "",  # Missing team
                    "strAwayTeam": "Team B",
                    "intHomeScore": "10",
                    "intAwayScore": "5",
                    "strStatus": "Match Finished",
                    "dateEvent": "2024-01-15",
                    "strTime": "20:00:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        # Should skip invalid events
        assert result is not None
    
    @patch('plugins.sports_scores.requests.get')
    def test_color_variables_winning_team(self, mock_get, sample_manifest, sample_config):
        """Test that team1_color and team2_color return correct color codes for winning/losing teams."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Team A vs Team B",
                    "strHomeTeam": "Team A",
                    "strAwayTeam": "Team B",
                    "intHomeScore": "24",
                    "intAwayScore": "17",
                    "strStatus": "Match Finished",
                    "dateEvent": "2024-01-15",
                    "strTime": "20:00:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        assert len(games) > 0
        
        game = games[0]
        # Team 1 (home) is winning (24 > 17), so team1_color should be GREEN {66}
        assert game["team1_color"] == "{66}"
        # Team 2 (away) is losing, so team2_color should be RED {63}
        assert game["team2_color"] == "{63}"
    
    @patch('plugins.sports_scores.requests.get')
    def test_color_variables_losing_team(self, mock_get, sample_manifest, sample_config):
        """Test that team1_color and team2_color return correct color codes when team1 is losing."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Team A vs Team B",
                    "strHomeTeam": "Team A",
                    "strAwayTeam": "Team B",
                    "intHomeScore": "10",
                    "intAwayScore": "20",
                    "strStatus": "Match Finished",
                    "dateEvent": "2024-01-15",
                    "strTime": "20:00:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        game = games[0]
        # Team 1 is losing (10 < 20), so team1_color should be RED {63}
        assert game["team1_color"] == "{63}"
        # Team 2 is winning, so team2_color should be GREEN {66}
        assert game["team2_color"] == "{66}"
    
    @patch('plugins.sports_scores.requests.get')
    def test_color_variables_tied_game(self, mock_get, sample_manifest, sample_config):
        """Test that team1_color and team2_color return YELLOW for tied games."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Team A vs Team B",
                    "strHomeTeam": "Team A",
                    "strAwayTeam": "Team B",
                    "intHomeScore": "15",
                    "intAwayScore": "15",
                    "strStatus": "Match Finished",
                    "dateEvent": "2024-01-15",
                    "strTime": "20:00:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        game = games[0]
        # Both teams tied, so both should be YELLOW {65}
        assert game["team1_color"] == "{65}"
        assert game["team2_color"] == "{65}"
    
    @patch('plugins.sports_scores.requests.get')
    def test_color_variables_no_scores(self, mock_get, sample_manifest, sample_config):
        """Test that team1_color and team2_color return BLUE when no scores are available."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Team A vs Team B",
                    "strHomeTeam": "Team A",
                    "strAwayTeam": "Team B",
                    "intHomeScore": None,
                    "intAwayScore": None,
                    "strStatus": "Not Started",
                    "dateEvent": "2024-01-20",
                    "strTime": "20:00:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        if len(games) > 0:
            game = games[0]
            # No scores (0-0), so both should be BLUE {67}
            assert game["team1_color"] == "{67}"
            assert game["team2_color"] == "{67}"
            # Formatted string should use "? - ?" for scores
            assert "? - ?" in game["formatted"]
    
    def test_abbreviate_team_name_removes_spaces(self, sample_manifest):
        """Test that team name abbreviation removes spaces."""
        plugin = SportsScoresPlugin(sample_manifest)
        
        # Test that spaces are removed
        result = plugin._abbreviate_team_name("Real Sociedad", 10)
        assert " " not in result
        assert "Soc" in result or "Real" in result
        
        # Test common abbreviation
        result = plugin._abbreviate_team_name("Real Sociedad", 5)
        assert " " not in result
        assert len(result) <= 5
    
    def test_format_game_string_exact_width(self, sample_manifest):
        """Test that formatted game string is exactly 20 characters (for use with color tiles)."""
        plugin = SportsScoresPlugin(sample_manifest)
        
        # Test with scores
        formatted = plugin._format_game_string("Team A", "Team B", 24, 17, max_length=20)
        assert len(formatted) == 20
        
        # Test with no scores (should use "? - ?")
        formatted = plugin._format_game_string("Team A", "Team B", 0, 0, max_length=20)
        assert len(formatted) == 20
        assert "? - ?" in formatted
    
    def test_format_game_string_alignment(self, sample_manifest):
        """Test that formatted game string aligns scores vertically."""
        plugin = SportsScoresPlugin(sample_manifest)
        
        # Format multiple games and check that scores align
        game1 = plugin._format_game_string("Short", "LongTeamName", 100, 99, max_length=20)
        game2 = plugin._format_game_string("VeryLongTeam", "Short", 50, 49, max_length=20)
        
        # Both should be exactly 20 characters
        assert len(game1) == 20
        assert len(game2) == 20
        
        # Find the position of the score separator "-" - it should be similar
        # (allowing for slight variation due to team name lengths)
        dash_pos_1 = game1.find(" - ")
        dash_pos_2 = game2.find(" - ")
        # The dash should be in roughly the same position (within 2 chars for alignment)
        assert abs(dash_pos_1 - dash_pos_2) <= 2
    
    def test_format_game_string_no_scores_question_marks(self, sample_manifest):
        """Test that formatted string uses "? - ?" when no scores are available."""
        plugin = SportsScoresPlugin(sample_manifest)
        
        formatted = plugin._format_game_string("Team A", "Team B", 0, 0, max_length=20)
        assert "? - ?" in formatted
        assert formatted.count("?") >= 2  # Should have at least 2 question marks
    
    @patch('plugins.sports_scores.requests.get')
    def test_formatted_string_includes_color_variables(self, mock_get, sample_manifest, sample_config):
        """Test that games include both formatted string and color variables."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "event": [
                {
                    "strEvent": "Team A vs Team B",
                    "strHomeTeam": "Team A",
                    "strAwayTeam": "Team B",
                    "intHomeScore": "24",
                    "intAwayScore": "17",
                    "strStatus": "Match Finished",
                    "dateEvent": "2024-01-15",
                    "strTime": "20:00:00"
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_response.headers = {"content-type": "application/json"}
        mock_get.return_value = mock_response
        
        plugin = SportsScoresPlugin(sample_manifest)
        plugin.config = sample_config
        result = plugin.fetch_data()
        
        assert result.available is True
        games = result.data["games"]
        assert len(games) > 0
        
        game = games[0]
        # Should have all required fields including colors
        assert "team1_color" in game
        assert "team2_color" in game
        assert "formatted" in game
        # Formatted should be exactly 20 characters (for use with 2 color tiles = 22 total)
        assert len(game["formatted"]) == 20
        # Colors should be in {CODE} format
        assert game["team1_color"].startswith("{") and game["team1_color"].endswith("}")
        assert game["team2_color"].startswith("{") and game["team2_color"].endswith("}")