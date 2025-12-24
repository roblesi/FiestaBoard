"""Tests for template engine."""

import pytest
from unittest.mock import Mock, patch

from src.templates.engine import (
    TemplateEngine,
    COLOR_CODES,
    SYMBOL_CHARS,
    AVAILABLE_VARIABLES,
    TemplateError,
)
from src.displays.service import DisplayResult


class TestTemplateEngineBasics:
    """Tests for basic template engine functionality."""
    
    @pytest.fixture
    def engine(self):
        """Create a template engine with mocked display service."""
        engine = TemplateEngine()
        return engine
    
    def test_render_plain_text(self, engine):
        """Test rendering plain text without any template syntax."""
        result = engine.render("Hello World", context={})
        assert result == "Hello World"
    
    def test_render_preserves_spaces(self, engine):
        """Test that spaces are preserved."""
        result = engine.render("  Spaced  Text  ", context={})
        assert result == "  Spaced  Text  "


class TestVariableSubstitution:
    """Tests for {{variable}} substitution."""
    
    @pytest.fixture
    def engine(self):
        return TemplateEngine()
    
    def test_simple_variable(self, engine):
        """Test simple variable substitution."""
        context = {"weather": {"temp": 72}}
        result = engine.render("Temp: {{weather.temp}}", context)
        assert result == "Temp: 72"
    
    def test_nested_variable(self, engine):
        """Test nested variable access."""
        context = {"weather": {"current": {"temp": 72}}}
        result = engine.render("{{weather.current.temp}}", context)
        assert result == "72"
    
    def test_missing_source(self, engine):
        """Test missing source returns marker."""
        result = engine.render("{{missing.field}}", context={})
        assert "?" in result  # Marker for missing
    
    def test_missing_field(self, engine):
        """Test missing field returns marker."""
        context = {"weather": {"temp": 72}}
        result = engine.render("{{weather.missing}}", context)
        assert "?" in result
    
    def test_boolean_value(self, engine):
        """Test boolean values are converted to Yes/No."""
        context = {"apple_music": {"playing": True}}
        result = engine.render("Playing: {{apple_music.playing}}", context)
        assert "Yes" in result
        
        context = {"apple_music": {"playing": False}}
        result = engine.render("Playing: {{apple_music.playing}}", context)
        assert "No" in result
    
    def test_numeric_value(self, engine):
        """Test numeric values are formatted correctly."""
        context = {"weather": {"temp": 72.5}}
        result = engine.render("{{weather.temp}}", context)
        assert result == "72.5"
        
        context = {"weather": {"temp": 72.0}}
        result = engine.render("{{weather.temp}}", context)
        assert result == "72"  # No decimal for whole numbers


class TestFilters:
    """Tests for value filters (|pad, |upper, etc.)."""
    
    @pytest.fixture
    def engine(self):
        return TemplateEngine()
    
    def test_pad_filter(self, engine):
        """Test |pad:N filter."""
        context = {"weather": {"temp": 72}}
        result = engine.render("{{weather.temp|pad:5}}", context)
        assert result == "72   "  # Padded to 5 chars
    
    def test_upper_filter(self, engine):
        """Test |upper filter."""
        context = {"weather": {"condition": "sunny"}}
        result = engine.render("{{weather.condition|upper}}", context)
        assert result == "SUNNY"
    
    def test_lower_filter(self, engine):
        """Test |lower filter."""
        context = {"weather": {"condition": "SUNNY"}}
        result = engine.render("{{weather.condition|lower}}", context)
        assert result == "sunny"
    
    def test_truncate_filter(self, engine):
        """Test |truncate:N filter."""
        context = {"weather": {"condition": "Partly Cloudy"}}
        result = engine.render("{{weather.condition|truncate:6}}", context)
        assert result == "Partly"
    
    def test_capitalize_filter(self, engine):
        """Test |capitalize filter."""
        context = {"weather": {"condition": "sunny"}}
        result = engine.render("{{weather.condition|capitalize}}", context)
        assert result == "Sunny"


class TestColors:
    """Tests for color code handling."""
    
    @pytest.fixture
    def engine(self):
        return TemplateEngine()
    
    def test_color_codes_defined(self):
        """Test all expected colors are defined."""
        expected = ["red", "orange", "yellow", "green", "blue", "violet", "white", "black"]
        for color in expected:
            assert color in COLOR_CODES
    
    def test_named_color_normalized(self, engine):
        """Test named colors are normalized to codes."""
        result = engine.render("{red}Text{/red}", context={})
        assert "{63}" in result  # Red = 63
    
    def test_numeric_color_preserved(self, engine):
        """Test numeric color codes are preserved."""
        result = engine.render("{63}Text{/}", context={})
        assert "{63}" in result
    
    def test_color_end_tag_normalized(self, engine):
        """Test color end tags are normalized."""
        result = engine.render("{red}Text{/red}", context={})
        assert "{/}" in result


