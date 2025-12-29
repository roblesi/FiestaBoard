"""Apple Music data source - fetches from macOS helper service or Home Assistant."""

import logging
import requests
from typing import Optional, Dict
from ..config import Config

logger = logging.getLogger(__name__)


class AppleMusicSource:
    """Fetches currently playing track from macOS helper service or Home Assistant media_player."""
    
    def __init__(self, service_url: Optional[str] = None, timeout: int = 5, 
                 home_assistant_source: Optional[object] = None, 
                 home_assistant_entity_id: Optional[str] = None):
        """
        Initialize Apple Music source.
        
        Args:
            service_url: URL of the macOS helper service (e.g., "http://192.168.1.100:8080")
                        If None, will use Home Assistant mode
            timeout: Request timeout in seconds
            home_assistant_source: HomeAssistantSource instance (if using HA mode)
            home_assistant_entity_id: Home Assistant media_player entity ID (e.g., "media_player.homepod")
        """
        self.service_url = service_url.rstrip('/') if service_url else None
        self.timeout = timeout
        self.now_playing_endpoint = f"{self.service_url}/now-playing" if self.service_url else None
        self.home_assistant_source = home_assistant_source
        self.home_assistant_entity_id = home_assistant_entity_id
        self.mode = "home_assistant" if home_assistant_entity_id else "service"
    
    def fetch_now_playing(self) -> Optional[Dict[str, any]]:
        """
        Fetch currently playing track information.
        
        Returns:
            Dictionary with track info, or None if not playing/failed
        """
        if self.mode == "home_assistant":
            return self._fetch_from_home_assistant()
        else:
            return self._fetch_from_service()
    
    def _fetch_from_service(self) -> Optional[Dict[str, any]]:
        """Fetch from macOS helper service."""
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
    
    def _fetch_from_home_assistant(self) -> Optional[Dict[str, any]]:
        """Fetch from Home Assistant media_player entity."""
        if not self.home_assistant_source or not self.home_assistant_entity_id:
            logger.warning("Home Assistant source or entity ID not configured")
            return None
        
        try:
            state_data = self.home_assistant_source.get_entity_state(self.home_assistant_entity_id)
            
            if not state_data:
                logger.debug(f"Could not fetch state for {self.home_assistant_entity_id}")
                return None
            
            state = state_data.get("state", "").lower()
            attributes = state_data.get("attributes", {})
            
            # Check if playing
            # Home Assistant media_player states: "playing", "paused", "idle", "off", "unavailable"
            if state not in ["playing", "paused"]:
                logger.debug(f"HomePod state is '{state}', not playing")
                return None
            
            # Extract media information from attributes
            # Home Assistant media_player attributes:
            # - media_title: track name
            # - media_artist: artist name
            # - media_album_name: album name
            # - media_position: current position in seconds
            # - media_duration: total duration in seconds
            
            track = attributes.get("media_title", "")
            artist = attributes.get("media_artist", "")
            album = attributes.get("media_album_name", "")
            position = attributes.get("media_position", 0.0)
            duration = attributes.get("media_duration", 0.0)
            
            # If no track info, not playing
            if not track and not artist:
                logger.debug(f"No media info available for {self.home_assistant_entity_id}")
                return None
            
            return {
                "track": track,
                "artist": artist,
                "album": album,
                "position": float(position) if position else 0.0,
                "duration": float(duration) if duration else 0.0,
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch Apple Music data from Home Assistant: {e}")
            return None


def get_apple_music_source() -> Optional[AppleMusicSource]:
    """Get configured Apple Music source instance."""
    if not Config.APPLE_MUSIC_ENABLED:
        return None
    
    # Check if using Home Assistant mode
    home_assistant_entity_id = Config.APPLE_MUSIC_HOME_ASSISTANT_ENTITY_ID
    if home_assistant_entity_id:
        # Use Home Assistant mode
        from .home_assistant import get_home_assistant_source
        ha_source = get_home_assistant_source()
        
        if not ha_source:
            logger.warning("Apple Music Home Assistant mode enabled but Home Assistant not configured")
            return None
        
        return AppleMusicSource(
            service_url=None,
            timeout=Config.APPLE_MUSIC_TIMEOUT,
            home_assistant_source=ha_source,
            home_assistant_entity_id=home_assistant_entity_id
        )
    
    # Use macOS helper service mode (legacy)
    if not Config.APPLE_MUSIC_SERVICE_URL:
        logger.warning("Apple Music enabled but neither service URL nor Home Assistant entity configured")
        return None
    
    return AppleMusicSource(
        service_url=Config.APPLE_MUSIC_SERVICE_URL,
        timeout=Config.APPLE_MUSIC_TIMEOUT
    )

