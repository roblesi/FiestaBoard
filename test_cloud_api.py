#!/usr/bin/env python3
"""Quick test script for Vestaboard Cloud API."""

import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Get the Read/Write key from environment
API_KEY = os.getenv("VB_READ_WRITE_KEY", "")

if not API_KEY:
    print("ERROR: VB_READ_WRITE_KEY not set in .env file")
    exit(1)

# Test the Cloud API
url = "https://rw.vestaboard.com/"
headers = {
    "X-Vestaboard-Read-Write-Key": API_KEY,
    "Content-Type": "application/json"
}

# Try to send a test message
payload = {"text": "Cloud API Test - Success!"}

print(f"Testing Vestaboard Cloud API...")
print(f"Sending: {payload['text']}")
print(f"API Key (first 10 chars): {API_KEY[:10]}...")

try:
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    response.raise_for_status()
    
    print(f"\n✅ SUCCESS!")
    print(f"HTTP Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print(f"\nCheck your Vestaboard - it should show: '{payload['text']}'")
    
except requests.exceptions.RequestException as e:
    print(f"\n❌ FAILED!")
    print(f"Error: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Response text: {e.response.text}")

