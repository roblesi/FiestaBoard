#!/usr/bin/env python3
"""Verification script for Open-Meteo Marine API surf integration.

This script tests the actual Open-Meteo Marine API integration and displays:
- Current wave height
- Swell period
- Wind speed and direction
- Surf quality rating
- Formatted message

Usage:
    python verify_surf.py
    
No API key required - Open-Meteo is a free, open-source weather API.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.data_sources.surf import SurfSource, get_surf_source, OCEAN_BEACH_LAT, OCEAN_BEACH_LON


def print_banner(text: str):
    """Print a banner with text."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_field(label: str, value: any, indent: int = 2):
    """Print a labeled field."""
    spaces = " " * indent
    print(f"{spaces}{label:<30} {value}")


def verify_surf():
    """Verify surf integration by hitting the actual Open-Meteo Marine API."""
    
    print_banner("Open-Meteo Marine API Surf Integration Verification")
    
    # Display configuration
    print("\n📋 Configuration:")
    print_field("API:", "Open-Meteo Marine (free, no key required)")
    print_field("Location:", "Ocean Beach, San Francisco")
    print_field("Latitude:", OCEAN_BEACH_LAT)
    print_field("Longitude:", OCEAN_BEACH_LON)
    
    # Initialize surf source
    print("\n🔧 Initializing surf source...")
    source = get_surf_source()
    
    if not source:
        print("\n❌ ERROR: Could not initialize surf source.")
        return False
    
    print("✓ Surf source initialized successfully")
    
    # Fetch surf data
    print("\n🌊 Fetching surf data from Open-Meteo Marine API...")
    surf_data = source.fetch_surf_data()
    
    if not surf_data:
        print("\n❌ ERROR: Failed to fetch surf data from Open-Meteo.")
        print("   Possible issues:")
        print("   - Network connectivity issues")
        print("   - Open-Meteo API temporarily unavailable")
        print("   - Invalid coordinates")
        return False
    
    print("✓ Surf data fetched successfully")
    
    # Display results
    print_banner("Current Surf Conditions - Ocean Beach, SF")
    
    print("\n🌊 Wave Information:")
    print_field("Wave Height:", f"{surf_data['wave_height']} ft ({surf_data['wave_height_m']} m)")
    print_field("Swell Period:", f"{surf_data['swell_period']} seconds")
    
    print("\n💨 Wind Conditions:")
    print_field("Wind Speed:", f"{surf_data['wind_speed']} mph ({surf_data['wind_speed_kmh']} km/h)")
    print_field("Wind Direction:", f"{surf_data['wind_direction']}° ({surf_data['wind_direction_cardinal']})")
    
    # Quality rating with color-coded display
    print("\n🏄 Surf Quality Analysis:")
    quality = surf_data['quality']
    color = surf_data['quality_color']
    
    quality_emoji = {
        "EXCELLENT": "🟢",
        "GOOD": "🟡",
        "FAIR": "🟠",
        "POOR": "🔴"
    }
    
    print_field("Quality Rating:", f"{quality_emoji.get(quality, '')} {quality} ({color})")
    
    # Explain thresholds
    print("\n📊 Quality Thresholds:")
    print_field("EXCELLENT (GREEN):", "Swell > 12s AND Wind < 12mph")
    print_field("GOOD (YELLOW):", "Swell > 10s AND Wind < 15mph")
    print_field("FAIR (ORANGE):", "Swell > 8s OR Wind < 20mph")
    print_field("POOR (RED):", "Otherwise")
    
    print("\n📱 Formatted Message:")
    print_field("Display Text:", surf_data['formatted_message'])
    
    # Current conditions analysis
    print_banner("Conditions Analysis")
    
    swell_period = surf_data['swell_period']
    wind_speed = surf_data['wind_speed']
    
    # Swell analysis
    if swell_period > 12:
        swell_status = "✓ Long period swell (> 12s) - EXCELLENT for surfing"
    elif swell_period > 10:
        swell_status = "• Decent swell period (> 10s) - GOOD for surfing"
    elif swell_period > 8:
        swell_status = "△ Moderate swell period (> 8s) - FAIR for surfing"
    else:
        swell_status = "✗ Short period swell (< 8s) - Not ideal"
    
    # Wind analysis
    if wind_speed < 12:
        wind_status = "✓ Light winds (< 12mph) - EXCELLENT conditions"
    elif wind_speed < 15:
        wind_status = "• Moderate winds (< 15mph) - GOOD conditions"
    elif wind_speed < 20:
        wind_status = "△ Breezy (< 20mph) - FAIR conditions"
    else:
        wind_status = "✗ Strong winds (> 20mph) - Challenging conditions"
    
    print(f"\n{swell_status}")
    print(f"{wind_status}")
    
    # Summary
    print_banner("Verification Summary")
    
    if quality == "EXCELLENT":
        print("\n🟢 EXCELLENT SURF CONDITIONS!")
        print("   Long period swell with light winds - ideal for surfing!")
    elif quality == "GOOD":
        print("\n🟡 GOOD SURF CONDITIONS")
        print("   Decent swell and manageable winds - fun session ahead!")
    elif quality == "FAIR":
        print("\n🟠 FAIR SURF CONDITIONS")
        print("   Not ideal, but still surfable for experienced surfers.")
    else:
        print("\n🔴 POOR SURF CONDITIONS")
        print("   Consider waiting for better conditions.")
    
    print("\n✅ Surf integration verification completed successfully!")
    print("\n💡 Ocean Beach faces west, so NW/W swells provide the best waves.")
    print("   Offshore winds (east/northeast) create the cleanest conditions.")
    
    return True


def main():
    """Main entry point."""
    try:
        success = verify_surf()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Verification interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ ERROR: Unexpected error during verification:")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()




