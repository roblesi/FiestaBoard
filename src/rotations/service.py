"""Rotation service for managing page rotations."""

import logging
import time
from typing import List, Optional, Tuple
from datetime import datetime

from .models import Rotation, RotationCreate, RotationUpdate, RotationEntry
from .storage import RotationStorage
from ..pages.service import get_page_service

logger = logging.getLogger(__name__)


class RotationService:
    """Service for rotation operations.
    
    Handles:
    - CRUD operations on rotations
    - Rotation activation
    - Current page calculation based on time
    """
    
    def __init__(self, storage: Optional[RotationStorage] = None):
        """Initialize rotation service."""
        self.storage = storage or RotationStorage()
        
        # Track rotation state
        self._rotation_start_time: Optional[float] = None
        self._current_page_index: int = 0
        self._last_page_change: float = 0
        
        logger.info("RotationService initialized")
    
    # CRUD operations
    
    def list_rotations(self) -> List[Rotation]:
        """List all rotations."""
        return self.storage.list_all()
    
    def get_rotation(self, rotation_id: str) -> Optional[Rotation]:
        """Get a rotation by ID."""
        return self.storage.get(rotation_id)
    
    def create_rotation(self, data: RotationCreate) -> Rotation:
        """Create a new rotation.
        
        Args:
            data: Rotation creation data
            
        Returns:
            Created rotation
            
        Raises:
            ValueError: If any page IDs don't exist
        """
        rotation = Rotation(
            name=data.name,
            pages=data.pages,
            default_duration=data.default_duration,
            enabled=data.enabled,
            created_at=datetime.utcnow()
        )
        
        # Validate that all pages exist
        missing = self.validate_rotation_pages(rotation)
        if missing:
            raise ValueError(f"Pages not found: {', '.join(missing)}")
        
        return self.storage.create(rotation)
    
    def update_rotation(self, rotation_id: str, data: RotationUpdate) -> Optional[Rotation]:
        """Update an existing rotation."""
        updates = data.model_dump(exclude_unset=True)
        return self.storage.update(rotation_id, updates)
    
    def delete_rotation(self, rotation_id: str) -> bool:
        """Delete a rotation."""
        return self.storage.delete(rotation_id)
    
    # Activation
    
    def get_active_rotation(self) -> Optional[Rotation]:
        """Get the currently active rotation."""
        return self.storage.get_active_rotation()
    
    def activate_rotation(self, rotation_id: str) -> bool:
        """Activate a rotation.
        
        Args:
            rotation_id: ID of rotation to activate
            
        Returns:
            True if successful
            
        Raises:
            ValueError: If any page IDs in the rotation don't exist
        """
        rotation = self.storage.get(rotation_id)
        if not rotation:
            return False
        
        # Validate that all pages exist before activating
        missing = self.validate_rotation_pages(rotation)
        if missing:
            raise ValueError(f"Cannot activate rotation: pages not found: {', '.join(missing)}")
        
        result = self.storage.set_active_rotation(rotation_id)
        if result:
            # Reset rotation state
            self._rotation_start_time = time.time()
            self._current_page_index = 0
            self._last_page_change = time.time()
        return result
    
    def deactivate_rotation(self) -> bool:
        """Deactivate the current rotation."""
        return self.storage.set_active_rotation(None)
    
    # Page cycling
    
    def get_current_page_id(self) -> Optional[str]:
        """Get the page ID that should currently be displayed.
        
        Based on the active rotation and elapsed time.
        
        Returns:
            Page ID or None if no active rotation
        """
        rotation = self.get_active_rotation()
        if not rotation or not rotation.enabled or not rotation.pages:
            return None
        
        current_time = time.time()
        
        # Initialize start time if needed
        if self._rotation_start_time is None:
            self._rotation_start_time = current_time
            self._last_page_change = current_time
            self._current_page_index = 0
        
        # Get current page's duration
        current_entry = rotation.pages[self._current_page_index]
        duration = current_entry.duration_override or rotation.default_duration
        
        # Check if it's time to advance
        elapsed_on_page = current_time - self._last_page_change
        if elapsed_on_page >= duration:
            # Advance to next page
            self._current_page_index = (self._current_page_index + 1) % len(rotation.pages)
            self._last_page_change = current_time
            logger.debug(f"Rotation advanced to page index {self._current_page_index}")
        
        return rotation.pages[self._current_page_index].page_id
    
    def get_rotation_state(self) -> dict:
        """Get the current rotation state for debugging/display.
        
        Returns:
            Dict with rotation state information
        """
        rotation = self.get_active_rotation()
        if not rotation:
            return {
                "active": False,
                "rotation_id": None,
                "rotation_name": None,
                "current_page_index": None,
                "current_page_id": None,
                "time_on_page": None,
                "page_duration": None,
            }
        
        current_time = time.time()
        current_entry = rotation.pages[self._current_page_index] if rotation.pages else None
        duration = current_entry.duration_override or rotation.default_duration if current_entry else 0
        time_on_page = current_time - self._last_page_change if self._last_page_change else 0
        
        return {
            "active": True,
            "rotation_id": rotation.id,
            "rotation_name": rotation.name,
            "current_page_index": self._current_page_index,
            "current_page_id": current_entry.page_id if current_entry else None,
            "time_on_page": round(time_on_page, 1),
            "page_duration": duration,
            "total_pages": len(rotation.pages),
        }
    
    def validate_rotation_pages(self, rotation: Rotation) -> List[str]:
        """Validate that all pages in a rotation exist.
        
        Returns:
            List of missing page IDs
        """
        page_service = get_page_service()
        missing = []
        
        for entry in rotation.pages:
            if not page_service.get_page(entry.page_id):
                missing.append(entry.page_id)
        
        return missing


# Singleton instance
_rotation_service: Optional[RotationService] = None


def get_rotation_service() -> RotationService:
    """Get or create the rotation service singleton."""
    global _rotation_service
    if _rotation_service is None:
        _rotation_service = RotationService()
    return _rotation_service

