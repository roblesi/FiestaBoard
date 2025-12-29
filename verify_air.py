#!/usr/bin/env python3
"""Verification script for Air Quality and Fog integration.

This script tests the PurpleAir and OpenWeatherMap API integration and displays:
- PM2.5 concentration and AQI
- Visibility and fog status
- Humidity and dew point
- Alert conditions

Usage:
    python verify_air.py
    
    # With environment variables:
    PURPLEAIR_API_KEY=xxx OPENWEATHERMAP_API_KEY=xxx python verify_air.py
    
    # With specific sensor:
    PURPLEAIR_SENSOR_ID=12345 python verify_air.py

API Keys Required:
    - PurpleAir API Key (for air quality data)
    - OpenWeatherMap API Key (for visibility/fog data)
    
Get API keys:
    - PurpleAir: https://develop.purpleair.com/
    - OpenWeatherMap: https://openweathermap.org/api
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.data_sources.air_fog import (
    AirFogSource,
    get_air_fog_source,
    DEFAULT_LAT,
    DEFAULT_LON,
)


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
        "ORANGE": "🟠",
        "RED": "🔴",
        "PURPLE": "🟣",
        "MAROON": "🟤",
    }
    return color_emojis.get(color.upper(), "⚪")


def verify_air():
    """Verify air quality and fog integration by hitting actual APIs."""
    
    print_banner("Air Quality & Fog Integration Verification")
    
    # Check for API keys
    purpleair_key = os.environ.get("PURPLEAIR_API_KEY", "")
    owm_key = os.environ.get("OPENWEATHERMAP_API_KEY", "")
    sensor_id = os.environ.get("PURPLEAIR_SENSOR_ID")
    
    # Try to get from config if not in environment
    if not purpleair_key or not owm_key:
        try:
            from src.config import Config
            if hasattr(Config, 'PURPLEAIR_API_KEY'):
                purpleair_key = purpleair_key or Config.PURPLEAIR_API_KEY
            if hasattr(Config, 'OPENWEATHERMAP_API_KEY'):
                owm_key = owm_key or Config.OPENWEATHERMAP_API_KEY
            if hasattr(Config, 'PURPLEAIR_SENSOR_ID') and not sensor_id:
                sensor_id = Config.PURPLEAIR_SENSOR_ID
        except Exception:
            pass
    
    # Display configuration
    print("\n📋 Configuration:")
    print_field("PurpleAir API Key:", "✓ Set" if purpleair_key else "✗ Not set")
    print_field("OpenWeatherMap API Key:", "✓ Set" if owm_key else "✗ Not set")
    print_field("PurpleAir Sensor ID:", sensor_id or "(auto-detect nearby)")
    print_field("Location:", f"{DEFAULT_LAT}, {DEFAULT_LON} (San Francisco)")
    
    if not purpleair_key and not owm_key:
        print("\n❌ ERROR: No API keys configured!")
        print("\n   Set environment variables:")
        print("   export PURPLEAIR_API_KEY='your_key'")
        print("   export OPENWEATHERMAP_API_KEY='your_key'")
        print("\n   Or configure in config.json under features.air_fog")
        return False
    
    # Initialize source
    print("\n🔧 Initializing air/fog source...")
    source = AirFogSource(
        purpleair_api_key=purpleair_key,
        openweathermap_api_key=owm_key,
        latitude=DEFAULT_LAT,
        longitude=DEFAULT_LON,
        purpleair_sensor_id=sensor_id
    )
    print("✓ Air/fog source initialized")
    
    # Test individual data sources
    print_banner("Individual API Tests")
    
    # Test OpenWeatherMap
    print("\n🌤️  Testing OpenWeatherMap API...")
    owm_data = None
    if owm_key:
        owm_data = source.fetch_openweathermap_data()
        if owm_data:
            print("✓ OpenWeatherMap data fetched successfully")
            print_field("Visibility:", f"{owm_data['visibility_m']} m ({round(owm_data['visibility_m'] / 1609.34, 1)} mi)")
            print_field("Temperature:", f"{owm_data['temperature_f']}°F")
            print_field("Humidity:", f"{owm_data['humidity']}%")
            print_field("Dew Point:", f"{owm_data['dew_point_f']}°F")
            print_field("Condition:", owm_data.get('condition', 'Unknown'))
        else:
            print("✗ Failed to fetch OpenWeatherMap data")
    else:
        print("⏭️  Skipped (no API key)")
    
    # Test PurpleAir
    print("\n🌫️  Testing PurpleAir API...")
    purple_data = None
    if purpleair_key:
        purple_data = source.fetch_purpleair_data()
        if purple_data:
            print("✓ PurpleAir data fetched successfully")
            print_field("PM2.5:", f"{purple_data['pm2_5']} µg/m³")
            print_field("AQI:", f"{purple_data['aqi']} ({purple_data['aqi_category']})")
            print_field("AQI Color:", f"{get_color_emoji(purple_data['aqi_color'])} {purple_data['aqi_color']}")
        else:
            print("✗ Failed to fetch PurpleAir data")
            print("   Note: Make sure your API key is valid and the sensor ID exists")
    else:
        print("⏭️  Skipped (no API key)")
    
    # Test combined fetch
    print_banner("Combined Air & Fog Data")
    
    print("\n🔄 Fetching combined air/fog data...")
    combined_data = source.fetch_air_fog_data()
    
    if not combined_data:
        print("\n❌ ERROR: Failed to fetch combined data.")
        return False
    
    print("✓ Combined data fetched successfully")
    
    # Display results
    print("\n📊 Current Conditions:")
    
    # Air Quality
    if combined_data.get("pm2_5_aqi"):
        aqi = combined_data["pm2_5_aqi"]
        air_color = combined_data.get("air_color", "YELLOW")
        print_field("Air Quality Index:", f"{get_color_emoji(air_color)} {aqi}")
        print_field("PM2.5:", f"{combined_data.get('pm2_5', 'N/A')} µg/m³")
        print_field("Air Status:", combined_data.get("air_status", "Unknown"))
    else:
        print_field("Air Quality:", "No data available")
    
    # Visibility & Fog
    if combined_data.get("visibility_m"):
        vis_m = combined_data["visibility_m"]
        vis_mi = round(vis_m / 1609.34, 1)
        fog_color = combined_data.get("fog_color", "YELLOW")
        print_field("Visibility:", f"{get_color_emoji(fog_color)} {vis_m} m ({vis_mi} mi)")
        print_field("Fog Status:", combined_data.get("fog_status", "Unknown"))
        print_field("Is Foggy:", "Yes" if combined_data.get("is_foggy") else "No")
    else:
        print_field("Visibility:", "No data available")
    
    # Temperature & Humidity
    print_field("Temperature:", f"{combined_data.get('temperature_f', 'N/A')}°F")
    print_field("Humidity:", f"{combined_data.get('humidity', 'N/A')}%")
    print_field("Dew Point:", f"{combined_data.get('dew_point_f', 'N/A')}°F")
    
    # Alert message
    print("\n🚨 Alerts:")
    alert = combined_data.get("alert_message")
    if alert:
        print_field("Active Alert:", f"⚠️  {alert}")
    else:
        print_field("Active Alert:", "None - conditions normal")
    
    # Formatted message for display
    print("\n📱 Display Message:")
    print_field("Vestaboard:", combined_data.get("formatted_message", "NO DATA"))
    
    # Thresholds explanation
    print_banner("Trigger Thresholds")
    
    print("\n🌫️  FOG TRIGGER:")
    print_field("Visibility:", "< 1600m (1 mile) = HEAVY FOG")
    print_field("OR", "Humidity > 95% AND Temp < 60°F = HEAVY FOG")
    
    print("\n🔥 FIRE/AIR TRIGGER:")
    print_field("AQI > 100:", "AIR: UNHEALTHY (ORANGE)")
    print_field("AQI > 150:", "AIR: UNHEALTHY (RED)")
    print_field("AQI > 200:", "AIR: VERY UNHEALTHY (PURPLE)")
    print_field("AQI > 300:", "AIR: HAZARDOUS (MAROON)")
    
    # Analysis
    print_banner("Conditions Analysis")
    
    # Analyze dew point spread
    temp = combined_data.get("temperature_f")
    dew_point = combined_data.get("dew_point_f")
    if temp and dew_point:
        spread = temp - dew_point
        if spread < 3:
            print(f"\n⚠️  Dew point spread is {spread:.1f}°F - FOG LIKELY")
        elif spread < 6:
            print(f"\n⚡ Dew point spread is {spread:.1f}°F - Fog possible")
        else:
            print(f"\n✓ Dew point spread is {spread:.1f}°F - Fog unlikely")
    
    # Analyze AQI
    aqi = combined_data.get("pm2_5_aqi")
    if aqi:
        if aqi > 150:
            print(f"\n🔴 AQI {aqi} - Unhealthy for everyone. Limit outdoor activity.")
        elif aqi > 100:
            print(f"\n🟠 AQI {aqi} - Unhealthy for sensitive groups.")
        elif aqi > 50:
            print(f"\n🟡 AQI {aqi} - Moderate. Acceptable for most.")
        else:
            print(f"\n🟢 AQI {aqi} - Good air quality!")
    
    print_banner("Verification Summary")
    
    success_count = 0
    total_tests = 2
    
    if owm_data:
        print("\n✅ OpenWeatherMap integration: WORKING")
        success_count += 1
    else:
        print("\n❌ OpenWeatherMap integration: FAILED" if owm_key else "\n⏭️  OpenWeatherMap: Skipped (no key)")
    
    if purple_data:
        print("✅ PurpleAir integration: WORKING")
        success_count += 1
    else:
        print("❌ PurpleAir integration: FAILED" if purpleair_key else "⏭️  PurpleAir: Skipped (no key)")
    
    if success_count > 0:
        print(f"\n✅ Air/Fog integration verification completed! ({success_count}/{total_tests} sources)")
        return True
    else:
        print("\n❌ No data sources working. Check your API keys.")
        return False


def main():
    """Main entry point."""
    try:
        success = verify_air()
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




