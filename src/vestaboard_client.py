"""Vestaboard Read/Write API client."""

import logging
import time
import requests
from typing import Optional, List

logger = logging.getLogger(__name__)


class VestaboardClient:
    """Client for interacting with Vestaboard Read/Write API."""
    
    BASE_URL = "https://rw.vestaboard.com/"
    RATE_LIMIT_SECONDS = 15  # Minimum time between messages
    
    def __init__(self, api_key: str):
        """
        Initialize Vestaboard client.
        
        Args:
            api_key: Vestaboard Read/Write API key
        """
        self.api_key = api_key
        self.last_message_time: Optional[float] = None
        self.headers = {
            "X-Vestaboard-Read-Write-Key": api_key,
            "Content-Type": "application/json"
        }
    
    def _enforce_rate_limit(self):
        """Enforce rate limiting (1 message per 15 seconds)."""
        if self.last_message_time is not None:
            elapsed = time.time() - self.last_message_time
            if elapsed < self.RATE_LIMIT_SECONDS:
                wait_time = self.RATE_LIMIT_SECONDS - elapsed
                logger.debug(f"Rate limiting: waiting {wait_time:.2f} seconds")
                time.sleep(wait_time)
    
    def send_text(self, text: str) -> bool:
        """
        Send plain text message to Vestaboard.
        
        Args:
            text: Plain text message to display
            
        Returns:
            True if successful, False otherwise
        """
        self._enforce_rate_limit()
        
        payload = {"text": text}
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            
            self.last_message_time = time.time()
            logger.info(f"Message sent successfully to Vestaboard")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send message to Vestaboard: {e}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response: {e.response.text}")
            return False
    
    def send_characters(self, characters: List[List[int]]) -> bool:
        """
        Send message using character array format (6x22 grid).
        
        Args:
            characters: 6x22 array of character codes
            
        Returns:
            True if successful, False otherwise
        """
        self._enforce_rate_limit()
        
        # Validate grid size
        if len(characters) != 6:
            logger.error(f"Invalid grid: expected 6 rows, got {len(characters)}")
            return False
        
        for i, row in enumerate(characters):
            if len(row) != 22:
                logger.error(f"Invalid row {i}: expected 22 columns, got {len(row)}")
                return False
        
        payload = {"characters": characters}
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            
            self.last_message_time = time.time()
            logger.info(f"Character array sent successfully to Vestaboard")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send character array to Vestaboard: {e}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response: {e.response.text}")
            return False
    
    def read_current_message(self) -> Optional[dict]:
        """
        Read the current message displayed on the Vestaboard.
        
        Returns:
            Dictionary with message data, or None if failed
        """
        try:
            response = requests.get(
                self.BASE_URL,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to read current message: {e}")
            return None

