"""Verify flight tracking data source.

Tests the aviationstack API integration and flight data retrieval.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from data_sources.flights import FlightsSource


def verify_flights():
    """Verify flight tracking data retrieval."""
    print("🛩️  Flight Tracking Verification")
    print("=" * 60)
    
    # Check API key
    api_key = os.getenv('AVIATIONSTACK_API_KEY', '')
    if not api_key:
        print("❌ Error: AVIATIONSTACK_API_KEY not set in environment")
        print("   Get your free API key from https://aviationstack.com/")
        return False
    
    print(f"✅ API key configured: {api_key[:10]}...")
    
    # Get location
    latitude = float(os.getenv('FLIGHTS_LATITUDE', '37.7749'))
    longitude = float(os.getenv('FLIGHTS_LONGITUDE', '-122.4194'))
    radius_km = float(os.getenv('FLIGHTS_RADIUS_KM', '50'))
    max_flights = int(os.getenv('FLIGHTS_MAX_COUNT', '4'))
    
    print(f"📍 Location: {latitude}, {longitude}")
    print(f"📏 Search radius: {radius_km}km")
    print(f"🔢 Max flights: {max_flights}")
    print()
    
    # Create source
    print("Creating flight tracking source...")
    source = FlightsSource(
        api_key=api_key,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        max_flights=max_flights
    )
    
    # Fetch flights
    print("Fetching nearby flights...")
    print("(This may take a few seconds...)")
    print()
    
    flights = source.fetch_nearby_flights()
    
    if not flights:
        print("⚠️  No flights found nearby")
        print("   This could mean:")
        print("   - No aircraft in your search radius")
        print("   - Try increasing FLIGHTS_RADIUS_KM")
        print("   - Try at a different time of day")
        return True  # Not an error, just no flights
    
    print(f"✅ Found {len(flights)} nearby flight(s):")
    print()
    print("─" * 60)
    print(f"{'CALL SIGN':<12} {'ALT (ft)':<10} {'SPEED':<8} {'SQUAWK':<8} {'DIST (km)'}")
    print("─" * 60)
    
    for flight in flights:
        call_sign = flight.get('call_sign', 'N/A')
        altitude = flight.get('altitude', 0)
        speed = flight.get('ground_speed', 0)
        squawk = flight.get('squawk', '----')
        distance = flight.get('distance_km', 0.0)
        
        print(f"{call_sign:<12} {altitude:<10} {speed:<8} {squawk:<8} {distance:.1f}")
    
    print("─" * 60)
    print()
    
    # Show formatted output
    print("📺 Formatted for Vestaboard:")
    print("=" * 60)
    print("NEARBY AIRCRAFT")
    print("CALLS GN  ALT    GS  SQ WK")
    for flight in flights:
        print(flight.get('formatted', '???'))
    print("=" * 60)
    print()
    
    print("✅ Flight tracking verification successful!")
    return True


if __name__ == "__main__":
    try:
        success = verify_flights()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Verification cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

