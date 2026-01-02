"""Real estate property value tracking using Redfin API.

Supports tracking 1-3 properties with historical value persistence
and percentage change calculations similar to stock tracking.
"""

import logging
import json
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

# Time window mapping for historical comparisons
TIME_WINDOW_MAP = {
    "1 Week": 7,
    "1 Month": 30,
    "3 Months": 90,
    "6 Months": 180,
    "1 Year": 365,
}


class PropertySource:
    """Fetches real estate property values using Redfin unofficial API."""
    
    def __init__(
        self,
        properties: List[Dict[str, str]],
        time_window: str = "1 Month",
        api_provider: str = "redfin"
    ):
        """
        Initialize property source.
        
        Args:
            properties: List of property dicts with 'address' and 'display_name'
            time_window: Human-readable time window (e.g., "1 Month")
            api_provider: API provider to use ("redfin" or "manual")
        """
        # Limit to 3 properties max
        if isinstance(properties, list):
            self.properties = properties[:3] if len(properties) > 3 else properties
        else:
            self.properties = []
        
        self.time_window = time_window
        self.api_provider = api_provider
        self._history_file = Path("/app/data/property_history.json")
        self._history_cache = self._load_history()
        
        # Initialize Redfin client if using redfin provider
        self.redfin_client = None
        if self.api_provider == "redfin":
            try:
                from redfin import Redfin
                self.redfin_client = Redfin()
                logger.info("Redfin client initialized successfully")
            except ImportError:
                logger.error("redfin package not installed. Install with: pip install redfin")
                raise
            except Exception as e:
                logger.error(f"Failed to initialize Redfin client: {e}")
                raise
    
    def _load_history(self) -> Dict[str, List[Dict]]:
        """
        Load historical property values from persistent storage.
        
        Returns:
            Dictionary mapping address to list of historical values:
            {
                "123 Main St, SF, CA": [
                    {"timestamp": "2025-01-01T12:00:00Z", "value": 1200000},
                    {"timestamp": "2025-01-15T12:00:00Z", "value": 1250000}
                ]
            }
        """
        if not self._history_file.exists():
            return {}
        
        try:
            with open(self._history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading property history: {e}")
            return {}
    
    def _save_history(self):
        """Save historical property values to persistent storage."""
        try:
            # Ensure directory exists
            self._history_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump(self._history_cache, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving property history: {e}")
    
    def _add_to_history(self, address: str, value: float):
        """
        Add current value to historical record.
        
        Args:
            address: Property address
            value: Current estimated value
        """
        if address not in self._history_cache:
            self._history_cache[address] = []
        
        # Add new entry
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "value": value
        }
        
        self._history_cache[address].append(entry)
        
        # Save to disk
        self._save_history()
    
    def _get_property_history(self, address: str) -> List[Dict]:
        """
        Get historical values for a property.
        
        Args:
            address: Property address
            
        Returns:
            List of historical value entries
        """
        return self._history_cache.get(address, [])
    
    def _get_previous_value(self, address: str, days_ago: int) -> Optional[float]:
        """
        Get property value from N days ago for comparison.
        
        Args:
            address: Property address
            days_ago: Number of days to look back
            
        Returns:
            Historical value or None if not found
        """
        history = self._get_property_history(address)
        if not history:
            return None
        
        # Calculate target timestamp
        target_date = datetime.utcnow() - timedelta(days=days_ago)
        
        # Find closest historical entry to target date
        closest_entry = None
        min_diff = float('inf')
        
        for entry in history:
            try:
                entry_date = datetime.fromisoformat(entry["timestamp"].replace('Z', '+00:00'))
                diff = abs((entry_date - target_date).total_seconds())
                
                if diff < min_diff:
                    min_diff = diff
                    closest_entry = entry
            except Exception as e:
                logger.debug(f"Error parsing timestamp: {e}")
                continue
        
        if closest_entry:
            return closest_entry["value"]
        
        # If no historical data, use oldest entry
        if history:
            return history[0]["value"]
        
        return None
    
    @staticmethod
    def _format_value(value: float) -> str:
        """
        Format value for display (e.g., $1.25M).
        
        Args:
            value: Property value
            
        Returns:
            Formatted value string
        """
        if value >= 1_000_000:
            return f"${value / 1_000_000:.2f}M"
        elif value >= 1_000:
            return f"${value / 1_000:.0f}K"
        else:
            return f"${value:,.0f}"
    
    @staticmethod
    def _format_percentage(change_percent: float) -> str:
        """
        Format percentage change with + or - sign.
        
        Args:
            change_percent: Percentage change (positive or negative)
            
        Returns:
            Formatted percentage string (e.g., "+4.2%" or "-2.1%")
        """
        sign = "+" if change_percent >= 0 else ""
        return f"{sign}{change_percent:.1f}%"
    
    def _fetch_property_value_redfin(self, address: str) -> Optional[float]:
        """
        Fetch property value from Redfin unofficial API.
        
        Args:
            address: Property address
            
        Returns:
            Estimated property value or None if failed
        """
        if not self.redfin_client:
            logger.error("Redfin client not initialized")
            return None
        
        try:
            # Search for property
            response = self.redfin_client.search(address)
            
            if not response or 'payload' not in response:
                logger.warning(f"No response from Redfin for address: {address}")
                return None
            
            # Get exact match
            exact_match = response['payload'].get('exactMatch')
            if not exact_match:
                logger.warning(f"No exact match found for address: {address}")
                return None
            
            # Get property URL
            url = exact_match.get('url')
            if not url:
                logger.warning(f"No URL found for address: {address}")
                return None
            
            # Get initial property info
            initial_info = self.redfin_client.initial_info(url)
            if not initial_info or 'payload' not in initial_info:
                logger.warning(f"No initial info for address: {address}")
                return None
            
            property_id = initial_info['payload'].get('propertyId')
            listing_id = initial_info['payload'].get('listingId')
            
            if not property_id:
                logger.warning(f"No property ID for address: {address}")
                return None
            
            # Try to get AVM (Automated Valuation Model) details
            if listing_id:
                try:
                    avm_details = self.redfin_client.avm_details(property_id, listing_id)
                    if avm_details and 'payload' in avm_details:
                        predicted_value = avm_details['payload'].get('predictedValue')
                        if predicted_value:
                            return float(predicted_value)
                except Exception as e:
                    logger.debug(f"Failed to get AVM details: {e}")
            
            # Fallback: try to get price from property info
            # Check for list price or last sold price
            property_info = initial_info.get('payload', {})
            
            # Try list price first
            list_price = property_info.get('listPrice')
            if list_price:
                return float(list_price)
            
            # Try public records estimate
            public_records = property_info.get('publicRecordsInfo', {})
            basic_info = public_records.get('basicInfo', {})
            estimate = basic_info.get('estimatedValue')
            if estimate:
                return float(estimate)
            
            logger.warning(f"No valuation data found for address: {address}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching property value from Redfin for {address}: {e}", exc_info=True)
            return None
    
    def _fetch_property_value(self, address: str) -> Optional[float]:
        """
        Fetch property value using configured provider.
        
        Args:
            address: Property address
            
        Returns:
            Estimated property value or None if failed
        """
        if self.api_provider == "redfin":
            return self._fetch_property_value_redfin(address)
        elif self.api_provider == "manual":
            # Manual mode: return None (user must manually enter values)
            logger.info(f"Manual mode: skipping API fetch for {address}")
            return None
        else:
            logger.error(f"Unknown API provider: {self.api_provider}")
            return None
    
    def fetch_property_data(self) -> Dict[str, Any]:
        """
        Fetch current property data and calculate stats.
        
        Returns:
            Dictionary with property data:
            {
                "properties": [
                    {
                        "address": "123 Main St, SF, CA",
                        "display_name": "HOME",
                        "current_value": 1250000,
                        "previous_value": 1200000,
                        "change_amount": 50000,
                        "change_percent": 4.17,
                        "color": "green",
                        "formatted": "HOME{green} $1.25M +4.2%",
                        "value_str": "$1.25M",
                        "change_str": "+4.2%"
                    }
                ],
                "total_value": 1250000,
                "total_change": 50000,
                "total_change_percent": 4.17,
                "time_window": "1 Month"
            }
        """
        if not self.properties:
            return {
                "properties": [],
                "total_value": 0,
                "total_change": 0,
                "total_change_percent": 0.0,
                "time_window": self.time_window
            }
        
        results = []
        total_value = 0
        total_previous = 0
        
        # Get days for time window
        days_ago = TIME_WINDOW_MAP.get(self.time_window, 30)
        
        for prop in self.properties:
            address = prop.get("address")
            display_name = prop.get("display_name", "PROPERTY")
            
            if not address:
                logger.warning(f"Property missing address: {prop}")
                continue
            
            # Fetch current value
            current_value = self._fetch_property_value(address)
            
            if current_value is None:
                # Try to get most recent value from history
                history = self._get_property_history(address)
                if history:
                    current_value = history[-1]["value"]
                    logger.info(f"Using cached value for {address}: ${current_value:,.0f}")
                else:
                    logger.warning(f"No value available for {address}")
                    continue
            else:
                # Store new value in history
                self._add_to_history(address, current_value)
            
            # Get historical comparison value
            previous_value = self._get_previous_value(address, days_ago)
            
            if previous_value is None:
                # First time tracking this property, use current as baseline
                previous_value = current_value
            
            # Calculate changes
            change_amount = current_value - previous_value
            change_percent = (change_amount / previous_value * 100) if previous_value > 0 else 0.0
            
            # Determine color
            if change_percent > 0:
                color = "green"
            elif change_percent < 0:
                color = "red"
            else:
                color = "white"
            
            # Format values
            value_str = self._format_value(current_value)
            change_str = self._format_percentage(change_percent)
            formatted = f"{display_name}{{{color}}} {value_str} {change_str}"
            
            results.append({
                "address": address,
                "display_name": display_name,
                "current_value": current_value,
                "previous_value": previous_value,
                "change_amount": change_amount,
                "change_percent": change_percent,
                "color": color,
                "formatted": formatted,
                "value_str": value_str,
                "change_str": change_str
            })
            
            total_value += current_value
            total_previous += previous_value
        
        # Calculate totals
        total_change = total_value - total_previous
        total_change_percent = (total_change / total_previous * 100) if total_previous > 0 else 0.0
        
        return {
            "properties": results,
            "total_value": total_value,
            "total_change": total_change,
            "total_change_percent": total_change_percent,
            "time_window": self.time_window
        }
    
    @staticmethod
    def search_property(address: str) -> Dict[str, Any]:
        """
        Search and validate a property address using Redfin.
        
        Args:
            address: Property address to search
            
        Returns:
            Dictionary with search result:
            {
                "found": bool,
                "address": str,
                "formatted_address": str (if found),
                "current_value": float (if found),
                "error": str (if not found)
            }
        """
        try:
            from redfin import Redfin
            client = Redfin()
            
            # Search for property
            response = client.search(address)
            
            if not response or 'payload' not in response:
                return {
                    "found": False,
                    "address": address,
                    "error": "No response from Redfin"
                }
            
            # Get exact match
            exact_match = response['payload'].get('exactMatch')
            if not exact_match:
                return {
                    "found": False,
                    "address": address,
                    "error": "No exact match found. Try a more specific address."
                }
            
            # Get formatted address
            formatted_address = exact_match.get('displayText', address)
            url = exact_match.get('url')
            
            # Try to get current value
            current_value = None
            if url:
                try:
                    initial_info = client.initial_info(url)
                    if initial_info and 'payload' in initial_info:
                        property_id = initial_info['payload'].get('propertyId')
                        listing_id = initial_info['payload'].get('listingId')
                        
                        if property_id and listing_id:
                            avm_details = client.avm_details(property_id, listing_id)
                            if avm_details and 'payload' in avm_details:
                                current_value = avm_details['payload'].get('predictedValue')
                        
                        # Fallback to list price
                        if not current_value:
                            current_value = initial_info['payload'].get('listPrice')
                except Exception as e:
                    logger.debug(f"Could not fetch value during search: {e}")
            
            return {
                "found": True,
                "address": address,
                "formatted_address": formatted_address,
                "current_value": float(current_value) if current_value else None,
                "url": url
            }
            
        except ImportError:
            return {
                "found": False,
                "address": address,
                "error": "Redfin API not available. Install with: pip install redfin"
            }
        except Exception as e:
            logger.error(f"Error searching property: {e}", exc_info=True)
            return {
                "found": False,
                "address": address,
                "error": f"Search failed: {str(e)}"
            }


# Singleton instance
_property_source: Optional[PropertySource] = None


def get_property_source() -> Optional[PropertySource]:
    """Get or create the property source singleton."""
    global _property_source
    from ..config import Config
    
    if not Config.PROPERTY_ENABLED:
        return None
    
    if _property_source is None:
        _property_source = PropertySource(
            properties=Config.PROPERTY_ADDRESSES,
            time_window=Config.PROPERTY_TIME_WINDOW,
            api_provider=Config.PROPERTY_API_PROVIDER
        )
    
    return _property_source


def reset_property_source() -> None:
    """Reset the property source singleton."""
    global _property_source
    _property_source = None

