"""Bay Wheels (Lyft) GBFS feed integration.

Fetches bike availability data from the Bay Wheels GBFS station_status.json endpoint.
Provides electric and classic bike counts with color-coded status based on availability.
"""

import logging
import requests
from typing import Optional, Dict
from ..config import Config

logger = logging.getLogger(__name__)

# Bay Wheels GBFS endpoints
GBFS_BASE_URL = "https://gbfs.baywheels.com/gbfs/en"
STATION_STATUS_URL = f"{GBFS_BASE_URL}/station_status.json"


class BayWheelsSource:
    """Fetches bike availability data from Bay Wheels GBFS feed."""
    
    def __init__(self, station_id: str):
        """
        Initialize Bay Wheels source.
        
        Args:
            station_id: The station ID to monitor (e.g., "19th St. BART")
        """
        self.station_id = station_id
    
    def fetch_station_status(self) -> Optional[Dict[str, any]]:
        """
        Fetch current bike availability for the configured station.
        
        Returns:
            Dictionary with bike availability data:
            {
                "station_id": str,
                "station_name": str,
                "num_bikes_available": int,
                "electric_bikes": int,
                "classic_bikes": int,
                "is_renting": bool,
                "status_color": str,  # "red", "yellow", or "green"
                "total_docks": int,
                "num_docks_available": int
            }
            Returns None if fetch failed.
        """
        try:
            response = requests.get(STATION_STATUS_URL, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Find our station in the feed
            stations = data.get("data", {}).get("stations", [])
            station_data = None
            
            for station in stations:
                # Match by station_id
                if station.get("station_id") == self.station_id:
                    station_data = station
                    break
            
            if not station_data:
                logger.error(f"Station {self.station_id} not found in GBFS feed")
                return None
            
            # Parse the data
            num_bikes_available = station_data.get("num_bikes_available", 0)
            is_renting = station_data.get("is_renting", 1) == 1
            
            # Split bikes by type using vehicle_types_available
            electric_bikes = 0
            classic_bikes = 0
            
            vehicle_types = station_data.get("vehicle_types_available", [])
            for vehicle_type in vehicle_types:
                vehicle_type_id = vehicle_type.get("vehicle_type_id", "")
                count = vehicle_type.get("count", 0)
                
                # Bay Wheels uses these IDs for bike types
                if "electric" in vehicle_type_id.lower() or "boost" in vehicle_type_id.lower():
                    electric_bikes += count
                elif "classic" in vehicle_type_id.lower():
                    classic_bikes += count
                else:
                    # If we can't determine type, count as classic
                    classic_bikes += count
            
            # Determine status color based on electric bike availability
            status_color = self._get_status_color(electric_bikes)
            
            return {
                "station_id": station_data.get("station_id"),
                "station_name": self.station_id,  # Use the configured name
                "num_bikes_available": num_bikes_available,
                "electric_bikes": electric_bikes,
                "classic_bikes": classic_bikes,
                "is_renting": is_renting,
                "status_color": status_color,
                "total_docks": station_data.get("num_docks_available", 0) + num_bikes_available,
                "num_docks_available": station_data.get("num_docks_available", 0),
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch Bay Wheels data: {e}")
            return None
        except KeyError as e:
            logger.error(f"Unexpected response format from Bay Wheels GBFS: {e}")
            return None
    
    def _get_status_color(self, electric_bikes: int) -> str:
        """
        Determine status color based on electric bike count.
        
        Args:
            electric_bikes: Number of electric bikes available
            
        Returns:
            Color name: "red" (< 2), "yellow" (2-5), or "green" (> 5)
        """
        if electric_bikes < 2:
            return "red"
        elif electric_bikes > 5:
            return "green"
        else:
            return "yellow"


def get_baywheels_source() -> Optional[BayWheelsSource]:
    """Get configured Bay Wheels source instance."""
    if not Config.BAYWHEELS_ENABLED:
        logger.debug("Bay Wheels integration not enabled")
        return None
    
    if not Config.BAYWHEELS_STATION_ID:
        logger.warning("Bay Wheels station ID not configured")
        return None
    
    return BayWheelsSource(
        station_id=Config.BAYWHEELS_STATION_ID
    )

