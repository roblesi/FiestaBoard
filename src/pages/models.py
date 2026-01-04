"""Data models for pages and layouts.

Pages can be:
- Single: Display a single source type
- Composite: Combine rows from multiple sources
- Template: Custom templated content with dynamic data
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
import uuid


PageType = Literal["single", "composite", "template"]


class RowConfig(BaseModel):
    """Configuration for a single row in a composite page.
    
    Specifies which row from which source should be placed at which position.
    """
    source: str  # Display type (weather, datetime, etc.)
    row_index: int = Field(ge=0, le=5)  # Which row from source (0-5)
    target_row: int = Field(ge=0, le=5)  # Where to place in output (0-5)


class Page(BaseModel):
    """A saved page configuration.
    
    Pages can be one of three types:
    - single: Displays a single source type
    - composite: Combines specific rows from multiple sources
    - template: Custom content with templated variables
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(min_length=1, max_length=100)
    type: PageType
    
    # For single pages: which display type to show
    display_type: Optional[str] = None
    
    # For composite pages: row configuration
    rows: Optional[List[RowConfig]] = None
    
    # For template pages: 6 lines of template text
    # Templates can include {{variable}} syntax for dynamic data
    # and {color} syntax for board colors
    template: Optional[List[str]] = None
    
    # Rotation settings
    duration_seconds: int = Field(default=300, ge=10, le=3600)  # 10s to 1h
    
    # Transition settings (per-page override, None means use system defaults)
    # Valid strategies: column, reverse-column, edges-to-center, row, diagonal, random
    transition_strategy: Optional[str] = None
    transition_interval_ms: Optional[int] = Field(default=None, ge=0, le=5000)
    transition_step_size: Optional[int] = Field(default=None, ge=1, le=22)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        # Pydantic V2 uses serialization_mode_json for custom serializers
        # datetime is automatically serialized to ISO format in V2
    )
    
    def validate_config(self) -> List[str]:
        """Validate that page configuration is complete and consistent.
        
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        if self.type == "single":
            if not self.display_type:
                errors.append("Single page requires display_type")
        
        elif self.type == "composite":
            if not self.rows or len(self.rows) == 0:
                errors.append("Composite page requires at least one row config")
            else:
                # Check for duplicate target rows
                target_rows = [r.target_row for r in self.rows]
                if len(target_rows) != len(set(target_rows)):
                    errors.append("Composite page has duplicate target rows")
        
        elif self.type == "template":
            if not self.template or len(self.template) == 0:
                errors.append("Template page requires template content")
            elif len(self.template) > 6:
                errors.append("Template cannot have more than 6 lines")
        
        return errors
    
    def is_valid(self) -> bool:
        """Check if page configuration is valid."""
        return len(self.validate_config()) == 0


class PageCreate(BaseModel):
    """Request model for creating a new page."""
    name: str = Field(min_length=1, max_length=100)
    type: PageType
    display_type: Optional[str] = None
    rows: Optional[List[RowConfig]] = None
    template: Optional[List[str]] = None
    duration_seconds: int = Field(default=300, ge=10, le=3600)
    # Transition settings (per-page override)
    transition_strategy: Optional[str] = None
    transition_interval_ms: Optional[int] = Field(default=None, ge=0, le=5000)
    transition_step_size: Optional[int] = Field(default=None, ge=1, le=22)


class PageUpdate(BaseModel):
    """Request model for updating an existing page."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    display_type: Optional[str] = None
    rows: Optional[List[RowConfig]] = None
    template: Optional[List[str]] = None
    duration_seconds: Optional[int] = Field(default=None, ge=10, le=3600)
    # Transition settings (per-page override, use ... sentinel to leave unchanged)
    transition_strategy: Optional[str] = None
    transition_interval_ms: Optional[int] = Field(default=None, ge=0, le=5000)
    transition_step_size: Optional[int] = Field(default=None, ge=1, le=22)

