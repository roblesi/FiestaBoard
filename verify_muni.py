#!/usr/bin/env python3
"""
Standalone verification script for Muni 511.org API integration.

This script connects to the real 511.org API and prints formatted
arrival data to verify the integration is working correctly.

Usage:
    python verify_muni.py --api-key YOUR_API_KEY --stop-code 15726 [--line N]

If you don't have an API key, request one at: https://511.org/open-data
"""

import argparse
import sys
import json
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, '.')

from src.data_sources.muni import MuniSource


def print_colored(text: str, color: str = None):
    """Print text with ANSI color codes for terminal."""
    colors = {
        "red": "\033[91m",
        "orange": "\033[93m",  # Yellow is closest to orange in terminal
        "green": "\033[92m",
        "blue": "\033[94m",
        "reset": "\033[0m",
    }
    
    if color and color in colors:
        print(f"{colors[color]}{text}{colors['reset']}")
    else:
        print(text)


def verify_muni_api(api_key: str, stop_code: str, line_name: str = None):
    """
    Connect to 511.org API and verify data retrieval.
    
    Args:
        api_key: 511.org API key
        stop_code: Muni stop code to monitor
        line_name: Optional line filter (e.g., "N" for N-Judah)
    """
    print("=" * 60)
    print("Muni 511.org API Integration Verification")
    print("=" * 60)
    print()
    
    # Create source
    source = MuniSource(
        api_key=api_key,
        stop_code=stop_code,
        line_name=line_name
    )
    
    print(f"Configuration:")
    print(f"  Stop Code: {stop_code}")
    print(f"  Line Filter: {line_name or 'None (all lines)'}")
    print()
    
    print("Fetching arrivals from 511.org...")
    print()
    
    # Fetch data
    result = source.fetch_arrivals()
    
    if result is None:
        print_colored("ERROR: Failed to fetch data from 511.org API", "red")
        print()
        print("Possible issues:")
        print("  - Invalid API key")
        print("  - Invalid stop code")
        print("  - Network connectivity")
        print("  - 511.org API is down")
        return False
    
    # Display results
    print_colored("SUCCESS: Data retrieved successfully!", "green")
    print()
    
    print("-" * 60)
    print("PARSED DATA:")
    print("-" * 60)
    
    print(f"  Line: {result.get('line', 'N/A')}")
    print(f"  Stop Name: {result.get('stop_name', 'N/A')}")
    print(f"  Is Delayed: {result.get('is_delayed', False)}")
    
    if result.get('delay_description'):
        print(f"  Delay Description: {result.get('delay_description')}")
    
    print()
    print("  Arrivals:")
    for i, arrival in enumerate(result.get('arrivals', []), 1):
        mins = arrival.get('minutes', 0)
        occupancy = arrival.get('occupancy', 'UNKNOWN')
        is_full = arrival.get('is_full', False)
        
        status = ""
        if is_full:
            status = " [FULL - ORANGE]"
        
        print(f"    {i}. {mins} minutes - Occupancy: {occupancy}{status}")
    
    print()
    print("-" * 60)
    print("FORMATTED OUTPUT (for Vestaboard):")
    print("-" * 60)
    
    formatted = result.get('formatted', '')
    
    # Interpret color codes for display
    if '{63}' in formatted:
        print_colored("  [RED - DELAY INDICATOR]", "red")
    if '{64}' in formatted:
        print_colored("  [ORANGE - FULL TRAIN]", "orange")
    
    # Clean up color codes for terminal display
    display_text = formatted
    display_text = display_text.replace('{63}', '')
    display_text = display_text.replace('{64}', '')
    
    # Print with appropriate color
    if result.get('is_delayed'):
        print_colored(f"  {display_text}", "red")
    elif any(a.get('is_full') for a in result.get('arrivals', [])):
        print_colored(f"  {display_text}", "orange")
    else:
        print(f"  {display_text}")
    
    print()
    print("-" * 60)
    print("RAW JSON RESPONSE (for debugging):")
    print("-" * 60)
    print(json.dumps(result, indent=2, default=str))
    
    print()
    print("=" * 60)
    print("Verification complete!")
    print("=" * 60)
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Verify Muni 511.org API integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Verify N-Judah arrivals at Church & Duboce
    python verify_muni.py --api-key YOUR_KEY --stop-code 15726 --line N
    
    # Verify all lines at a stop
    python verify_muni.py --api-key YOUR_KEY --stop-code 15726
    
    # Common stop codes:
    #   15726 - Church & Duboce (N, J)
    #   13992 - Powell Station (F, cable cars)
    #   14510 - Embarcadero Station (N, T, K, J, M)

Get an API key at: https://511.org/open-data
        """
    )
    
    parser.add_argument(
        "--api-key",
        required=True,
        help="Your 511.org API key"
    )
    
    parser.add_argument(
        "--stop-code",
        required=True,
        help="Muni stop code to monitor (e.g., 15726)"
    )
    
    parser.add_argument(
        "--line",
        default=None,
        help="Optional line filter (e.g., N for N-Judah)"
    )
    
    args = parser.parse_args()
    
    success = verify_muni_api(
        api_key=args.api_key,
        stop_code=args.stop_code,
        line_name=args.line
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()


