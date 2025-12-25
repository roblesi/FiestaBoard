"""Data models for rotation configurations.

Rotations define how pages cycle through on the Vestaboard.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import uuid


class RotationEntry(BaseModel):
    """A single entry in a rotation (page + optional duration override)."""
    page_id: str
    duration_override: Optional[int] = None  # Override page's default duration


class Rotation(BaseModel):
    """A rotation configuration.
    
    Defines the sequence of pages to display and timing.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(min_length=1, max_length=100)
    pages: List[RotationEntry] = Field(default_factory=list)
    default_duration: int = Field(default=300, ge=10, le=3600)
    enabled: bool = True
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        # Pydantic V2 uses serialization_mode_json for custom serializers
        # datetime is automatically serialized to ISO format in V2
    )
    
    def validate_config(self) -> List[str]:
        """Validate rotation configuration.
        
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        if not self.pages:
            errors.append("Rotation must have at least one page")
        
        # Check for duplicate page IDs
        page_ids = [e.page_id for e in self.pages]
        if len(page_ids) != len(set(page_ids)):
            errors.append("Rotation has duplicate page entries")
        
        return errors
    
    def is_valid(self) -> bool:
        """Check if rotation configuration is valid."""
        return len(self.validate_config()) == 0


class RotationCreate(BaseModel):
    """Request model for creating a rotation."""
    name: str = Field(min_length=1, max_length=100)
    pages: List[RotationEntry] = Field(default_factory=list)
    default_duration: int = Field(default=300, ge=10, le=3600)
    enabled: bool = True


class RotationUpdate(BaseModel):
    """Request model for updating a rotation."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    pages: Optional[List[RotationEntry]] = None
    default_duration: Optional[int] = Field(default=None, ge=10, le=3600)
    enabled: Optional[bool] = None

