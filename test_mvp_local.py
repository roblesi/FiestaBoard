#!/usr/bin/env python3
"""Quick test of MVP functionality without Docker."""

import sys
import os
sys.path.insert(0, 'src')

# Load environment
from dotenv import load_dotenv
load_dotenv()

from src.config import Config
from src.vestaboard_client import VestaboardClient
from src.data_sources.weather import get_weather_source
from src.data_sources.datetime import get_datetime_source
from src.data_sources.apple_music import get_apple_music_source
from src.formatters.message_formatter import get_message_formatter

def test_config():
    """Test configuration."""
    print("📋 Testing Configuration...")
    print(f"  VB Key: {'✅' if Config.VB_READ_WRITE_KEY else '❌'}")
    print(f"  Weather Key: {'✅' if Config.WEATHER_API_KEY else '❌'}")
    print(f"  Weather Provider: {Config.WEATHER_PROVIDER}")
    print(f"  Apple Music: {'✅ Enabled' if Config.APPLE_MUSIC_ENABLED else '⚠️  Disabled'}")
    if Config.APPLE_MUSIC_ENABLED:
        print(f"  Apple Music URL: {Config.APPLE_MUSIC_SERVICE_URL}")
    print()

def test_data_sources():
    """Test data sources."""
    print("🔍 Testing Data Sources...")
    
    # Weather
    weather_source = get_weather_source()
    if weather_source:
        print("  Weather: ✅ Initialized")
        try:
            weather_data = weather_source.fetch_current_weather()
            if weather_data:
                print(f"    ✅ Fetched: {weather_data.get('location', 'N/A')} - {weather_data.get('temperature', 'N/A')}°F")
            else:
                print("    ⚠️  No weather data returned")
        except Exception as e:
            print(f"    ❌ Error: {e}")
    else:
        print("  Weather: ❌ Not available")
    
    # DateTime
    datetime_source = get_datetime_source()
    if datetime_source:
        dt_data = datetime_source.get_current_datetime()
        print(f"  DateTime: ✅ {dt_data.get('datetime', 'N/A')}")
    
    # Apple Music
    apple_music_source = get_apple_music_source()
    if apple_music_source:
        print("  Apple Music: ✅ Initialized")
        try:
            music_data = apple_music_source.fetch_now_playing()
            if music_data:
                print(f"    ✅ Now Playing: {music_data.get('artist', 'N/A')} - {music_data.get('track', 'N/A')}")
            else:
                print("    ℹ️  No music currently playing")
        except Exception as e:
            print(f"    ❌ Error: {e}")
    else:
        print("  Apple Music: ⚠️  Not enabled or not available")
    
    print()

def test_formatter():
    """Test message formatting."""
    print("📝 Testing Message Formatter...")
    
    formatter = get_message_formatter()
    
    # Get sample data
    weather_source = get_weather_source()
    datetime_source = get_datetime_source()
    apple_music_source = get_apple_music_source()
    
    weather_data = weather_source.fetch_current_weather() if weather_source else None
    datetime_data = datetime_source.get_current_datetime() if datetime_source else None
    music_data = apple_music_source.fetch_now_playing() if apple_music_source else None
    
    # Format combined
    if weather_data or datetime_data:
        message = formatter.format_combined(weather_data, datetime_data)
        print("  Combined Message (Weather + DateTime):")
        for i, line in enumerate(message.split('\n'), 1):
            print(f"    {i}: {line}")
    
    # Format Apple Music if available
    if music_data:
        music_message = formatter.format_apple_music(music_data)
        print("\n  Apple Music Message:")
        for i, line in enumerate(music_message.split('\n'), 1):
            print(f"    {i}: {line}")
    
    print()

def test_vestaboard_connection():
    """Test Vestaboard connection (dry run - won't send)."""
    print("🔌 Testing Vestaboard Connection...")
    
    if not Config.VB_READ_WRITE_KEY:
        print("  ❌ No Vestaboard API key configured")
        return
    
    if Config.VB_LOCAL_API_ENABLED and not Config.VB_LOCAL_API_HOST:
        print("  ❌ Local API enabled but VB_LOCAL_API_HOST not configured")
        return
    
    try:
        client = VestaboardClient(
            api_key=Config.VB_READ_WRITE_KEY,
            local_api_host=Config.VB_LOCAL_API_HOST if Config.VB_LOCAL_API_ENABLED else None,
            use_local_api=Config.VB_LOCAL_API_ENABLED
        )
        if Config.VB_LOCAL_API_ENABLED:
            print(f"  ✅ Client initialized (Local API at {Config.VB_LOCAL_API_HOST})")
        else:
            print("  ✅ Client initialized (Read/Write API)")
        print("  ℹ️  To actually send, uncomment the send_text call below")
        
        # Uncomment to actually send a test message:
        # test_message = "MVP Test\nWeather + DateTime\nWorking!"
        # success = client.send_text(test_message)
        # print(f"  {'✅' if success else '❌'} Message sent: {success}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
    
    print()

def main():
    """Run all tests."""
    print("🧪 MVP Test Suite")
    print("=" * 50)
    print()
    
    test_config()
    test_data_sources()
    test_formatter()
    test_vestaboard_connection()
    
    print("=" * 50)
    print("✅ MVP Test Complete!")
    print()
    print("📋 Next Steps:")
    print("  1. If all tests pass, deploy to Synology")
    print("  2. Build Docker image: docker build -t vestaboard-display .")
    print("  3. Run: docker-compose up -d")
    print("  4. Check logs: docker-compose logs -f")

if __name__ == "__main__":
    main()

