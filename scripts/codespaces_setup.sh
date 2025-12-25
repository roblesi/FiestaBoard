#!/bin/bash
# Codespaces Setup Script
# Generates .env file from GitHub Codespaces secrets

set -e

echo "🚀 Vestaboard Codespaces Setup"
echo "=============================="
echo ""

# Check if running in Codespaces
if [ -z "$CODESPACES" ]; then
    echo "⚠️  Not running in GitHub Codespaces"
    echo "This script is designed for GitHub Codespaces environment."
    echo "For local setup, manually create .env from env.example"
    exit 1
fi

echo "✅ Running in GitHub Codespaces"
echo ""

# Check for required secrets
MISSING_SECRETS=()

if [ -z "$VB_READ_WRITE_KEY" ]; then
    MISSING_SECRETS+=("VB_READ_WRITE_KEY")
fi

if [ -z "$WEATHER_API_KEY" ]; then
    MISSING_SECRETS+=("WEATHER_API_KEY")
fi

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo "❌ Missing required Codespaces secrets:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "   - $secret"
    done
    echo ""
    echo "Please add these secrets to your GitHub repository:"
    echo "Settings → Secrets and variables → Codespaces → New secret"
    echo ""
    exit 1
fi

echo "✅ All required secrets found"
echo ""

# Generate .env file
echo "📝 Generating .env file from Codespaces secrets..."

cat > .env << EOF
# Vestaboard Configuration
# Auto-generated from GitHub Codespaces secrets
VB_API_MODE=cloud
VB_READ_WRITE_KEY=$VB_READ_WRITE_KEY

# Weather API Configuration
WEATHER_API_KEY=$WEATHER_API_KEY
WEATHER_PROVIDER=${WEATHER_PROVIDER:-weatherapi}

# Location Configuration
WEATHER_LOCATION=${WEATHER_LOCATION:-San Francisco, CA}
TIMEZONE=${TIMEZONE:-America/Los_Angeles}

# Apple Music Configuration
APPLE_MUSIC_ENABLED=${APPLE_MUSIC_ENABLED:-false}
APPLE_MUSIC_SERVICE_URL=${APPLE_MUSIC_SERVICE_URL:-http://192.168.1.100:8080}
APPLE_MUSIC_TIMEOUT=${APPLE_MUSIC_TIMEOUT:-5}
APPLE_MUSIC_REFRESH_SECONDS=${APPLE_MUSIC_REFRESH_SECONDS:-10}

# Guest WiFi Configuration
GUEST_WIFI_ENABLED=${GUEST_WIFI_ENABLED:-false}
GUEST_WIFI_SSID=${GUEST_WIFI_SSID:-GuestNetwork}
GUEST_WIFI_PASSWORD=${GUEST_WIFI_PASSWORD:-YourPasswordHere}
GUEST_WIFI_REFRESH_SECONDS=${GUEST_WIFI_REFRESH_SECONDS:-60}

# Home Assistant Configuration
HOME_ASSISTANT_ENABLED=${HOME_ASSISTANT_ENABLED:-false}
HOME_ASSISTANT_BASE_URL=${HOME_ASSISTANT_BASE_URL:-http://192.168.1.100:8123}
HOME_ASSISTANT_ACCESS_TOKEN=${HOME_ASSISTANT_ACCESS_TOKEN:-}
HOME_ASSISTANT_ENTITIES=${HOME_ASSISTANT_ENTITIES:-[]}
HOME_ASSISTANT_TIMEOUT=${HOME_ASSISTANT_TIMEOUT:-5}
HOME_ASSISTANT_REFRESH_SECONDS=${HOME_ASSISTANT_REFRESH_SECONDS:-30}

# Star Trek Quotes Configuration
STAR_TREK_QUOTES_ENABLED=${STAR_TREK_QUOTES_ENABLED:-false}
STAR_TREK_QUOTES_RATIO=${STAR_TREK_QUOTES_RATIO:-3:5:9}
EOF

echo "✅ .env file created successfully"
echo ""

# Show status
echo "📋 Configuration Summary:"
echo "   VB API Key: ${VB_READ_WRITE_KEY:0:10}..."
echo "   Weather API Key: ${WEATHER_API_KEY:0:10}..."
echo "   Weather Location: ${WEATHER_LOCATION:-San Francisco, CA}"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review .env file and adjust optional settings"
echo "2. Run: docker-compose -f docker-compose.dev.yml up"
echo ""
