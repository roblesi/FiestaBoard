"""Flight tracking data source using aviationstack API.

Displays nearby aircraft with call signs, altitude, ground speed, and squawk codes.
"""

import logging
import requests
from typing import Optional, Dict, List, Any
from math import radians, cos, sin, asin, sqrt

logger = logging.getLogger(__name__)


class FlightsSource:
    """Fetches real-time flight data from aviationstack API."""
    
    def __init__(
        self,
        api_key: str,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
        max_flights: int = 4
    ):
        """
        Initialize flights source.
        
        Args:
            api_key: aviationstack API key
            latitude: Latitude of monitoring location
            longitude: Longitude of monitoring location
            radius_km: Search radius in kilometers (default: 50km)
            max_flights: Maximum number of flights to display (default: 4)
        """
        self.api_key = api_key
        self.latitude = latitude
        self.longitude = longitude
        self.radius_km = radius_km
        self.max_flights = max_flights
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two points on Earth.
        
        Uses the Haversine formula to compute distance in kilometers.
        
        Args:
            lat1: Latitude of first point
            lon1: Longitude of first point
            lat2: Latitude of second point
            lon2: Longitude of second point
            
        Returns:
            Distance in kilometers
        """
        # Convert decimal degrees to radians
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r
    
    def fetch_nearby_flights(self) -> List[Dict[str, Any]]:
        """
        Fetch nearby flights from aviationstack API.
        
        Returns:
            List of flight dictionaries sorted by distance (closest first)
        """
        if not self.api_key:
            logger.warning("aviationstack API key not configured")
            return []
        
        try:
            # Fetch live flight data
            url = "https://api.aviationstack.com/v1/flights"
            params = {
                "access_key": self.api_key,
                "flight_status": "active",  # Only active flights
                "limit": 100  # Get more flights to filter from
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 403:
                logger.error("aviationstack API returned 403 Forbidden. Check your API key.")
                return []
            elif response.status_code == 429:
                logger.error("aviationstack API rate limit exceeded. Please try again later.")
                return []
            elif response.status_code != 200:
                logger.error(f"aviationstack API returned {response.status_code}: {response.text}")
                return []
            
            data = response.json()
            
            if "data" not in data:
                logger.error("No data in aviationstack API response")
                return []
            
            flights = data["data"]
            logger.info(f"aviationstack returned {len(flights)} total flights")
            
            # Check if we have live position data
            has_live_data = False
            if flights and len(flights) > 0:
                sample_flight = flights[0]
                has_live = sample_flight.get("live") is not None
                if has_live and sample_flight.get("live"):
                    has_live_data = sample_flight["live"].get("latitude") is not None
                logger.info(f"Live position data available: {has_live_data}")
            
            nearby_flights = []
            
            if has_live_data:
                # Filter flights by proximity using position data
                for flight in flights:
                    flight_data = self._parse_flight(flight)
                    if flight_data:
                        # Calculate distance
                        flight_lat = flight_data.get("latitude")
                        flight_lon = flight_data.get("longitude")
                        
                        if flight_lat is not None and flight_lon is not None:
                            distance = self.haversine_distance(
                                self.latitude,
                                self.longitude,
                                flight_lat,
                                flight_lon
                            )
                            
                            # Only include flights within radius
                            if distance <= self.radius_km:
                                flight_data["distance_km"] = round(distance, 1)
                                nearby_flights.append(flight_data)
                
                # Sort by distance (closest first)
                nearby_flights.sort(key=lambda f: f.get("distance_km", float('inf')))
                
                # Limit to max_flights
                nearby_flights = nearby_flights[:self.max_flights]
                
                logger.info(f"Found {len(nearby_flights)} flights within {self.radius_km}km")
            else:
                # No live position data - select random flights from the list
                logger.warning("No live position data available. Selecting random flights from active flights list.")
                import random
                
                # Parse available flights (without position data)
                available_flights = []
                for flight in flights:
                    flight_data = self._parse_flight(flight, require_position=False)
                    if flight_data:
                        available_flights.append(flight_data)
                
                # Select random flights up to max_flights
                if available_flights:
                    sample_size = min(self.max_flights, len(available_flights))
                    nearby_flights = random.sample(available_flights, sample_size)
                    logger.info(f"Selected {len(nearby_flights)} random flights (no position data available)")
                else:
                    logger.info("No valid flights available to display")
            
            return nearby_flights
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch flight data from aviationstack API: {e}")
            return []
        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Unexpected response format from aviationstack API: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching flight data: {e}", exc_info=True)
            return []
    
    def _parse_flight(self, flight: Dict, require_position: bool = True) -> Optional[Dict[str, Any]]:
        """
        Parse flight data from aviationstack API response.
        
        Args:
            flight: Flight dictionary from API
            require_position: If True, skip flights without lat/lon (default: True)
            
        Returns:
            Parsed flight data with relevant fields, or None if invalid
        """
        try:
            # Extract flight info
            flight_info = flight.get("flight") or {}
            live_info = flight.get("live") or {}
            aircraft_info = flight.get("aircraft") or {}
            
            # Get call sign (use ICAO first, fallback to IATA or flight number)
            call_sign = (
                flight_info.get("icao") or
                flight_info.get("iata") or
                flight_info.get("number", "")
            )
            
            # Skip if no call sign
            if not call_sign:
                return None
            
            # Get latitude and longitude from live data
            latitude = live_info.get("latitude")
            longitude = live_info.get("longitude")
            
            # Skip flights without position data (only if required)
            if require_position and (latitude is None or longitude is None):
                return None
            
            # Get altitude (in feet)
            altitude = live_info.get("altitude")
            if altitude is None:
                altitude = 0
            
            # Get ground speed (in km/h or mph depending on API)
            ground_speed = live_info.get("speed_horizontal")
            if ground_speed is None:
                ground_speed = 0
            
            # Get squawk code (transponder code)
            squawk = "----"  # Default placeholder
            
            # Aviationstack doesn't always provide squawk in the response
            # Try to get it from live_info first, then aircraft_info
            if live_info and live_info.get("squawk"):
                squawk = str(live_info["squawk"])
            elif aircraft_info and aircraft_info.get("icao24"):
                squawk = str(aircraft_info["icao24"])[:4]  # Use first 4 chars if available
            
            # Format the data
            formatted = self._format_flight_line(call_sign, altitude, ground_speed, squawk)
            
            result = {
                "call_sign": call_sign,
                "altitude": int(altitude),
                "ground_speed": int(ground_speed),
                "squawk": squawk,
                "formatted": formatted,
            }
            
            # Only include lat/lon if available
            if latitude is not None and longitude is not None:
                result["latitude"] = float(latitude)
                result["longitude"] = float(longitude)
            else:
                result["latitude"] = 0.0
                result["longitude"] = 0.0
                result["distance_km"] = 0.0  # Unknown distance
            
            return result
            
        except (KeyError, ValueError, TypeError) as e:
            logger.debug(f"Could not parse flight data: {e}")
            return None
    
    @staticmethod
    def _format_flight_line(call_sign: str, altitude: int, ground_speed: int, squawk: str) -> str:
        """
        Format a single flight line for display.
        
        Format: CALLSIGN   ALT   GS  SQWK
        Example: "UAL123   35000  450  1234"
        
        Args:
            call_sign: Flight call sign
            altitude: Altitude in feet
            ground_speed: Ground speed in km/h or mph
            squawk: Squawk (transponder) code
            
        Returns:
            Formatted string for display
        """
        # Truncate call sign to 8 chars max
        call_sign = call_sign[:8].ljust(8)
        
        # Format altitude (right-aligned, 5 chars)
        altitude_str = str(altitude).rjust(5)
        
        # Format ground speed (right-aligned, 4 chars)
        speed_str = str(ground_speed).rjust(4)
        
        # Format squawk (4 chars)
        squawk_str = squawk[:4].rjust(4)
        
        return f"{call_sign} {altitude_str} {speed_str} {squawk_str}"


# Singleton instance
_flights_source: Optional[FlightsSource] = None


def get_flights_source() -> Optional[FlightsSource]:
    """Get or create the flights source singleton."""
    global _flights_source
    from ..config import Config
    
    if not Config.FLIGHTS_ENABLED:
        return None
    
    if _flights_source is None:
        _flights_source = FlightsSource(
            api_key=Config.AVIATIONSTACK_API_KEY,
            latitude=Config.FLIGHTS_LATITUDE,
            longitude=Config.FLIGHTS_LONGITUDE,
            radius_km=Config.FLIGHTS_RADIUS_KM,
            max_flights=Config.FLIGHTS_MAX_COUNT
        )
    
    return _flights_source


def reset_flights_source() -> None:
    """Reset the flights source singleton."""
    global _flights_source
    _flights_source = None

