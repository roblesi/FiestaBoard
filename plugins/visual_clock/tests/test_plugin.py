"""Tests for Visual Clock plugin."""

from unittest.mock import patch
from datetime import datetime
import pytz

from plugins.visual_clock import VisualClockPlugin, DIGIT_PATTERNS, COLON_PATTERN, COLOR_MAP, COLOR_PATTERNS  # noqa: E501
from src.board_chars import BoardChars


class TestPluginId:
    """Tests for plugin_id property."""
    
    def test_plugin_id(self, manifest):
        """Test that plugin_id returns correct value."""
        plugin = VisualClockPlugin(manifest)
        assert plugin.plugin_id == "visual_clock"


class TestValidateConfig:
    """Tests for validate_config method."""
    
    def test_valid_config(self, manifest):
        """Test validation passes with valid config."""
        plugin = VisualClockPlugin(manifest)
        config = {
            "timezone": "America/New_York",
            "time_format": "12h",
            "color_pattern": "solid",
            "digit_color": "yellow",
            "background_color": "black",
        }
        errors = plugin.validate_config(config)
        assert errors == []
    
    def test_invalid_color_pattern(self, manifest):
        """Test validation fails with invalid color pattern."""
        plugin = VisualClockPlugin(manifest)
        config = {"color_pattern": "invalid_pattern"}
        errors = plugin.validate_config(config)
        assert len(errors) == 1
        assert "Invalid color pattern" in errors[0]
    
    def test_invalid_timezone(self, manifest):
        """Test validation fails with invalid timezone."""
        plugin = VisualClockPlugin(manifest)
        config = {"timezone": "Invalid/Timezone"}
        errors = plugin.validate_config(config)
        assert len(errors) == 1
        assert "Invalid timezone" in errors[0]
    
    def test_invalid_time_format(self, manifest):
        """Test validation fails with invalid time format."""
        plugin = VisualClockPlugin(manifest)
        config = {"time_format": "25h"}
        errors = plugin.validate_config(config)
        assert len(errors) == 1
        assert "Invalid time format" in errors[0]
    
    def test_invalid_digit_color(self, manifest):
        """Test validation fails with invalid digit color."""
        plugin = VisualClockPlugin(manifest)
        config = {"digit_color": "pink"}
        errors = plugin.validate_config(config)
        assert len(errors) == 1
        assert "Invalid digit color" in errors[0]
    
    def test_invalid_background_color(self, manifest):
        """Test validation fails with invalid background color."""
        plugin = VisualClockPlugin(manifest)
        config = {"background_color": "rainbow"}
        errors = plugin.validate_config(config)
        assert len(errors) == 1
        assert "Invalid background color" in errors[0]
    
    def test_multiple_errors(self, manifest):
        """Test validation returns multiple errors."""
        plugin = VisualClockPlugin(manifest)
        config = {
            "timezone": "Invalid/TZ",
            "time_format": "99h",
            "digit_color": "neon",
            "background_color": "transparent",
        }
        errors = plugin.validate_config(config)
        assert len(errors) == 4


class TestFetchData:
    """Tests for fetch_data method."""
    
    def test_fetch_data_success_12h(self, manifest):
        """Test fetch_data returns valid data in 12h format."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "America/Los_Angeles",
            "time_format": "12h",
            "color_pattern": "solid",
            "digit_color": "white",
            "background_color": "black",
        }
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.error is None
        assert "visual_clock" in result.data
        assert "visual_clock_array" in result.data
        assert "time" in result.data
        assert "time_format" in result.data
        assert result.data["time_format"] == "12h"
    
    def test_fetch_data_success_24h(self, manifest):
        """Test fetch_data returns valid data in 24h format."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "America/Los_Angeles",
            "time_format": "24h",
            "color_pattern": "solid",
            "digit_color": "green",
            "background_color": "black",
        }
        
        result = plugin.fetch_data()
        
        assert result.available is True
        assert result.data["time_format"] == "24h"
    
    def test_fetch_data_array_dimensions(self, manifest):
        """Test that visual_clock_array has correct dimensions."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "UTC",
            "time_format": "24h",
            "color_pattern": "solid",
            "digit_color": "white",
            "background_color": "black",
        }
        
        result = plugin.fetch_data()
        array = result.data["visual_clock_array"]
        
        assert len(array) == 6  # 6 rows
        for row in array:
            assert len(row) == 22  # 22 columns
    
    def test_fetch_data_with_exception(self, manifest):
        """Test fetch_data handles exceptions gracefully."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "Invalid/Timezone",
        }
        
        result = plugin.fetch_data()
        
        assert result.available is False
        assert result.error is not None


