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
            
            # Count electric bikes
            electric_count = 0
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
    
    source = BayWheelsSource(station_id=station_id)
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
        "--json",
        action="store_true",
        help="Output raw JSON only (for scripting)"
    )
    
    args = parser.parse_args()
    
    # Handle --list flag
    if args.list:
        list_all_stations()
        return
    
    # Require station_id if not listing
    if not args.station_id:
        parser.print_help()
        print("\n❌ Error: station_id is required (or use --list to see all stations)")
        sys.exit(1)
    
    # Verify the station
    if args.json:
        # JSON-only output for scripting
        source = BayWheelsSource(station_id=args.station_id)
        result = source.fetch_station_status()
        if result:
            print(json.dumps(result, indent=2))
        else:
            sys.exit(1)
    else:
        verify_station(args.station_id)


if __name__ == "__main__":
    main()

