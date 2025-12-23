#!/usr/bin/env python3
"""Helper script to create .env file from template with your API keys."""

import os
import shutil

# Your API keys (from your input)
VB_KEY = "1a801a86+c1f1+4007+bec9+7ea92443d3cd"
WEATHER_KEY = "bd6af5858e41468396d25331252312"

def create_env_file():
    """Create .env file with your API keys."""
    env_example = "env.example"
    env_file = ".env"
    
    if os.path.exists(env_file):
        print(f"⚠️  {env_file} already exists!")
        response = input("Do you want to overwrite it? (y/N): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
    
    # Read template
    if not os.path.exists(env_example):
        print(f"❌ {env_example} not found!")
        return
    
    with open(env_example, 'r') as f:
        content = f.read()
    
    # Replace placeholders with actual keys
    content = content.replace("your_vestaboard_read_write_key_here", VB_KEY)
    content = content.replace("your_weather_api_key_here", WEATHER_KEY)
    
    # Write .env file
    with open(env_file, 'w') as f:
        f.write(content)
    
    print(f"✅ Created {env_file} with your API keys!")
    print(f"   - Vestaboard key: {VB_KEY[:20]}...")
    print(f"   - Weather key: {WEATHER_KEY[:20]}...")
    print("\n⚠️  Remember: .env is in .gitignore and won't be committed to git.")

if __name__ == "__main__":
    create_env_file()

