"""Muni transit data source using 511.org SIRI StopMonitoring API.

This module provides real-time arrival predictions for SF Muni transit.
"""

import logging
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from ..config import Config

logger = logging.getLogger(__name__)


# Vestaboard color codes
COLOR_RED = 63    # Delay indicator
COLOR_ORANGE = 64  # Full occupancy indicator


class MuniSource:
    """Fetches real-time transit data from 511.org StopMonitoring API."""
    
    API_BASE_URL = "http://api.511.org/transit/StopMonitoring"
    AGENCY = "SF"  # San Francisco Muni
    
    def __init__(self, api_key: str, stop_code: str, line_name: Optional[str] = None):
        """
        Initialize Muni source.
        
        Args:
            api_key: 511.org API key
            stop_code: The stop code to monitor (e.g., "15726" for Church & Duboce)
            line_name: Optional line name filter (e.g., "N" for N-Judah)
        """
        self.api_key = api_key
        self.stop_code = stop_code
        self.line_name = line_name
    
    def fetch_arrivals(self) -> Optional[Dict[str, Any]]:
        """
        Fetch arrival predictions from 511.org StopMonitoring API.
        
        Returns:
            Dictionary with parsed arrival data, or None if failed:
            {
                "line": str,           # Line name (e.g., "N-JUDAH")
                "stop_name": str,      # Stop name
                "arrivals": [          # List of next arrivals
                    {
                        "minutes": int,
                        "occupancy": str,      # EMPTY, MANY_SEATS, FEW_SEATS, STANDING, FULL
                        "is_full": bool,
                    },
                    ...
                ],
                "is_delayed": bool,        # Any vehicle delayed
                "delay_description": str,  # Delay reason text
                "formatted": str,          # Pre-formatted display string
                "color_code": int,         # Vestaboard color code (63=red, 64=orange, 0=none)
            }
        """
        params = {
            "api_key": self.api_key,
            "agency": self.AGENCY,
            "stopCode": self.stop_code,
            "format": "json"
        }
        
        try:
            response = requests.get(self.API_BASE_URL, params=params, timeout=15)
            response.raise_for_status()
            
            # 511.org returns JSON with BOM sometimes, handle that
            content = response.text
            if content.startswith('\ufeff'):
                content = content[1:]
            
            import json
            data = json.loads(content)
            
            return self._parse_response(data)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch Muni data from 511.org: {e}")
            return None
        except (KeyError, ValueError, json.JSONDecodeError) as e:
            logger.error(f"Failed to parse 511.org response: {e}")
            return None
    
    def _parse_response(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse the StopMonitoring API response.
        
        Args:
            data: Raw JSON response from 511.org
            
        Returns:
            Parsed arrival data dictionary, or None if no data
        """
        try:
            # Navigate to the monitored stop visits
            service_delivery = data.get("ServiceDelivery", {})
            stop_monitoring = service_delivery.get("StopMonitoringDelivery", {})
            
            # Handle both list and single object responses
            if isinstance(stop_monitoring, list):
                stop_monitoring = stop_monitoring[0] if stop_monitoring else {}
            
            monitored_visits = stop_monitoring.get("MonitoredStopVisit", [])
            
            if not monitored_visits:
                logger.warning(f"No arrivals found for stop {self.stop_code}")
                return None
            
            # Parse each arrival
            arrivals = []
            is_delayed = False
            delay_description = ""
            stop_name = ""
            line = ""
            
            for visit in monitored_visits:
                journey = visit.get("MonitoredVehicleJourney", {})
                
                # Get line info
                published_line = journey.get("PublishedLineName", "")
                if isinstance(published_line, list):
                    published_line = published_line[0] if published_line else ""
                
                # Filter by line name if specified
                if self.line_name and published_line.upper() != self.line_name.upper():
                    continue
                
                if not line:
                    line = published_line.upper()
                
                # Get stop name from first valid entry
                monitored_call = journey.get("MonitoredCall", {})
                if not stop_name:
                    stop_point_name = monitored_call.get("StopPointName", "")
                    if isinstance(stop_point_name, list):
                        stop_point_name = stop_point_name[0] if stop_point_name else ""
                    stop_name = stop_point_name
                
                # Calculate minutes until arrival
                expected_arrival = monitored_call.get("ExpectedArrivalTime") or \
                                   monitored_call.get("ExpectedDepartureTime") or \
                                   monitored_call.get("AimedArrivalTime")
                
                if expected_arrival:
                    minutes = self._calculate_minutes_until(expected_arrival)
                    if minutes is not None and minutes >= 0:
                        # Get occupancy status
                        occupancy = journey.get("Occupancy", "UNKNOWN")
                        if isinstance(occupancy, list):
                            occupancy = occupancy[0] if occupancy else "UNKNOWN"
                        
                        is_full = occupancy.upper() == "FULL"
                        
                        # Check delay status
                        delay_info = journey.get("Delay")
                        if delay_info:
                            is_delayed = True
                            # PT format: PT2M30S = 2 minutes 30 seconds delay
                            delay_description = self._format_delay(delay_info)
                        
                        # Check situation refs for delay reasons
                        situation_refs = journey.get("SituationRef", [])
                        if situation_refs:
                            is_delayed = True
                            if not delay_description:
                                delay_description = "Service disruption"
                        
                        arrivals.append({
                            "minutes": minutes,
                            "occupancy": occupancy.upper(),
                            "is_full": is_full,
                        })
            
            if not arrivals:
                return None
            
            # Sort by minutes and take top 3
            arrivals.sort(key=lambda x: x["minutes"])
            arrivals = arrivals[:3]
            
            # Determine color code
            color_code = 0
            if is_delayed:
                color_code = COLOR_RED
            elif any(a["is_full"] for a in arrivals):
                color_code = COLOR_ORANGE
            
            # Create formatted string
            formatted = self._format_display(line, arrivals, is_delayed)
            
            return {
                "line": line,
                "stop_name": stop_name,
                "arrivals": arrivals,
                "is_delayed": is_delayed,
                "delay_description": delay_description,
                "formatted": formatted,
                "color_code": color_code,
            }
            
        except Exception as e:
            logger.error(f"Error parsing 511.org response: {e}", exc_info=True)
            return None
    
    def _calculate_minutes_until(self, iso_timestamp: str) -> Optional[int]:
        """
        Calculate minutes until the given ISO timestamp.
        
        Args:
            iso_timestamp: ISO 8601 timestamp string
            
        Returns:
            Minutes until arrival, or None if parsing fails
        """
        try:
            # Parse ISO timestamp (511.org uses ISO 8601 with timezone)
            # Handle various formats: 2024-12-24T10:30:00-08:00 or 2024-12-24T18:30:00Z
            arrival_time = datetime.fromisoformat(iso_timestamp.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            
            delta = arrival_time - now
            minutes = int(delta.total_seconds() / 60)
            
            return max(0, minutes)  # Don't return negative minutes
            
        except (ValueError, TypeError) as e:
            logger.debug(f"Failed to parse timestamp {iso_timestamp}: {e}")
            return None
    
    def _format_delay(self, delay_str: str) -> str:
        """
        Format PT duration string to human-readable delay.
        
        Args:
            delay_str: ISO 8601 duration (e.g., "PT2M30S")
            
        Returns:
            Human-readable delay string
        """
        try:
            # Simple parsing for PT format
            if delay_str.startswith("PT"):
                delay_str = delay_str[2:]
                minutes = 0
                seconds = 0
                
                if "M" in delay_str:
                    parts = delay_str.split("M")
                    minutes = int(parts[0])
                    delay_str = parts[1] if len(parts) > 1 else ""
                
                if "S" in delay_str:
                    seconds = int(delay_str.replace("S", ""))
                
                total_minutes = minutes + (seconds // 60)
                if total_minutes > 0:
                    return f"{total_minutes} min delay"
            
            return "Delayed"
        except (ValueError, IndexError):
            return "Delayed"
    
    def _format_display(self, line: str, arrivals: List[Dict], is_delayed: bool) -> str:
        """
        Format arrival data for Vestaboard display.
        
        Format: "N-JUDAH: 4, 12, 19 MIN (DELAY)"
        
        Args:
            line: Line name
            arrivals: List of arrival dictionaries
            is_delayed: Whether there's a delay
            
        Returns:
            Formatted display string
        """
        if not arrivals:
            return f"{line}: No arrivals"
        
        # Format arrival times, marking full trains with color
        times = []
        for arr in arrivals:
            mins = arr["minutes"]
            if arr["is_full"]:
                # Orange color marker for full trains
                times.append(f"{{64}}{mins}")
            else:
                times.append(str(mins))
        
        time_str = ", ".join(times)
        
        # Add delay indicator
        suffix = ""
        if is_delayed:
            suffix = " (DELAY)"
        
        # Format: "N-JUDAH: 4, 12, 19 MIN (DELAY)"
        # If line name contains "-" already (like "N-OWL"), use as-is
        # Otherwise append common names if we know them
        display_line = self._get_display_line_name(line)
        
        result = f"{display_line}: {time_str} MIN{suffix}"
        
        # Apply delay color to entire line if delayed
        if is_delayed:
            result = f"{{63}}{result}"
        
        return result
    
    def _get_display_line_name(self, line: str) -> str:
        """
        Get display-friendly line name.
        
        Args:
            line: Raw line code
            
        Returns:
            Display-friendly line name
        """
        # Known Muni line names
        line_names = {
            "N": "N-JUDAH",
            "J": "J-CHURCH",
            "K": "K-INGLESIDE",
            "L": "L-TARAVAL",
            "M": "M-OCEAN VIEW",
            "T": "T-THIRD",
            "S": "S-SHUTTLE",
            "F": "F-MARKET",
        }
        
        return line_names.get(line.upper(), line.upper())


def get_muni_source() -> Optional[MuniSource]:
    """Get configured Muni source instance."""
    if not Config.MUNI_API_KEY:
        logger.debug("Muni API key not configured")
        return None
    
    if not Config.MUNI_STOP_CODE:
        logger.debug("Muni stop code not configured")
        return None
    
    return MuniSource(
        api_key=Config.MUNI_API_KEY,
        stop_code=Config.MUNI_STOP_CODE,
        line_name=Config.MUNI_LINE_NAME if Config.MUNI_LINE_NAME else None
    )

