# Apple Music Integration Setup Guide

This guide will help you set up Apple Music "Now Playing" display on your Vestaboard.

## Architecture

```
Mac Studio (macOS)          Synology (Linux Docker)
     │                            │
     │  AppleScript               │
     │  queries Music app         │
     │                            │
     │  HTTP Service              │
     │  (port 8080)               │
     │                            │
     └──────────HTTP──────────────┘
                    │
                    │  Polls /now-playing
                    │  every 10 seconds
                    │
              Docker Service
                    │
                    └──→ Vestaboard
```

## Step 1: Set Up macOS Helper Service on Mac Studio

### 1.1 Find Your Mac Studio's IP Address

On your Mac Studio, run:
```bash
# For Ethernet (hardwired)
ipconfig getifaddr en0

# Or check all interfaces
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Note the IP address** - you'll need it for Step 2 (e.g., `192.168.1.100`)

### 1.2 Copy Helper Service to Mac Studio

Copy the `macos_helper` directory to your Mac Studio. You can:

**Option A: If Mac Studio has access to this repo**
```bash
# On Mac Studio
cd /Users/roblesi/Dev/Vesta/macos_helper
```

**Option B: Copy files manually**
- Copy `macos_helper/apple_music_service.py` to your Mac Studio
- Place it in a convenient location (e.g., `~/vestaboard-helper/`)

### 1.3 Test the Service

On your Mac Studio:

```bash
cd ~/vestaboard-helper  # or wherever you put it
python3 apple_music_service.py
```

You should see:
```
Apple Music Service started on http://0.0.0.0:8080
Endpoints:
  GET /now-playing - Get current track info
  GET /health - Health check
```

### 1.4 Test the Endpoint

Open Music app and play a song, then test:

```bash
# In another terminal
curl http://localhost:8080/now-playing
```

You should see JSON with track info:
```json
{
  "playing": true,
  "track": "Song Name",
  "artist": "Artist Name",
  "album": "Album Name",
  "position": 45.2,
  "duration": 180.0
}
```

### 1.5 Grant Permissions

macOS may prompt for automation permissions. If so:

1. Go to **System Settings** → **Privacy & Security** → **Automation**
2. Find **Python** or **Terminal**
3. Enable checkbox for **Music**

### 1.6 Set Up as Background Service

**Option A: Using launchd (Recommended)**

1. Create `~/Library/LaunchAgents/com.vestaboard.applemusic.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.vestaboard.applemusic</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/roblesi/Dev/Vesta/macos_helper/apple_music_service.py</string>
        <string>--port</string>
        <string>8080</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/roblesi/Dev/Vesta/macos_helper/service.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/roblesi/Dev/Vesta/macos_helper/service.error.log</string>
</dict>
</plist>
```

**Important:** Update the path to `apple_music_service.py` in the plist file!

2. Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.vestaboard.applemusic.plist
```

3. Check it's running:
```bash
launchctl list | grep vestaboard
curl http://localhost:8080/health
```

4. To stop:
```bash
launchctl unload ~/Library/LaunchAgents/com.vestaboard.applemusic.plist
```

**Option B: Using screen (Simple)**

```bash
screen -S applemusic
python3 apple_music_service.py
# Press Ctrl+A then D to detach
```

### 1.7 Configure Firewall (if needed)

If you can't connect from Synology:

1. Go to **System Settings** → **Network** → **Firewall** → **Options**
2. Either:
   - Add **Python** to allowed apps
   - Or allow incoming connections on port **8080**

## Step 2: Configure Docker Service on Synology

### 2.1 Update .env File

On your Synology (or wherever your Docker service runs), edit `.env`:

```bash
# Apple Music Configuration
APPLE_MUSIC_ENABLED=true
APPLE_MUSIC_SERVICE_URL=http://192.168.1.100:8080
APPLE_MUSIC_TIMEOUT=5
APPLE_MUSIC_REFRESH_SECONDS=10
```

**Important:** Replace `192.168.1.100` with your Mac Studio's actual IP address!

### 2.2 Restart Docker Service

```bash
docker-compose restart
# Or
docker restart vestaboard-display
```

### 2.3 Check Logs

```bash
docker-compose logs -f
```

You should see:
```
Apple Music source initialized (http://192.168.1.100:8080)
Apple Music checks every 10 seconds
```

## Step 3: Test the Integration

1. **Start playing music** on your Mac Studio (Music app)
2. **Watch the Vestaboard** - it should display:
   ```
   Now Playing:
   Artist Name - Song Name
   Album: Album Name
   ```
3. **Check Docker logs** to see if it's fetching data:
   ```bash
   docker-compose logs -f | grep -i "apple\|music"
   ```

## How It Works

1. **Mac Studio** runs the helper service, querying Music app every request
2. **Docker service** polls Mac Studio every 10 seconds for current track
3. **When music is playing**, Vestaboard displays it (prioritized over weather/date)
4. **When music stops**, Vestaboard falls back to weather/date display

## Troubleshooting

### "Could not connect to Apple Music service"

**Check:**
1. Is the helper service running on Mac Studio?
   ```bash
   curl http://localhost:8080/health  # On Mac Studio
   ```

2. Can Synology reach Mac Studio?
   ```bash
   # From Synology (or Docker container)
   curl http://192.168.1.100:8080/health
   ```

3. Is firewall blocking?
   - Check Mac Studio firewall settings
   - Try temporarily disabling firewall to test

4. Is IP address correct?
   - Verify Mac Studio IP hasn't changed (DHCP)
   - Consider using static IP for Mac Studio

### "Music app is not running"

- The helper service only works when Music app is open
- Make sure Music app is running on Mac Studio

### "Failed to get track info"

- Check automation permissions in System Settings
- Some streaming tracks may not work (known AppleScript limitation)
- Try playing a local library track to test

### Service stops after logout

- Use launchd (Option A) instead of running manually
- launchd keeps it running even after logout

### Can't find Mac Studio IP

```bash
# On Mac Studio
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or check Network settings in System Settings
```

## Advanced Configuration

### Change Port

If port 8080 is in use:

1. **Mac Studio service:**
   ```bash
   python3 apple_music_service.py --port 9000
   ```

2. **Update .env:**
   ```bash
   APPLE_MUSIC_SERVICE_URL=http://192.168.1.100:9000
   ```

### Change Refresh Rate

In `.env`:
```bash
APPLE_MUSIC_REFRESH_SECONDS=5  # Check every 5 seconds (more frequent)
```

### Disable Apple Music

In `.env`:
```bash
APPLE_MUSIC_ENABLED=false
```

## Next Steps

- ✅ Apple Music integration complete!
- Consider adding to Phase 3: Baywheels integration
- Consider adding to Phase 4: Waymo pricing

## Support

If you encounter issues:
1. Check Mac Studio service logs
2. Check Docker service logs
3. Verify network connectivity
4. Test endpoints manually with curl

