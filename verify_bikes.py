#!/usr/bin/env python3
"""Verification script for Bay Wheels GBFS integration.

This script fetches live data from the Bay Wheels GBFS feed and displays
the current bike availability for a specific station.

Usage:
    python verify_bikes.py <station_id>
    
Example:
    python verify_bikes.py 19th-st-bart-2
"""

import sys
import json
import argparse
from src.data_sources.baywheels import BayWheelsSource, STATION_STATUS_URL


def format_status_display(data: dict) -> str:
    """Format the station status for display.
    
    Args:
        data: Station status dictionary
        
    Returns:
        Formatted string for display
    """
    color_emoji = {
        "red": "🔴",
        "yellow": "🟡",
        "green": "🟢"
    }
    
    status_emoji = color_emoji.get(data["status_color"], "⚪")
    renting_status = "✅ Renting" if data["is_renting"] else "❌ Not Renting"
    
    output = f"""
╔══════════════════════════════════════════════════════════════╗
║  BAY WHEELS STATION STATUS                                   ║
╚══════════════════════════════════════════════════════════════╝

Station ID:        {data['station_id']}
Station Name:      {data['station_name']}

{status_emoji} ELECTRIC BIKES:  {data['electric_bikes']}
   Classic Bikes:   {data['classic_bikes']}
   Total Bikes:     {data['num_bikes_available']}

Available Docks:   {data['num_docks_available']}
Total Capacity:    {data['total_docks']}

Status:            {renting_status}
Color Status:      {data['status_color'].upper()} {status_emoji}

╔══════════════════════════════════════════════════════════════╗
║  VESTABOARD FORMAT                                           ║
╚══════════════════════════════════════════════════════════════╝

E-BIKES @ {data['station_name']}: {data['electric_bikes']} (Total: {data['num_bikes_available']})

Color Logic:
  🔴 RED    (< 2 e-bikes):  Low availability
  🟡 YELLOW (2-5 e-bikes):  Moderate availability  
  🟢 GREEN  (> 5 e-bikes):  Good availability
"""
    return output


