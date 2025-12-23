# Apple Music Helper Service

This service runs on your Mac Studio and exposes Apple Music "Now Playing" information via HTTP. The Docker service on your Synology can poll this endpoint to get current track information.

## Quick Start

### 1. Install (No dependencies needed - uses Python standard library)

```bash
cd macos_helper
# No pip install needed!
```

### 2. Run the Service

```bash
python3 apple_music_service.py
```

The service will start on `http://0.0.0.0:8080` (accessible from your network).

### 3. Test It

Open in browser or use curl:
```bash
curl http://localhost:8080/now-playing
```

You should see JSON like:
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

## Configuration

### Change Port

```bash
python3 apple_music_service.py --port 9000
```

### Change Host

```bash
python3 apple_music_service.py --host 127.0.0.1  # Local only
python3 apple_music_service.py --host 0.0.0.0    # All interfaces (default)
```

## Running as a Background Service

### Option 1: Using launchd (Recommended)

1. Create a plist file at `~/Library/LaunchAgents/com.vestaboard.applemusic.plist`:

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

2. Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.vestaboard.applemusic.plist
```

3. Check status:
```bash
launchctl list | grep vestaboard
```

4. Unload (to stop):
```bash
launchctl unload ~/Library/LaunchAgents/com.vestaboard.applemusic.plist
```

### Option 2: Using screen/tmux

```bash
# Using screen
screen -S applemusic
python3 apple_music_service.py
# Press Ctrl+A then D to detach

# Reattach later
screen -r applemusic
```

### Option 3: Using nohup

```bash
nohup python3 apple_music_service.py > service.log 2>&1 &
```

## Permissions

macOS may prompt you to grant automation permissions to Python/Terminal to control the Music app. If prompted:

1. Go to **System Settings** → **Privacy & Security** → **Automation**
2. Find Python or Terminal
3. Enable "Music" checkbox

## Firewall

If your Mac Studio firewall is enabled, you may need to allow incoming connections on port 8080:

1. Go to **System Settings** → **Network** → **Firewall** → **Options**
2. Add Python to allowed apps, or allow incoming connections on port 8080

## Endpoints

### GET /now-playing

Returns current track information:

**Response (playing):**
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

**Response (not playing):**
```json
{
  "playing": false,
  "status": "not_playing"
}
```

**Response (Music app not running):**
```json
{
  "playing": false,
  "status": "not_running"
}
```

### GET /health

Health check endpoint:
```json
{
  "status": "ok"
}
```

## Troubleshooting

### "Music app is not running"
- Make sure Music app is open
- The service only works when Music app is running

### "Failed to get track info"
- Check automation permissions in System Settings
- Try running Music app and playing a track first
- Some streaming tracks may not work (known AppleScript limitation)

### Can't connect from Synology
- Check Mac Studio's IP address: `ifconfig | grep "inet "`
- Verify firewall allows connections on port 8080
- Test locally first: `curl http://localhost:8080/now-playing`
- Then test from Synology: `curl http://<mac-studio-ip>:8080/now-playing`

### Service stops after logout
- Use launchd (Option 1) to run as a background service
- Or use screen/tmux to keep it running

## Finding Your Mac Studio's IP Address

```bash
# Get IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use this one-liner
ipconfig getifaddr en0  # For Wi-Fi
ipconfig getifaddr en1  # For Ethernet (hardwired)
```

Use this IP address in your Docker service configuration.

