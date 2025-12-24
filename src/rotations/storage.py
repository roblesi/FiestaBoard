"""JSON file-based storage for rotations."""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from .models import Rotation

logger = logging.getLogger(__name__)


class RotationStorage:
    """JSON file-based storage for rotations.
    
    Also tracks which rotation is currently active.
    """
    
    def __init__(self, storage_file: Optional[str] = None):
        """Initialize rotation storage.
        
        Args:
            storage_file: Path to JSON storage file. Defaults to data/rotations.json
        """
        if storage_file is None:
            project_root = Path(__file__).parent.parent.parent
            data_dir = project_root / "data"
            data_dir.mkdir(exist_ok=True)
            self.storage_file = data_dir / "rotations.json"
        else:
            self.storage_file = Path(storage_file)
        
        # In-memory cache
        self._rotations: Dict[str, Rotation] = {}
        self._active_rotation_id: Optional[str] = None
        
        # Load existing rotations
        self._load()
        
        logger.info(f"RotationStorage initialized (file: {self.storage_file}, rotations: {len(self._rotations)})")
    
    def _load(self) -> None:
        """Load rotations from storage file."""
        if not self.storage_file.exists():
            self._rotations = {}
            self._active_rotation_id = None
            return
        
        try:
            with open(self.storage_file, 'r') as f:
                data = json.load(f)
            
            self._rotations = {}
            for rotation_data in data.get("rotations", []):
                try:
                    if "created_at" in rotation_data and isinstance(rotation_data["created_at"], str):
                        rotation_data["created_at"] = datetime.fromisoformat(rotation_data["created_at"])
                    if "updated_at" in rotation_data and isinstance(rotation_data["updated_at"], str):
                        rotation_data["updated_at"] = datetime.fromisoformat(rotation_data["updated_at"])
                    
                    rotation = Rotation(**rotation_data)
                    self._rotations[rotation.id] = rotation
                except Exception as e:
                    logger.warning(f"Failed to load rotation: {e}")
            
            self._active_rotation_id = data.get("active_rotation_id")
            
            logger.info(f"Loaded {len(self._rotations)} rotations from storage")
            
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to load rotations file: {e}")
            self._rotations = {}
            self._active_rotation_id = None
    
    def _save(self) -> None:
        """Save rotations to storage file."""
        try:
            data = {
                "rotations": [r.model_dump() for r in self._rotations.values()],
                "active_rotation_id": self._active_rotation_id
            }
            
            # Convert datetime objects
            for rotation_data in data["rotations"]:
                if rotation_data.get("created_at"):
                    rotation_data["created_at"] = rotation_data["created_at"].isoformat()
                if rotation_data.get("updated_at"):
                    rotation_data["updated_at"] = rotation_data["updated_at"].isoformat()
            
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.debug(f"Saved {len(self._rotations)} rotations to storage")
            
        except IOError as e:
            logger.error(f"Failed to save rotations file: {e}")
            raise
    
    def list_all(self) -> List[Rotation]:
        """Get all stored rotations."""
        rotations = list(self._rotations.values())
        rotations.sort(key=lambda r: r.created_at)
        return rotations
    
    def get(self, rotation_id: str) -> Optional[Rotation]:
        """Get a rotation by ID."""
        return self._rotations.get(rotation_id)
    
    def create(self, rotation: Rotation) -> Rotation:
        """Create a new rotation."""
        if rotation.id in self._rotations:
            raise ValueError(f"Rotation with ID {rotation.id} already exists")
        
        errors = rotation.validate_config()
        if errors:
            raise ValueError(f"Invalid rotation configuration: {errors}")
        
        self._rotations[rotation.id] = rotation
        self._save()
        
        logger.info(f"Created rotation: {rotation.id} ({rotation.name})")
        return rotation
    
    def update(self, rotation_id: str, updates: dict) -> Optional[Rotation]:
        """Update an existing rotation."""
        if rotation_id not in self._rotations:
            return None
        
        rotation = self._rotations[rotation_id]
        rotation_dict = rotation.model_dump()
        
        for key, value in updates.items():
            if value is not None and key in rotation_dict:
                rotation_dict[key] = value
        
        rotation_dict["updated_at"] = datetime.utcnow()
        
        updated_rotation = Rotation(**rotation_dict)
        
        errors = updated_rotation.validate_config()
        if errors:
            raise ValueError(f"Invalid rotation configuration: {errors}")
        
        self._rotations[rotation_id] = updated_rotation
        self._save()
        
        logger.info(f"Updated rotation: {rotation_id}")
        return updated_rotation
    
    def delete(self, rotation_id: str) -> bool:
        """Delete a rotation."""
        if rotation_id not in self._rotations:
            return False
        
        # If deleting active rotation, deactivate it
        if self._active_rotation_id == rotation_id:
            self._active_rotation_id = None
        
        del self._rotations[rotation_id]
        self._save()
        
        logger.info(f"Deleted rotation: {rotation_id}")
        return True
    
    def get_active_rotation_id(self) -> Optional[str]:
        """Get the ID of the currently active rotation."""
        return self._active_rotation_id
    
    def get_active_rotation(self) -> Optional[Rotation]:
        """Get the currently active rotation."""
        if self._active_rotation_id:
            return self._rotations.get(self._active_rotation_id)
        return None
    
    def set_active_rotation(self, rotation_id: Optional[str]) -> bool:
        """Set the active rotation.
        
        Args:
            rotation_id: ID of rotation to activate, or None to deactivate
            
        Returns:
            True if successful, False if rotation not found
        """
        if rotation_id is not None and rotation_id not in self._rotations:
            return False
        
        self._active_rotation_id = rotation_id
        self._save()
        
        if rotation_id:
            logger.info(f"Activated rotation: {rotation_id}")
        else:
            logger.info("Deactivated rotation")
        
        return True
    
    def count(self) -> int:
        """Get the number of stored rotations."""
        return len(self._rotations)

