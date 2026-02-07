---
sidebar_position: 1
---

# Introduction to FiestaBoard

**FiestaBoard** transforms your split-flap display into a living dashboard. Track your morning commute, monitor the markets, check surf conditions, or display Star Trek wisdom—all beautifully formatted and running in Docker with zero hassle.

## What is FiestaBoard?

FiestaBoard is an open-source platform that connects to your split-flap display and turns it into a real-time information hub. It features:

- **17+ Built-in Plugins**: Weather, stocks, transit, sports, surf conditions, and more
- **Modern Web UI**: Manage pages, configure plugins, and monitor your display
- **Docker Ready**: One-command deployment on any system
- **Plugin Architecture**: Easily create your own custom data sources

## Quick Start

The fastest way to get started:

### Using the Installation Script

```bash
# Mac/Linux
./scripts/install.sh

# Windows (PowerShell)
.\scripts\install.ps1
```

### Manual Setup

```bash
# 1. Create .env file with your API keys
cp env.example .env
# Edit .env and add: BOARD_READ_WRITE_KEY and WEATHER_API_KEY

# 2. Run it! (first time builds images)
docker-compose up --build
```

That's it! 🎉

**Access your FiestaBoard:**
- **Web UI**: http://localhost:8080
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Available Plugins

| Plugin | Description |
|--------|-------------|
| 🌤️ Weather | Current conditions, UV index, high/low temps |
| 📈 Stocks | Real-time stock prices with color indicators |
| 🚇 Muni Transit | SF Muni arrival predictions |
| 🏆 Sports Scores | NFL, Soccer, NHL, NBA scores |
| 🌊 Surf Conditions | Wave height and quality ratings |
| 🖖 Star Trek Quotes | Random quotes from TNG, Voyager, DS9 |
| 🚗 Traffic | Travel time with live traffic |
| 💨 Air Quality | AQI and fog conditions |
| 🏠 Home Assistant | Smart home status display |
| And many more... | |

## Next Steps

- [Setup Guide](/docs/setup/quick-start) - Detailed installation instructions
- [Plugin Configuration](/docs/plugins/overview) - Configure your data sources
- [Plugin Development](/docs/development/plugin-guide) - Create custom plugins