class TestGenerateClockDisplay:
    """Tests for _generate_clock_display method."""
    
    def test_clock_display_dimensions(self, manifest):
        """Test generated display has correct dimensions."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(12, 34, "solid", "white", "black")
        
        assert len(display) == 6
        for row in display:
            assert len(row) == 22
    
    def test_clock_display_colors_solid(self, manifest):
        """Test display uses correct color codes for solid pattern."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(12, 34, "solid", "white", "black")
        
        # Check that only valid color codes are used
        valid_codes = {BoardChars.WHITE, BoardChars.BLACK}
        for row in display:
            for code in row:
                assert code in valid_codes
    
    def test_clock_display_single_digit_hour(self, manifest):
        """Test display with single digit hour (e.g., 9:00)."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(9, 0, "solid", "white", "black")
        
        # First digit position should be background (h1=0 not drawn)
        # Check row 1 (where digits start), h1 starts at column 0
        assert display[1][0] == BoardChars.BLACK  # First digit not drawn
    
    def test_clock_display_double_digit_hour(self, manifest):
        """Test display with double digit hour (e.g., 12:00)."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(12, 0, "solid", "white", "black")
        
        # First digit position should have digit color
        # h1 starts at column 0, digit "1" pattern is centered with pixels at cols 0-2
        assert display[1][0] == BoardChars.WHITE  # "1" pattern has full-width base
        assert display[1][1] == BoardChars.WHITE  # "1" pattern has pixel at col 1
        assert display[1][2] == BoardChars.WHITE  # "1" pattern has pixel at col 2
    
    def test_clock_display_pride_pattern(self, manifest):
        """Test Pride pattern uses per-row colors."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(12, 34, "pride", "white", "black")
        
        # Pride pattern should use different colors per row
        # Row 0 should be red, row 1 orange, etc.
        # Check that colors are used (not just black/white)
        all_colors = set()
        for row in display:
            for code in row:
                all_colors.add(code)
        
        # Should have multiple colors (not just solid)
        assert len(all_colors) > 2  # More than just black and one other color
    
    def test_clock_display_rainbow_pattern(self, manifest):
        """Test Rainbow pattern uses per-digit colors."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(12, 34, "rainbow", "white", "black")
        
        # Rainbow pattern should use different colors per digit
        # Check that colors are used
        all_colors = set()
        for row in display:
            for code in row:
                all_colors.add(code)
        
        # Should have multiple colors
        assert len(all_colors) > 2
    
    def test_clock_display_sunset_pattern(self, manifest):
        """Test Sunset pattern uses gradient colors."""
        plugin = VisualClockPlugin(manifest)
        display = plugin._generate_clock_display(12, 34, "sunset", "white", "black")
        
        # Sunset should have warm colors (red, orange, yellow)
        all_colors = set()
        for row in display:
            for code in row:
                all_colors.add(code)
        
        # Should have warm colors
        warm_colors = {BoardChars.RED, BoardChars.ORANGE, BoardChars.YELLOW}
        assert len(all_colors.intersection(warm_colors)) > 0


class TestDrawDigit:
    """Tests for _draw_digit method."""
    
    def test_draw_digit_zero(self, manifest):
        """Test drawing digit 0."""
        plugin = VisualClockPlugin(manifest)
        board = [[BoardChars.BLACK] * 22 for _ in range(6)]
        
        plugin._draw_digit(board, 0, 0, 0, BoardChars.WHITE, BoardChars.BLACK)
        
        # Check corners of digit 0 (should be filled)
        assert board[0][0] == BoardChars.WHITE
        assert board[0][3] == BoardChars.WHITE
        assert board[4][0] == BoardChars.WHITE
        assert board[4][3] == BoardChars.WHITE
        
        # Check center row middle (should be background for "0" hole)
        assert board[2][2] == BoardChars.BLACK
    
    def test_draw_all_digits(self, manifest):
        """Test that all digits (0-9) can be drawn without error."""
        plugin = VisualClockPlugin(manifest)
        
        for digit in range(10):
            board = [[BoardChars.BLACK] * 22 for _ in range(6)]
            plugin._draw_digit(board, digit, 0, 0, BoardChars.WHITE, BoardChars.BLACK)
            # Just verify no exception is raised


