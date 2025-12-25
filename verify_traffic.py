#!/usr/bin/env python3
"""Verification script for Google Routes API traffic integration.

This script tests the actual Google Routes API integration and displays:
- Current commute time with traffic
- Normal/static commute time
- Traffic index calculation
- Traffic status and color

Usage:
    python verify_traffic.py
    
    # With environment variables:
    GOOGLE_ROUTES_API_KEY=xxx python verify_traffic.py
    
    # With custom route:
    TRAFFIC_ORIGIN="123 Main St, SF" TRAFFIC_DESTINATION="456 Market St, SF" python verify_traffic.py

API Key Required:
    - Google Cloud API key with Routes API enabled
    
Get API key:
    - https://console.cloud.google.com/apis/credentials
    - Enable "Routes API" in API Library
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.data_sources.traffic import TrafficSource, get_traffic_source


def print_banner(text: str):
    """Print a banner with text."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_field(label: str, value: any, indent: int = 2):
    """Print a labeled field."""
    spaces = " " * indent
    print(f"{spaces}{label:<30} {value}")


def get_color_emoji(color: str) -> str:
    """Get emoji for color code."""
    color_emojis = {
        "GREEN": "🟢",
        "YELLOW": "🟡",
        "RED": "🔴",
    }
    return color_emojis.get(color.upper(), "⚪")


def verify_traffic():
    """Verify traffic integration by hitting the actual Google Routes API."""
    
    print_banner("Google Routes API Traffic Integration Verification")
    
    # Check for API key and route config
    api_key = os.environ.get("GOOGLE_ROUTES_API_KEY", "")
    origin = os.environ.get("TRAFFIC_ORIGIN", "")
    destination = os.environ.get("TRAFFIC_DESTINATION", "")
    destination_name = os.environ.get("TRAFFIC_DESTINATION_NAME", "DOWNTOWN")
    
    # Try to get from config if not in environment
    if not api_key or not origin or not destination:
        try:
            from src.config import Config
            if hasattr(Config, 'GOOGLE_ROUTES_API_KEY') and not api_key:
                api_key = Config.GOOGLE_ROUTES_API_KEY
            if hasattr(Config, 'TRAFFIC_ORIGIN') and not origin:
                origin = Config.TRAFFIC_ORIGIN
            if hasattr(Config, 'TRAFFIC_DESTINATION') and not destination:
                destination = Config.TRAFFIC_DESTINATION
            if hasattr(Config, 'TRAFFIC_DESTINATION_NAME'):
                destination_name = Config.TRAFFIC_DESTINATION_NAME or destination_name
        except Exception:
            pass
    
    # Use defaults if still not set
    if not origin:
        origin = "37.7749, -122.4194"  # San Francisco (default)
    if not destination:
        destination = "37.7897, -122.4000"  # Downtown SF
    
    # Display configuration
    print("\n📋 Configuration:")
    print_field("Google Routes API Key:", "✓ Set" if api_key else "✗ Not set")
    print_field("Origin:", origin)
    print_field("Destination:", destination)
    print_field("Destination Name:", destination_name)
    
    if not api_key:
        print("\n❌ ERROR: Google Routes API key not configured!")
        print("\n   Set environment variable:")
        print("   export GOOGLE_ROUTES_API_KEY='your_key'")
        print("\n   Or configure in config.json under features.traffic")
        print("\n   Get an API key at: https://console.cloud.google.com/apis/credentials")
        print("   Make sure to enable 'Routes API' in the API Library")
        return False
    
    # Initialize traffic source
    print("\n🔧 Initializing traffic source...")
    source = TrafficSource(
        api_key=api_key,
        origin=origin,
        destination=destination,
        destination_name=destination_name
    )
    print("✓ Traffic source initialized")
    
    # Fetch traffic data
    print("\n🚗 Fetching traffic data from Google Routes API...")
    traffic_data = source.fetch_traffic_data()
    
    if not traffic_data:
        print("\n❌ ERROR: Failed to fetch traffic data from Google Routes API.")
        print("   Possible issues:")
        print("   - Invalid API key")
        print("   - Routes API not enabled")
        print("   - Invalid origin/destination")
        print("   - API quota exceeded")
        return False
    
    print("✓ Traffic data fetched successfully")
    
    # Display results
    print_banner(f"Current Traffic to {destination_name}")
    
    # Times
    print("\n⏱️  Travel Times:")
    print_field("With Traffic:", f"{traffic_data['duration_minutes']} minutes")
    print_field("Normal (no traffic):", f"{traffic_data['static_duration_minutes']} minutes")
    print_field("Delay:", f"+{traffic_data['delay_minutes']} minutes")
    
    # Traffic Index
    print("\n📊 Traffic Analysis:")
    index = traffic_data['traffic_index']
    color = traffic_data['traffic_color']
    status = traffic_data['traffic_status']
    
    print_field("Traffic Index:", f"{get_color_emoji(color)} {index}")
    print_field("Status:", f"{status} ({color})")
    
    # Thresholds
    print("\n📏 Index Thresholds:")
    print_field("GREEN (Light):", "Index ≤ 1.2 (up to 20% slower)")
    print_field("YELLOW (Moderate):", "1.2 < Index ≤ 1.5 (20-50% slower)")
    print_field("RED (Heavy):", "Index > 1.5 (more than 50% slower)")
    
    # Formatted message
    print("\n📱 Display Message:")
    print_field("Vestaboard:", traffic_data['formatted_message'])
    
    # Route token (for debugging)
    if traffic_data.get('route_token'):
        print("\n🔑 Route Token:")
        token = traffic_data['route_token']
        # Truncate for display
        if len(token) > 50:
            print_field("Token:", f"{token[:50]}...")
        else:
            print_field("Token:", token)
    
    # Analysis
    print_banner("Traffic Analysis")
    
    if index <= 1.0:
        print("\n🟢 EXCELLENT - No traffic delays!")
        print("   Current travel time matches or beats normal expectations.")
    elif index <= 1.1:
        print("\n🟢 GOOD - Minimal traffic")
        print("   Only minor delays, great time to travel.")
    elif index <= 1.2:
        print("\n🟢 LIGHT - Normal traffic levels")
        print("   Expect typical commute conditions.")
    elif index <= 1.3:
        print("\n🟡 MODERATE - Some slowdowns")
        print("   Traffic is building, allow extra time.")
    elif index <= 1.5:
        print("\n🟡 MODERATE TO HEAVY - Significant delays")
        print("   Consider alternate routes or delaying travel.")
    else:
        print("\n🔴 HEAVY TRAFFIC - Major delays!")
        print("   Strongly recommend delaying travel if possible.")
    
    # Additional context
    delay = traffic_data['delay_minutes']
    if delay > 0:
        pct_increase = round((index - 1) * 100)
        print(f"\n   Your commute is {pct_increase}% slower than normal.")
        print(f"   You'll spend an extra {delay} minutes in traffic.")
    
    print_banner("Verification Summary")
    
    print("\n✅ Google Routes API integration verified successfully!")
    print(f"\n📍 Route: {origin}")
    print(f"    → {destination}")
    print(f"\n⏱️  Current commute: {traffic_data['duration_minutes']}m")
    print(f"📊 Traffic Index: {index} ({status})")
    
    return True


def main():
    """Main entry point."""
    try:
        success = verify_traffic()
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
