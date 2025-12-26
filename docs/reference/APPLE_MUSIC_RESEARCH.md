# Apple Music "Now Playing" Integration Research

This document outlines the research findings for displaying Apple Music "Now Playing" information (artist + song) on the Vestaboard.

## Summary

✅ **Yes, it's possible** to display Apple Music "Now Playing" information on your Vestaboard, but the implementation approach depends on your server setup and macOS availability.

## Available Approaches

### 1. AppleScript (macOS - Recommended for Local Setup)

**How it works:**
- Use AppleScript to query the Music app directly
- Execute via `osascript` command from Python
- Simple and straightforward for macOS

**Pros:**
- ✅ Simple implementation
- ✅ Works with local library
- ✅ No API authentication needed
- ✅ Real-time access to Music app state

**Cons:**
- ⚠️ **Known limitation**: May not work reliably with streaming content (Apple Music streaming) in newer macOS versions
- ⚠️ Requires macOS (won't work in Linux Docker container directly)
- ⚠️ Requires Music app to be running
- ⚠️ Needs automation permissions

**Example AppleScript:**
```applescript
tell application "Music"
    if it is running then
        if player state is playing then
            set currentTrack to current track
            set trackName to name of currentTrack
            set artistName to artist of currentTrack
            return trackName & " - " & artistName
        else
            return "No track is currently playing."
        end if
    else
        return "Music app is not running."
    end if
end tell
```

**Python Integration:**
```python
import subprocess

def get_apple_music_now_playing():
    script = '''
    tell application "Music"
        if it is running then
            if player state is playing then
                set currentTrack to current track
                set trackName to name of currentTrack
                set artistName to artist of currentTrack
                return trackName & " - " & artistName
            else
                return "No track is currently playing."
            end if
        else
            return "Music app is not running."
        end if
    end tell
    '''
    result = subprocess.run(
        ['osascript', '-e', script],
        capture_output=True,
        text=True,
        timeout=5
    )
    return result.stdout.strip()
```

### 2. MusicKit API (Official - More Complex)

**How it works:**
- Apple's official MusicKit framework
- Requires developer token and user authorization
- More reliable but requires OAuth flow

**Pros:**
- ✅ Official Apple API
- ✅ Works with streaming content
- ✅ More reliable than AppleScript
- ✅ Can access playback state

**Cons:**
- ❌ Requires Apple Developer account
- ❌ Requires user authorization (OAuth)
- ❌ More complex setup
- ❌ Rate limits apply
- ❌ Primarily designed for iOS/macOS apps

**Requirements:**
- Apple Developer account ($99/year)
- MusicKit developer token
- User authorization flow
- OAuth implementation

### 3. MPNowPlayingInfoCenter (Native Framework)

**How it works:**
- Uses Apple's Media Player framework
- Access to system-wide "Now Playing" info
- Requires native app development (Swift/Objective-C)

**Pros:**
- ✅ System-level access
- ✅ Works with any media player
- ✅ Real-time updates

**Cons:**
- ❌ Requires native macOS/iOS app
- ❌ Not directly accessible from Python
- ❌ Would need a helper app/service

### 4. Third-Party Solutions

**NowPlaying API Projects:**
- Some developers have created services that expose Now Playing data
- May require additional setup and maintenance
- Reliability varies

## Implementation Recommendations

### Option A: macOS Server with Direct Access

If your home server is macOS or you have a macOS machine on the network:

1. **Create a data source module** that uses AppleScript
2. **Run the service locally** or on macOS
3. **Query Music app** directly via `osascript`

**Architecture:**
```
macOS Server → AppleScript → Music App → Python Service → Vestaboard
```

### Option B: Hybrid Approach (macOS Helper + Docker Service)

If your Docker container runs on Linux but you have a macOS machine:

1. **Create a small macOS service/script** that:
   - Queries Music app via AppleScript
   - Exposes data via HTTP endpoint or writes to file/queue
   - Runs continuously on macOS

2. **Extend the Docker service** to:
   - Poll the macOS endpoint/file
   - Fetch Now Playing data
   - Display on Vestaboard

**Architecture:**
```
macOS Machine → AppleScript Service → HTTP/File → Docker Service → Vestaboard
```

### Option C: Shortcuts Automation (iOS/macOS)

1. **Create Apple Shortcuts automation** that:
   - Monitors Apple Music playback
   - Sends data to your service via webhook/API
   - Runs on your iPhone/iPad/Mac

2. **Service receives webhook** and updates Vestaboard

**Architecture:**
```
iPhone/Mac → Shortcuts → Webhook → Docker Service → Vestaboard
```

## Known Limitations

### AppleScript Streaming Issue

**Problem:** AppleScript's `current track` command may not work reliably with Apple Music streaming content in newer macOS versions (Ventura, Sonoma).

**Workarounds:**
- Works better with local library tracks
- Some users report it works intermittently
- May need to test on your specific macOS version

**References:**
- [Stack Overflow Discussion](https://stackoverflow.com/questions/79747634/applescript-issue-with-current-track-in-apple-music)

### Permissions Required

- **Automation Permissions**: macOS may prompt for permission to control Music app
- **Accessibility**: May need accessibility permissions in System Settings

## Recommended Implementation Plan

### Phase 1: Simple AppleScript Integration (if macOS available)

1. Create `data_sources/apple_music.py` module
2. Implement AppleScript execution
3. Add error handling for:
   - Music app not running
   - No track playing
   - Streaming content issues
4. Format output for Vestaboard (6x22 grid)
5. Display on Vestaboard

### Phase 2: Hybrid Approach (if Linux Docker)

1. Create macOS helper script/service
2. Expose Now Playing data via simple HTTP server or file
3. Extend Docker service to poll this endpoint
4. Handle network connectivity issues

### Phase 3: Enhanced Features

1. Album art (if possible)
2. Playback state (playing/paused)
3. Progress indicator
4. Smart formatting for long artist/song names

## Code Structure

```python
# src/data_sources/apple_music.py

import subprocess
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class AppleMusicSource:
    """Fetches currently playing track from Apple Music via AppleScript."""
    
    def __init__(self):
        """Initialize Apple Music source."""
        self.applescript = '''
        tell application "Music"
            if it is running then
                if player state is playing then
                    set currentTrack to current track
                    set trackName to name of currentTrack
                    set artistName to artist of currentTrack
                    set albumName to album of currentTrack
                    return trackName & "|" & artistName & "|" & albumName
                else
                    return "NOT_PLAYING"
                end if
            else
                return "NOT_RUNNING"
            end if
        end tell
        '''
    
    def fetch_now_playing(self) -> Optional[Dict[str, str]]:
        """Fetch currently playing track information."""
        try:
            result = subprocess.run(
                ['osascript', '-e', self.applescript],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            output = result.stdout.strip()
            
            if output == "NOT_PLAYING":
                return None
            if output == "NOT_RUNNING":
                logger.warning("Music app is not running")
                return None
            
            # Parse output: "Track|Artist|Album"
            parts = output.split("|")
            if len(parts) >= 2:
                return {
                    "track": parts[0],
                    "artist": parts[1],
                    "album": parts[2] if len(parts) > 2 else ""
                }
            
            return None
            
        except subprocess.TimeoutExpired:
            logger.error("AppleScript execution timed out")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch Apple Music data: {e}")
            return None
```

## Configuration

Add to `.env`:
```bash
# Apple Music Configuration
APPLE_MUSIC_ENABLED=true
APPLE_MUSIC_REFRESH_SECONDS=5  # Check every 5 seconds when enabled
```

## Testing Checklist

- [ ] Test with local library tracks
- [ ] Test with Apple Music streaming
- [ ] Test when Music app is not running
- [ ] Test when no track is playing
- [ ] Test with long artist/song names (truncation)
- [ ] Verify permissions are granted
- [ ] Test on your specific macOS version

## Next Steps

1. **Determine your server setup**: macOS or Linux?
2. **Choose implementation approach** based on setup
3. **Test AppleScript** on your macOS version
4. **Implement data source module**
5. **Add to message formatter**
6. **Integrate into main service**

## References

- [Apple MusicKit Documentation](https://developer.apple.com/musickit/)
- [AppleScript Music App Reference](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_cmds.html)
- [Stack Overflow: AppleScript Current Track Issue](https://stackoverflow.com/questions/79747634/applescript-issue-with-current-track-in-apple-music)
- [Apple Music CLI Player](https://deepwiki.com/mcthomas/Apple-Music-CLI-Player/)

