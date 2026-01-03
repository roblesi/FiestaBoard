"""Flight Tracker plugin for FiestaBoard.

Displays nearby aircraft using aviationstack API.
"""

from typing import Any, Dict, List, Optional
import logging
import requests
from math import radians, cos, sin, asin, sqrt

from src.plugins.base import PluginBase, PluginResult

logger = logging.getLogger(__name__)


class FlightsPlugin(PluginBase):
    """Flight tracker plugin.
    
    Fetches nearby aircraft data from aviationstack API.
    """
    
    def __init__(self, manifest: Dict[str, Any]):
        """Initialize the flights plugin."""
        super().__init__(manifest)
        self._cache: Optional[Dict[str, Any]] = None
    
    @property
    def plugin_id(self) -> str:
        """Return plugin identifier."""
        return "flights"
    
    def validate_config(self, config: Dict[str, Any]) -> List[str]:
        """Validate flights configuration."""
        errors = []
        
        if not config.get("api_key"):
            errors.append("aviationstack API key is required")
        
        lat = config.get("latitude", 37.7749)
        lon = config.get("longitude", -122.4194)
        
        if not (-90 <= lat <= 90):
            errors.append("Latitude must be between -90 and 90")
        if not (-180 <= lon <= 180):
            errors.append("Longitude must be between -180 and 180")
        
        return errors
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points on Earth in km."""
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return 6371 * c
    
    @staticmethod
    def _format_flight_line(call_sign: str, altitude: int, speed: int, squawk: str) -> str:
        """Format flight data for display."""
        call_sign = call_sign[:8].ljust(8)
        altitude_str = str(altitude).rjust(5)
        speed_str = str(speed).rjust(4)
        squawk_str = squawk[:4].rjust(4)
        return f"{call_sign} {altitude_str} {speed_str} {squawk_str}"
    
    def _parse_flight(self, flight: Dict, require_position: bool = True) -> Optional[Dict]:
        """Parse flight data from API response."""
        try:
            flight_info = flight.get("flight") or {}
            live_info = flight.get("live") or {}
            
            call_sign = (
                flight_info.get("icao") or
                flight_info.get("iata") or
                flight_info.get("number", "")
            )
            
            if not call_sign:
                return None
            
            latitude = live_info.get("latitude")
            longitude = live_info.get("longitude")
            
            if require_position and (latitude is None or longitude is None):
                return None
            
            altitude = live_info.get("altitude", 0) or 0
            ground_speed = live_info.get("speed_horizontal", 0) or 0
            squawk = str(live_info.get("squawk", "----"))[:4] if live_info.get("squawk") else "----"
            
            formatted = self._format_flight_line(call_sign, int(altitude), int(ground_speed), squawk)
            
            return {
                "call_sign": call_sign,
                "altitude": int(altitude),
                "ground_speed": int(ground_speed),
                "squawk": squawk,
                "latitude": float(latitude) if latitude else 0.0,
                "longitude": float(longitude) if longitude else 0.0,
                "formatted": formatted,
            }
            
        except Exception as e:
            logger.debug(f"Could not parse flight: {e}")
            return None
    
    def fetch_data(self) -> PluginResult:
        """Fetch nearby flights."""
        api_key = self.config.get("api_key")
        if not api_key:
            return PluginResult(
                available=False,
                error="API key not configured"
            )
        
        lat = self.config.get("latitude", 37.7749)
        lon = self.config.get("longitude", -122.4194)
        radius_km = self.config.get("radius_km", 50)
        max_flights = self.config.get("max_count", 4)
        
        try:
            url = "https://api.aviationstack.com/v1/flights"
            params = {
                "access_key": api_key,
                "flight_status": "active",
                "limit": 100
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                return PluginResult(
                    available=False,
                    error=f"API error: {response.status_code}"
                )
            
            data = response.json()
            flights_raw = data.get("data", [])
            
            # Filter by proximity
            nearby_flights = []
            for flight in flights_raw:
                flight_data = self._parse_flight(flight)
                if flight_data:
                    flight_lat = flight_data.get("latitude")
                    flight_lon = flight_data.get("longitude")
                    
                    if flight_lat and flight_lon:
                        distance = self.haversine_distance(lat, lon, flight_lat, flight_lon)
                        
                        if distance <= radius_km:
                            flight_data["distance_km"] = round(distance, 1)
                            nearby_flights.append(flight_data)
            
            # Sort by distance and limit
            nearby_flights.sort(key=lambda f: f.get("distance_km", float('inf')))
            nearby_flights = nearby_flights[:max_flights]
            
            if not nearby_flights:
                # Return empty but available
                return PluginResult(
                    available=True,
                    data={
                        "flight_count": 0,
                        "flights": [],
                        "call_sign": "",
                        "altitude": 0,
                        "ground_speed": 0,
                        "squawk": "----",
                        "latitude": 0,
                        "longitude": 0,
                        "distance_km": 0,
                        "formatted": "NO FLIGHTS NEARBY",
                    }
                )
            
            # Primary flight
            primary = nearby_flights[0]
            
            result_data = {
                # Primary flight
                "call_sign": primary["call_sign"],
                "altitude": primary["altitude"],
                "ground_speed": primary["ground_speed"],
                "squawk": primary["squawk"],
                "latitude": primary["latitude"],
                "longitude": primary["longitude"],
                "distance_km": primary.get("distance_km", 0),
                "formatted": primary["formatted"],
                # Aggregate
                "flight_count": len(nearby_flights),
                # Array
                "flights": nearby_flights,
            }
            
            self._cache = result_data
            return PluginResult(available=True, data=result_data)
            
        except Exception as e:
            logger.exception("Error fetching flights")
            return PluginResult(available=False, error=str(e))
    
    def get_formatted_display(self) -> Optional[List[str]]:
        """Return default formatted display."""
        if not self._cache:
            result = self.fetch_data()
            if not result.available:
                return None
        
        data = self._cache
        if not data:
            return None
        
        flights = data.get("flights", [])
        lines = [
            "FLIGHTS OVERHEAD".center(22),
            "CALL     ALT  SPD SQWK",
        ]
        
        for flight in flights[:4]:
            lines.append(flight["formatted"][:22])
        
        while len(lines) < 6:
            lines.append("")
        
        return lines[:6]


# Export the plugin class
Plugin = FlightsPlugin

