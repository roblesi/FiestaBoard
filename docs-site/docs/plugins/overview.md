---
sidebar_position: 1
---

# Plugins Overview

FiestaBoard uses a **plugin architecture**—each feature is a self-contained plugin with its own configuration and documentation.

## Available Plugins

| Plugin | Description | API Key Required |
|--------|-------------|------------------|
| 💨 **Air Quality & Fog** | Monitor AQI and fog conditions | Yes (PurpleAir/OWM) |
| 🚴 **Bay Wheels** | Track bike availability at stations | No |
| 📅 **Date & Time** | Current date/time with multiple formats | No |
| 📶 **Guest WiFi** | Display WiFi credentials | No |
| 🏠 **Home Assistant** | Smart home status display | Yes (HA token) |
| 🎵 **Last.fm Now Playing** | Currently playing music | Yes (Last.fm) |
| 🚇 **Muni Transit** | SF Muni arrival predictions | Yes (free 511.org) |
| 🛩️ **Nearby Aircraft** | Real-time aircraft info | No (optional OpenSky) |
| 🏆 **Sports Scores** | NFL, Soccer, NHL, NBA scores | No (optional TheSportsDB) |
| ☀️ **Sun Art** | Sun art pattern by time of day | No |
| 🖖 **Star Trek Quotes** | Quotes from TNG, Voyager, DS9 | No |
| 📈 **Stocks** | Stock prices with color indicators | No (optional Finnhub) |
| 🌊 **Surf Conditions** | Wave height and quality | No |
| 🚗 **Traffic** | Travel time with live traffic | Yes (Google Routes) |
| 🕐 **Visual Clock** | Full-screen pixel-art clock | No |
| 🌤️ **Weather** | Temperature, UV, precipitation | Yes (OpenWeatherMap) |

## Enabling Plugins

Plugins are enabled via the **Web UI**:

1. Open http://localhost:8080
2. Go to the **Integrations** page
3. Toggle plugins on/off
4. Configure API keys as needed

## Plugin Configuration

Each plugin can be configured through:
- **Web UI** - The Integrations page
- **Environment variables** - In your `.env` file

See individual plugin documentation for specific configuration options.

## Creating Custom Plugins

Want to add your own data source? Check out the [Plugin Development Guide](/docs/development/plugin-guide).