class TestDrawColon:
    """Tests for _draw_colon method."""
    
    def test_draw_colon(self, manifest):
        """Test drawing colon pattern."""
        plugin = VisualClockPlugin(manifest)
        board = [[BoardChars.BLACK] * 22 for _ in range(6)]
        
        plugin._draw_colon(board, 0, 0, BoardChars.WHITE, BoardChars.BLACK)
        
        # Check colon dots (rows 1 and 4 should have dots for 6-row pattern)
        assert board[1][0] == BoardChars.WHITE
        assert board[1][1] == BoardChars.WHITE
        assert board[4][0] == BoardChars.WHITE
        assert board[4][1] == BoardChars.WHITE
        
        # Check empty rows (0, 2, 3, 5 should be background)
        assert board[0][0] == BoardChars.BLACK
        assert board[2][0] == BoardChars.BLACK
        assert board[3][0] == BoardChars.BLACK
        assert board[5][0] == BoardChars.BLACK


class TestArrayToString:
    """Tests for _array_to_string method."""
    
    def test_array_to_string_basic(self, manifest):
        """Test converting array to string with color markers."""
        plugin = VisualClockPlugin(manifest)
        array = [
            [BoardChars.YELLOW, BoardChars.BLACK],
            [BoardChars.BLACK, BoardChars.YELLOW],
        ]
        
        result = plugin._array_to_string(array)
        
        assert "{yellow}" in result
        assert "{black}" in result
        assert "\n" in result
    
    def test_array_to_string_all_colors(self, manifest):
        """Test that all color codes are converted correctly."""
        plugin = VisualClockPlugin(manifest)
        
        # Test each color
        for color_name, code in COLOR_MAP.items():
            array = [[code]]
            result = plugin._array_to_string(array)
            assert f"{{{color_name}}}" in result


class TestDigitPatterns:
    """Tests for digit pattern definitions."""
    
    def test_all_digits_defined(self):
        """Test that patterns exist for all digits 0-9."""
        for digit in range(10):
            assert digit in DIGIT_PATTERNS
    
    def test_digit_pattern_dimensions(self):
        """Test that all digit patterns have correct dimensions."""
        for digit, pattern in DIGIT_PATTERNS.items():
            assert len(pattern) == 6, f"Digit {digit} should have 6 rows"
            for row in pattern:
                assert len(row) == 4, f"Digit {digit} should have 4 columns"
    
    def test_digit_pattern_values(self):
        """Test that all digit patterns contain only 0 and 1."""
        for digit, pattern in DIGIT_PATTERNS.items():
            for row in pattern:
                for val in row:
                    assert val in (0, 1), f"Digit {digit} has invalid value {val}"


class TestColonPattern:
    """Tests for colon pattern definition."""
    
    def test_colon_pattern_dimensions(self):
        """Test colon pattern has correct dimensions."""
        assert len(COLON_PATTERN) == 6
        for row in COLON_PATTERN:
            assert len(row) == 2
    
    def test_colon_pattern_dots(self):
        """Test colon has dots in correct positions."""
        # Dots should be at rows 1 and 4 (for 6-row pattern)
        assert COLON_PATTERN[1] == [1, 1]
        assert COLON_PATTERN[4] == [1, 1]
        
        # Empty rows should be 0
        assert COLON_PATTERN[0] == [0, 0]
        assert COLON_PATTERN[2] == [0, 0]
        assert COLON_PATTERN[3] == [0, 0]
        assert COLON_PATTERN[5] == [0, 0]


class TestColorMap:
    """Tests for color map definition."""
    
    def test_all_colors_mapped(self):
        """Test that all expected colors are in COLOR_MAP."""
        expected_colors = ["red", "orange", "yellow", "green", "blue", "violet", "white", "black"]
        for color in expected_colors:
            assert color in COLOR_MAP
    
    def test_color_codes_valid(self):
        """Test that all color codes are valid BoardChars constants."""
        valid_codes = {
            BoardChars.RED, BoardChars.ORANGE, BoardChars.YELLOW,
            BoardChars.GREEN, BoardChars.BLUE, BoardChars.VIOLET,
            BoardChars.WHITE, BoardChars.BLACK
        }
        for code in COLOR_MAP.values():
            assert code in valid_codes