def list_all_stations():
    """Fetch and display all available stations from the GBFS feed."""
    import requests
    
    print("Fetching all stations from Bay Wheels GBFS feed...")
    print(f"URL: {STATION_STATUS_URL}\n")
    
    try:
        response = requests.get(STATION_STATUS_URL, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        stations = data.get("data", {}).get("stations", [])
        
        if not stations:
            print("❌ No stations found in feed")
            return
        
        print(f"✅ Found {len(stations)} stations\n")
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║  AVAILABLE STATIONS                                          ║")
        print("╚══════════════════════════════════════════════════════════════╝\n")
        
        # Group by availability for easier browsing
        stations_with_bikes = []
        stations_empty = []
        
        for station in stations:
            station_id = station.get("station_id", "unknown")
            num_bikes = station.get("num_bikes_available", 0)
            is_renting = station.get("is_renting", 0) == 1
            
            # Count electric bikes - NEW API format (as of late 2024)
            electric_count = 0
            if "num_ebikes_available" in station:
                electric_count = station.get("num_ebikes_available", 0)
            else:
                # OLD FORMAT (fallback)
                vehicle_types = station.get("vehicle_types_available", [])
                for vt in vehicle_types:
                    if "electric" in vt.get("vehicle_type_id", "").lower() or \
                       "boost" in vt.get("vehicle_type_id", "").lower():
                        electric_count += vt.get("count", 0)
            
            station_info = {
                "id": station_id,
                "bikes": num_bikes,
                "electric": electric_count,
                "renting": is_renting
            }
            
            if num_bikes > 0 and is_renting:
                stations_with_bikes.append(station_info)
            else:
                stations_empty.append(station_info)
        
        # Display stations with bikes first
        if stations_with_bikes:
            print("🚲 STATIONS WITH BIKES AVAILABLE:\n")
            for s in sorted(stations_with_bikes, key=lambda x: x["electric"], reverse=True):
                status = "🟢" if s["electric"] > 5 else "🟡" if s["electric"] >= 2 else "🔴"
                print(f"  {status} {s['id']}")
                print(f"     E-bikes: {s['electric']}, Total: {s['bikes']}\n")
        
        if stations_empty:
            print("\n⚪ STATIONS EMPTY OR NOT RENTING:\n")
            for s in stations_empty[:10]:  # Show first 10
                renting_str = "" if s["renting"] else " (NOT RENTING)"
                print(f"  ⚪ {s['id']}{renting_str}")
                print(f"     E-bikes: {s['electric']}, Total: {s['bikes']}\n")
            
            if len(stations_empty) > 10:
                print(f"  ... and {len(stations_empty) - 10} more empty/offline stations\n")
        
        print("\n💡 TIP: Use a station ID from above with:")
        print("   python verify_bikes.py <station_id>")
        
    except Exception as e:
        print(f"❌ Error fetching stations: {e}")
        sys.exit(1)


def verify_station(station_id: str):
    """Verify bike availability for a specific station.
    
    Args:
        station_id: The Bay Wheels station ID to check
    """
    print(f"Fetching data for station: {station_id}")
    print(f"GBFS Endpoint: {STATION_STATUS_URL}\n")
    
    source = BayWheelsSource(station_ids=[station_id])
    result = source.fetch_station_status()
    
    if result is None:
        print(f"❌ Failed to fetch data for station '{station_id}'")
        print("\nPossible reasons:")
        print("  1. Station ID not found in GBFS feed")
        print("  2. Network error")
        print("  3. GBFS API is down")
        print("\n💡 TIP: Run 'python verify_bikes.py --list' to see all available stations")
        sys.exit(1)
    
    print("✅ Successfully fetched station data\n")
    print(format_status_display(result))
    
    # Also show raw JSON for debugging
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  RAW JSON DATA                                               ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")
    print(json.dumps(result, indent=2))


def search_nearby_stations(lat: float, lng: float, radius: float = 2.0, limit: int = 10):
    """Search for stations near a location.
    
    Args:
        lat: Latitude
        lng: Longitude
        radius: Search radius in kilometers
        limit: Maximum number of results
    """
    from src.data_sources.baywheels import BayWheelsSource
    import requests
    
    print(f"Searching for stations near {lat}, {lng} (radius: {radius}km)")
    print(f"GBFS Endpoint: {STATION_STATUS_URL}\n")
    
    try:
        stations = BayWheelsSource.find_stations_near_location(lat, lng, radius, limit)
        
        if not stations:
            print("❌ No stations found in the specified area")
            return
        
        # Get current status for these stations
        response = requests.get(STATION_STATUS_URL, timeout=10)
        response.raise_for_status()
        status_data = response.json()
        stations_status = {s.get("station_id"): s for s in status_data.get("data", {}).get("stations", [])}
        
        print(f"✅ Found {len(stations)} stations\n")
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║  NEARBY STATIONS                                            ║")
        print("╚══════════════════════════════════════════════════════════════╝\n")
        
        for station in stations:
            station_id = station["station_id"]
            status = stations_status.get(station_id, {})
            
            # Count bike types - NEW API format (as of late 2024)
            electric = 0
            classic = 0
            num_bikes = status.get("num_bikes_available", 0)
            
            if "num_ebikes_available" in status:
                electric = status.get("num_ebikes_available", 0)
                classic = num_bikes - electric
            else:
                # OLD FORMAT (fallback)
                for vt in status.get("vehicle_types_available", []):
                    vt_id = vt.get("vehicle_type_id", "").lower()
                    count = vt.get("count", 0)
                    if "electric" in vt_id or "boost" in vt_id:
                        electric += count
                    elif "classic" in vt_id:
                        classic += count
                    else:
                        classic += count
            
            status_emoji = "🟢" if electric > 5 else "🟡" if electric >= 2 else "🔴"
            renting_status = "✅" if status.get("is_renting", 1) == 1 else "❌"
            
            print(f"{status_emoji} {station['name']}")
            print(f"   ID: {station_id}")
            print(f"   Distance: {station['distance_km']} km")
            print(f"   E-bikes: {electric}, Classic: {classic}, Total: {status.get('num_bikes_available', 0)}")
            print(f"   Status: {renting_status} {'Renting' if status.get('is_renting', 1) == 1 else 'Not Renting'}")
            if station.get("address"):
                print(f"   Address: {station['address']}")
            print()
        
        print("\n💡 TIP: Use a station ID from above with:")
        print("   python verify_bikes.py <station_id>")
        
    except Exception as e:
        print(f"❌ Error searching stations: {e}")
        sys.exit(1)


def search_by_address(address: str, radius: float = 2.0, limit: int = 10):
    """Search for stations near an address.
    
    Args:
        address: Address string
        radius: Search radius in kilometers
        limit: Maximum number of results
    """
    import requests
    
    print(f"Geocoding address: {address}")
    
    try:
        # Geocode address using Nominatim
        geocode_url = "https://nominatim.openstreetmap.org/search"
        geocode_params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        
        geocode_response = requests.get(geocode_url, params=geocode_params, timeout=10)
        geocode_response.raise_for_status()
        geocode_data = geocode_response.json()
        
        if not geocode_data:
            print(f"❌ Address not found: {address}")
            sys.exit(1)
        
        location = geocode_data[0]
        lat = float(location["lat"])
        lng = float(location["lon"])
        
        print(f"✅ Found location: {location.get('display_name', '')}")
        print(f"   Coordinates: {lat}, {lng}\n")
        
        # Search for nearby stations
        search_nearby_stations(lat, lng, radius, limit)
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error geocoding address: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Verify Bay Wheels GBFS integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check a specific station
  python verify_bikes.py 19th-st-bart-2
  
  # List all available stations
  python verify_bikes.py --list
  
  # Search by coordinates
  python verify_bikes.py --near "37.8044,-122.2712" --radius 2
  
  # Search by address
  python verify_bikes.py --address "123 Main St, San Francisco, CA" --radius 2
  
  # Get help
  python verify_bikes.py --help
        """
    )
    
    parser.add_argument(
        "station_id",
        nargs="?",
        help="Bay Wheels station ID to check"
    )
    
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available stations from GBFS feed"
    )
    
    parser.add_argument(
        "--near",
        metavar="LAT,LNG",
        help="Search for stations near coordinates (e.g., '37.8044,-122.2712')"
    )
    
    parser.add_argument(
        "--address",
        metavar="ADDRESS",
        help="Search for stations near an address"
    )
    
    parser.add_argument(
        "--radius",
        type=float,
        default=2.0,
        help="Search radius in kilometers (default: 2.0)"
    )
    
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of results (default: 10)"
    )
    
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON only (for scripting)"
    )
    
    args = parser.parse_args()
    
    # Handle --list flag
    if args.list:
        list_all_stations()
        return
    
    # Handle --near flag
    if args.near:
        try:
            coords = args.near.split(",")
            if len(coords) != 2:
                print("❌ Error: --near requires format 'LAT,LNG' (e.g., '37.8044,-122.2712')")
                sys.exit(1)
            lat = float(coords[0].strip())
            lng = float(coords[1].strip())
            search_nearby_stations(lat, lng, args.radius, args.limit)
        except ValueError:
            print("❌ Error: Invalid coordinates format. Use 'LAT,LNG' (e.g., '37.8044,-122.2712')")
            sys.exit(1)
        return
    
    # Handle --address flag
    if args.address:
        search_by_address(args.address, args.radius, args.limit)
        return
    
    # Require station_id if not listing or searching
    if not args.station_id:
        parser.print_help()
        print("\n❌ Error: station_id is required (or use --list, --near, or --address)")
        sys.exit(1)
    
    # Verify the station
    if args.json:
        # JSON-only output for scripting
        source = BayWheelsSource(station_ids=[args.station_id])
        result = source.fetch_station_status()
        if result:
            print(json.dumps(result, indent=2))
        else:
            sys.exit(1)
    else:
        verify_station(args.station_id)


if __name__ == "__main__":
    main()

