"""Apple Music data source - fetches from macOS helper service."""

import logging
import requests
from typing import Optional, Dict
from ..config import Config

logger = logging.getLogger(__name__)


class AppleMusicSource:
    """Fetches currently playing track from macOS helper service."""
    
    def __init__(self, service_url: str, timeout: int = 5):
        """
        Initialize Apple Music source.
        
        Args:
            service_url: URL of the macOS helper service (e.g., "http://192.168.1.100:8080")
            timeout: Request timeout in seconds
        """
        self.service_url = service_url.rstrip('/')
        self.timeout = timeout
        self.now_playing_endpoint = f"{self.service_url}/now-playing"
    
    def fetch_now_playing(self) -> Optional[Dict[str, any]]:
        """
        Fetch currently playing track information.
        
        Returns:
            Dictionary with track info, or None if not playing/failed
        """
        try:
            response = requests.get(
                self.now_playing_endpoint,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Check if actually playing
            if not data.get("playing", False):
                status = data.get("status", "unknown")
                logger.debug(f"Apple Music not playing: {status}")
                return None
            
            # Return track information
            return {
                "track": data.get("track", ""),
                "artist": data.get("artist", ""),
                "album": data.get("album", ""),
                "position": data.get("position", 0.0),
                "duration": data.get("duration", 0.0),
            }
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout connecting to Apple Music service at {self.service_url}")
            return None
        except requests.exceptions.ConnectionError:
            logger.warning(f"Could not connect to Apple Music service at {self.service_url}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch Apple Music data: {e}")
            return None
        except (KeyError, ValueError) as e:
            logger.error(f"Unexpected response format from Apple Music service: {e}")
            return None


def get_apple_music_source() -> Optional[AppleMusicSource]:
    """Get configured Apple Music source instance."""
    if not Config.APPLE_MUSIC_ENABLED:
        return None
    
    if not Config.APPLE_MUSIC_SERVICE_URL:
        logger.warning("Apple Music enabled but service URL not configured")
        return None
    
    return AppleMusicSource(
        service_url=Config.APPLE_MUSIC_SERVICE_URL,
        timeout=Config.APPLE_MUSIC_TIMEOUT
    )