class TestTimeFormats:
    """Tests for time format handling."""
    
    def test_12h_format_noon(self, manifest):
        """Test 12h format shows 12 at noon."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "UTC",
            "time_format": "12h",
            "color_pattern": "solid",
            "digit_color": "white",
            "background_color": "black",
        }
        
        # Mock datetime to return noon
        with patch("plugins.visual_clock.datetime") as mock_dt:
            tz = pytz.UTC
            mock_dt.now.return_value = datetime(2024, 6, 15, 12, 0, 0, tzinfo=tz)
            
            result = plugin.fetch_data()
            assert result.data["hour"] == "12"
    
    def test_12h_format_midnight(self, manifest):
        """Test 12h format shows 12 at midnight."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "UTC",
            "time_format": "12h",
            "color_pattern": "solid",
            "digit_color": "white",
            "background_color": "black",
        }
        
        with patch("plugins.visual_clock.datetime") as mock_dt:
            tz = pytz.UTC
            mock_dt.now.return_value = datetime(2024, 6, 15, 0, 0, 0, tzinfo=tz)
            
            result = plugin.fetch_data()
            assert result.data["hour"] == "12"
    
    def test_24h_format_midnight(self, manifest):
        """Test 24h format shows 0 at midnight."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "UTC",
            "time_format": "24h",
            "color_pattern": "solid",
            "digit_color": "white",
            "background_color": "black",
        }
        
        with patch("plugins.visual_clock.datetime") as mock_dt:
            tz = pytz.UTC
            mock_dt.now.return_value = datetime(2024, 6, 15, 0, 0, 0, tzinfo=tz)
            
            result = plugin.fetch_data()
            assert result.data["hour"] == "0"
    
    def test_24h_format_afternoon(self, manifest):
        """Test 24h format shows 15 at 3 PM."""
        plugin = VisualClockPlugin(manifest)
        plugin._config = {
            "timezone": "UTC",
            "time_format": "24h",
            "color_pattern": "solid",
            "digit_color": "white",
            "background_color": "black",
        }
        
        with patch("plugins.visual_clock.datetime") as mock_dt:
            tz = pytz.UTC
            mock_dt.now.return_value = datetime(2024, 6, 15, 15, 30, 0, tzinfo=tz)
            
            result = plugin.fetch_data()
            assert result.data["hour"] == "15"


class TestColorPatterns:
    """Tests for color pattern definitions."""
    
    def test_all_patterns_defined(self):
        """Test that all expected patterns exist."""
        expected_patterns = ["pride", "rainbow", "sunset", "ocean", "retro", "christmas", "halloween"]
        for pattern in expected_patterns:
            assert pattern in COLOR_PATTERNS
    
    def test_pattern_types(self):
        """Test that patterns have correct type definitions."""
        for pattern_name, pattern in COLOR_PATTERNS.items():
            assert "type" in pattern
            assert pattern["type"] in ["per_row", "per_digit"]
            assert "colors" in pattern
            assert isinstance(pattern["colors"], list)
            assert len(pattern["colors"]) > 0
    
    def test_pattern_colors_valid(self):
        """Test that all pattern colors are valid color names."""
        valid_colors = set(COLOR_MAP.keys())
        for pattern_name, pattern in COLOR_PATTERNS.items():
            for color in pattern["colors"]:
                assert color in valid_colors, f"Pattern {pattern_name} has invalid color: {color}"
    
    def test_pride_pattern_is_per_row(self):
        """Test that Pride pattern is per-row."""
        assert COLOR_PATTERNS["pride"]["type"] == "per_row"
        assert len(COLOR_PATTERNS["pride"]["colors"]) == 6  # 6 rows
    
    def test_rainbow_pattern_is_per_digit(self):
        """Test that Rainbow pattern is per-digit."""
        assert COLOR_PATTERNS["rainbow"]["type"] == "per_digit"
        assert len(COLOR_PATTERNS["rainbow"]["colors"]) == 6  # 6 colors for cycling
