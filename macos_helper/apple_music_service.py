#!/usr/bin/env python3
"""
Apple Music Now Playing Service for macOS

This service runs on your Mac Studio and exposes Apple Music "Now Playing"
information via a simple HTTP endpoint. The Docker service on Synology
can poll this endpoint to get current track information.

Run this on your Mac Studio:
    python3 apple_music_service.py

Or run as a background service using launchd (see setup instructions).
"""

import subprocess
import json
import time
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import signal
import sys
from typing import Optional, Dict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)


class AppleMusicQuery:
    """Query Apple Music app for currently playing track."""
    
    APPLESCRIPT = '''
    tell application "Music"
        if it is running then
            if player state is playing then
                try
                    set currentTrack to current track
                    set trackName to name of currentTrack
                    set artistName to artist of currentTrack
                    set albumName to album of currentTrack
                    set playerPosition to player position
                    set trackDuration to duration of currentTrack
                    return trackName & "|" & artistName & "|" & albumName & "|" & (playerPosition as string) & "|" & (trackDuration as string)
                on error
                    return "ERROR|Failed to get track info"
                end try
            else
                return "NOT_PLAYING|"
            end if
        else
            return "NOT_RUNNING|"
        end if
    end tell
    '''
    
    @staticmethod
    def get_now_playing() -> Optional[Dict[str, any]]:
        """
        Get currently playing track information.
        
        Returns:
            Dictionary with track info, or None if not playing
        """
        try:
            result = subprocess.run(
                ['osascript', '-e', AppleMusicQuery.APPLESCRIPT],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                logger.error(f"AppleScript error: {result.stderr}")
                return None
            
            output = result.stdout.strip()
            
            if not output:
                return None
            
            # Parse output: "Track|Artist|Album|Position|Duration"
            parts = output.split("|")
            
            if len(parts) < 2:
                return None
            
            status = parts[0]
            
            if status == "NOT_PLAYING":
                return {"playing": False, "status": "not_playing"}
            
            if status == "NOT_RUNNING":
                return {"playing": False, "status": "not_running"}
            
            if status == "ERROR":
                return {"playing": False, "status": "error", "message": parts[1] if len(parts) > 1 else "Unknown error"}
            
            # Successfully playing
            track_info = {
                "playing": True,
                "track": parts[0] if len(parts) > 0 else "",
                "artist": parts[1] if len(parts) > 1 else "",
                "album": parts[2] if len(parts) > 2 else "",
                "position": float(parts[3]) if len(parts) > 3 and parts[3] else 0.0,
                "duration": float(parts[4]) if len(parts) > 4 and parts[4] else 0.0,
            }
            
            return track_info
            
        except subprocess.TimeoutExpired:
            logger.error("AppleScript execution timed out")
            return {"playing": False, "status": "timeout"}
        except Exception as e:
            logger.error(f"Failed to query Apple Music: {e}")
            return {"playing": False, "status": "error", "message": str(e)}


class NowPlayingHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Now Playing endpoint."""
    
    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/now-playing' or parsed_path.path == '/':
            # Get current track info
            track_info = AppleMusicQuery.get_now_playing()
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')  # Allow CORS
            self.end_headers()
            
            response = track_info if track_info else {
                "playing": False,
                "status": "unknown"
            }
            
            self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
            
        elif parsed_path.path == '/health':
            # Health check endpoint
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
            
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """Override to use our logger."""
        logger.info(f"{self.address_string()} - {format % args}")


class AppleMusicService:
    """Main service that runs HTTP server."""
    
    def __init__(self, host='0.0.0.0', port=8080):
        """
        Initialize the service.
        
        Args:
            host: Host to bind to (0.0.0.0 for all interfaces)
            port: Port to listen on
        """
        self.host = host
        self.port = port
        self.server = None
        self.running = True
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
        if self.server:
            self.server.shutdown()
    
    def run(self):
        """Run the HTTP server."""
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        server_address = (self.host, self.port)
        self.server = HTTPServer(server_address, NowPlayingHandler)
        
        logger.info(f"Apple Music Service started on http://{self.host}:{self.port}")
        logger.info("Endpoints:")
        logger.info("  GET /now-playing - Get current track info")
        logger.info("  GET /health - Health check")
        
        try:
            self.server.serve_forever()
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        finally:
            logger.info("Service stopped")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Apple Music Now Playing Service')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8080, help='Port to listen on (default: 8080)')
    
    args = parser.parse_args()
    
    service = AppleMusicService(host=args.host, port=args.port)
    service.run()


if __name__ == "__main__":
    main()

