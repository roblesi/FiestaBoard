"""Integration tests for multi-stop/route features."""

import pytest
from src.templates.engine import TemplateEngine


class TestMuniIntegration:
    """Test MUNI multi-stop template integration."""
    
    def test_muni_indexed_variables(self):
        """Test that indexed MUNI variables work in templates."""
        engine = TemplateEngine()
        
        # Mock context with multiple stops
        context = {
            "muni": {
                "stops": [
                    {
                        "stop_code": "15726",
                        "line": "N-JUDAH",
                        "stop_name": "Church & Duboce",
                        "formatted": "N: 3, 8, 15 min",
                        "is_delayed": False
                    },
                    {
                        "stop_code": "15727",
                        "line": "J-CHURCH",
                        "stop_name": "Market & Church",
                        "formatted": "J: 5, 12 min",
                        "is_delayed": True
                    }
                ],
                "stop_count": 2,
                # Backward compatibility fields
                "line": "N-JUDAH",
                "stop_name": "Church & Duboce",
                "formatted": "N: 3, 8, 15 min"
            }
        }
        
        # Test indexed access
        result = engine.render("{{muni.stops.0.line}}", context)
        assert "N-JUDAH" in result
        
        result = engine.render("{{muni.stops.1.line}}", context)
        assert "J-CHURCH" in result
        
        # Test backward compatibility
        result = engine.render("{{muni.line}}", context)
        assert "N-JUDAH" in result
        
        # Test stop count
        result = engine.render("{{muni.stop_count}}", context)
        assert "2" in result
    
    def test_muni_multi_line_template(self):
        """Test rendering a multi-stop template."""
        engine = TemplateEngine()
        
        context = {
            "muni": {
                "stops": [
                    {"line": "N", "formatted": "N: 3, 8 min"},
                    {"line": "J", "formatted": "J: 5, 12 min"}
                ],
                "stop_count": 2
            }
        }
        
        template = [
            "{center}MUNI ARRIVALS",
            "{{muni.stops.0.formatted}}",
            "{{muni.stops.1.formatted}}",
            "",
            "",
            ""
        ]
        
        result = engine.render_lines(template, context)
        # render_lines returns a string with 6 lines joined by newlines
        lines = result.split('\n')
        assert len(lines) == 6
        assert "MUNI ARRIVALS" in lines[0]
        assert "N: 3, 8 min" in lines[1]
        assert "J: 5, 12 min" in lines[2]


class TestTrafficIntegration:
    """Test Traffic multi-route template integration."""
    
    def test_traffic_indexed_variables(self):
        """Test that indexed Traffic variables work in templates."""
        engine = TemplateEngine()
        
        # Mock context with multiple routes
        context = {
            "traffic": {
                "routes": [
                    {
                        "origin": "Home",
                        "destination": "Work",
                        "destination_name": "WORK",
                        "duration_minutes": 25,
                        "delay_minutes": 5,
                        "traffic_status": "MODERATE",
                        "formatted": "WORK: 25m (+5m)"
                    },
                    {
                        "origin": "Home",
                        "destination": "Airport",
                        "destination_name": "AIRPORT",
                        "duration_minutes": 45,
                        "delay_minutes": 0,
                        "traffic_status": "LIGHT",
                        "formatted": "AIRPORT: 45m"
                    }
                ],
                "route_count": 2,
                # Backward compatibility fields
                "duration_minutes": 25,
                "delay_minutes": 5,
                "traffic_status": "MODERATE",
                "destination_name": "WORK",
                "formatted": "WORK: 25m (+5m)"
            }
        }
        
        # Test indexed access
        result = engine.render("{{traffic.routes.0.destination_name}}", context)
        assert "WORK" in result
        
        result = engine.render("{{traffic.routes.1.destination_name}}", context)
        assert "AIRPORT" in result
        
        # Test backward compatibility
        result = engine.render("{{traffic.destination_name}}", context)
        assert "WORK" in result
        
        # Test route count
        result = engine.render("{{traffic.route_count}}", context)
        assert "2" in result
    
    def test_traffic_multi_line_template(self):
        """Test rendering a multi-route template."""
        engine = TemplateEngine()
        
        context = {
            "traffic": {
                "routes": [
                    {"destination_name": "WORK", "duration_minutes": 25, "formatted": "WORK: 25m (+5m)"},
                    {"destination_name": "AIRPORT", "duration_minutes": 45, "formatted": "AIRPORT: 45m"}
                ],
                "route_count": 2
            }
        }
        
        template = [
            "{center}COMMUTE TIMES",
            "{{traffic.routes.0.formatted}}",
            "{{traffic.routes.1.formatted}}",
            "",
            "",
            ""
        ]
        
        result = engine.render_lines(template, context)
        # render_lines returns a string with 6 lines joined by newlines
        lines = result.split('\n')
        assert len(lines) == 6
        assert "COMMUTE TIMES" in lines[0]
        assert "WORK: 25m" in lines[1]
        assert "AIRPORT: 45m" in lines[2]


class TestBackwardCompatibility:
    """Test backward compatibility with old single-stop/route configs."""
    
    def test_muni_single_stop_still_works(self):
        """Test that old single stop config still works in templates."""
        engine = TemplateEngine()
        
        # Old format context (single stop at top level)
        context = {
            "muni": {
                "line": "N-JUDAH",
                "stop_name": "Church & Duboce",
                "formatted": "N: 3, 8, 15 min",
                "is_delayed": False
            }
        }
        
        # Old template should still work
        result = engine.render("{{muni.line}}: {{muni.formatted}}", context)
        assert "N-JUDAH" in result
        assert "3, 8, 15 min" in result
    
    def test_traffic_single_route_still_works(self):
        """Test that old single route config still works in templates."""
        engine = TemplateEngine()
        
        # Old format context (single route at top level)
        context = {
            "traffic": {
                "destination_name": "DOWNTOWN",
                "duration_minutes": 25,
                "delay_minutes": 5,
                "traffic_status": "MODERATE",
                "formatted": "DOWNTOWN: 25m (+5m)"
            }
        }
        
        # Old template should still work
        result = engine.render("{{traffic.formatted}}", context)
        assert "DOWNTOWN: 25m" in result