class TestSymbols:
    """Tests for symbol shortcuts."""
    
    @pytest.fixture
    def engine(self):
        return TemplateEngine()
    
    def test_symbols_defined(self):
        """Test all expected symbols are defined."""
        expected = ["sun", "cloud", "rain", "snow", "storm"]
        for symbol in expected:
            assert symbol in SYMBOL_CHARS
    
    def test_sun_symbol(self, engine):
        """Test {sun} symbol."""
        result = engine.render("{sun} Sunny", context={})
        assert SYMBOL_CHARS["sun"] in result
    
    def test_cloud_symbol(self, engine):
        """Test {cloud} symbol."""
        result = engine.render("{cloud} Cloudy", context={})
        assert SYMBOL_CHARS["cloud"] in result
    
    def test_symbol_case_insensitive(self, engine):
        """Test symbols are case insensitive."""
        result = engine.render("{SUN} {Sun} {sun}", context={})
        assert result.count(SYMBOL_CHARS["sun"]) == 3


class TestValidation:
    """Tests for template validation."""
    
    @pytest.fixture
    def engine(self):
        return TemplateEngine()
    
    def test_valid_template(self, engine):
        """Test valid template has no errors."""
        errors = engine.validate_template("{{weather.temp}} degrees")
        assert len(errors) == 0
    
    def test_mismatched_braces(self, engine):
        """Test mismatched braces are detected."""
        errors = engine.validate_template("{{weather.temp} degrees")
        assert any("brace" in e.message.lower() for e in errors)
    
    def test_unknown_source(self, engine):
        """Test unknown source is detected."""
        errors = engine.validate_template("{{unknown.field}}")
        assert any("unknown source" in e.message.lower() for e in errors)
    
    def test_line_too_long_warning(self, engine):
        """Test warning for lines over 22 chars."""
        long_text = "This line is way too long for vestaboard"
        errors = engine.validate_template(long_text)
        assert any("too long" in e.message.lower() for e in errors)


class TestRenderLines:
    """Tests for render_lines method (template pages)."""
    
    @pytest.fixture
    def engine(self):
        return TemplateEngine()
    
    def test_render_lines_basic(self, engine):
        """Test rendering multiple lines."""
        lines = ["Line 1", "Line 2", "Line 3"]
        context = {}
        result = engine.render_lines(lines, context)
        
        output_lines = result.split('\n')
        assert len(output_lines) == 6  # Padded to 6
        assert "Line 1" in output_lines[0]
    
    def test_render_lines_pads_to_6(self, engine):
        """Test that output is always 6 lines."""
        result = engine.render_lines(["Only one line"], {})
        assert len(result.split('\n')) == 6
    
    def test_render_lines_truncates_to_22(self, engine):
        """Test each line is max 22 chars."""
        lines = ["This is a very long line that exceeds 22 characters"]
        result = engine.render_lines(lines, {})
        output_lines = result.split('\n')
        assert len(output_lines[0]) <= 22


class TestAvailableVariables:
    """Tests for available variables listing."""
    
    def test_all_sources_listed(self):
        """Test all sources are listed."""
        expected = ["weather", "datetime", "home_assistant", "apple_music", "star_trek", "guest_wifi"]
        for source in expected:
            assert source in AVAILABLE_VARIABLES
    
    def test_weather_variables(self):
        """Test weather has expected variables."""
        assert "temp" in AVAILABLE_VARIABLES["weather"]
        assert "condition" in AVAILABLE_VARIABLES["weather"]
    
    def test_datetime_variables(self):
        """Test datetime has expected variables."""
        assert "time" in AVAILABLE_VARIABLES["datetime"]
        assert "date" in AVAILABLE_VARIABLES["datetime"]


class TestTemplateAPIEndpoints:
    """Tests for template API endpoints."""
    
    @pytest.fixture
    def client(self):
        from src.api_server import app
        from fastapi.testclient import TestClient
        return TestClient(app)
    
    def test_get_template_variables(self, client):
        """Test GET /templates/variables."""
        response = client.get("/templates/variables")
        
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        assert "colors" in data
        assert "symbols" in data
    
    def test_validate_template_valid(self, client):
        """Test POST /templates/validate with valid template."""
        response = client.post("/templates/validate", json={
            "template": "{{weather.temp}}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
    
    def test_validate_template_invalid(self, client):
        """Test POST /templates/validate with invalid template."""
        response = client.post("/templates/validate", json={
            "template": "{{weather.temp"  # Missing closing
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
    
    @patch('src.api_server.get_template_engine')
    def test_render_template(self, mock_get_engine, client):
        """Test POST /templates/render."""
        mock_engine = Mock()
        mock_engine.render.return_value = "72 degrees"
        mock_engine.render_lines.return_value = "72 degrees"
        mock_get_engine.return_value = mock_engine
        
        response = client.post("/templates/render", json={
            "template": "{{weather.temp}} degrees"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "rendered" in data

