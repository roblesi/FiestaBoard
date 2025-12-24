"""Page service for CRUD operations and rendering.

Provides high-level operations on pages including preview and send.
"""

import logging
from typing import List, Optional
from datetime import datetime

from .models import Page, PageCreate, PageUpdate, RowConfig
from .storage import PageStorage
from ..displays.service import get_display_service, DisplayResult
from ..templates.engine import get_template_engine

logger = logging.getLogger(__name__)


class PageService:
    """Service for page operations.
    
    Handles:
    - CRUD operations on pages
    - Rendering pages to formatted text
    - Previewing pages
    """
    
    def __init__(self, storage: Optional[PageStorage] = None):
        """Initialize page service.
        
        Args:
            storage: Page storage instance. Created if not provided.
        """
        self.storage = storage or PageStorage()
        logger.info("PageService initialized")
    
    # CRUD operations
    
    def list_pages(self) -> List[Page]:
        """List all pages."""
        return self.storage.list_all()
    
    def get_page(self, page_id: str) -> Optional[Page]:
        """Get a page by ID."""
        return self.storage.get(page_id)
    
    def create_page(self, data: PageCreate) -> Page:
        """Create a new page.
        
        Args:
            data: Page creation data
            
        Returns:
            Created page
            
        Raises:
            ValueError: If page configuration is invalid
        """
        page = Page(
            name=data.name,
            type=data.type,
            display_type=data.display_type,
            rows=data.rows,
            template=data.template,
            duration_seconds=data.duration_seconds,
            created_at=datetime.utcnow()
        )
        
        return self.storage.create(page)
    
    def update_page(self, page_id: str, data: PageUpdate) -> Optional[Page]:
        """Update an existing page.
        
        Args:
            page_id: Page ID
            data: Update data
            
        Returns:
            Updated page or None if not found
        """
        updates = data.model_dump(exclude_unset=True)
        return self.storage.update(page_id, updates)
    
    def delete_page(self, page_id: str) -> bool:
        """Delete a page.
        
        Args:
            page_id: Page ID
            
        Returns:
            True if deleted, False if not found
        """
        return self.storage.delete(page_id)
    
    # Rendering
    
    def render_page(self, page: Page) -> DisplayResult:
        """Render a page to formatted text.
        
        Args:
            page: The page to render
            
        Returns:
            DisplayResult with formatted text
        """
        if page.type == "single":
            return self._render_single(page)
        elif page.type == "composite":
            return self._render_composite(page)
        elif page.type == "template":
            return self._render_template(page)
        else:
            return DisplayResult(
                display_type="page",
                formatted="",
                raw={},
                available=False,
                error=f"Unknown page type: {page.type}"
            )
    
    def _render_single(self, page: Page) -> DisplayResult:
        """Render a single-source page."""
        if not page.display_type:
            return DisplayResult(
                display_type="page",
                formatted="",
                raw={"page_id": page.id},
                available=False,
                error="Single page missing display_type"
            )
        
        display_service = get_display_service()
        result = display_service.get_display(page.display_type)
        
        # Wrap result with page metadata
        return DisplayResult(
            display_type=f"page:{page.type}:{page.display_type}",
            formatted=result.formatted,
            raw={"page_id": page.id, "source_data": result.raw},
            available=result.available,
            error=result.error
        )
    
    def _render_composite(self, page: Page) -> DisplayResult:
        """Render a composite page by combining rows from multiple sources."""
        if not page.rows:
            return DisplayResult(
                display_type="page",
                formatted="",
                raw={"page_id": page.id},
                available=False,
                error="Composite page missing row configuration"
            )
        
        display_service = get_display_service()
        
        # Initialize 6 empty lines
        output_lines = ["                      "] * 6  # 22 spaces
        source_data = {}
        
        for row_config in page.rows:
            # Get the source display
            result = display_service.get_display(row_config.source)
            if not result.available:
                continue
            
            source_data[row_config.source] = result.raw
            
            # Split source into lines
            source_lines = result.formatted.split('\n')
            
            # Get the specified row if it exists
            if row_config.row_index < len(source_lines):
                source_line = source_lines[row_config.row_index]
                # Pad or truncate to 22 characters
                source_line = source_line[:22].ljust(22)
                output_lines[row_config.target_row] = source_line
        
        formatted = '\n'.join(output_lines)
        
        return DisplayResult(
            display_type=f"page:composite",
            formatted=formatted,
            raw={"page_id": page.id, "sources": source_data},
            available=True
        )
    
    def _render_template(self, page: Page) -> DisplayResult:
        """Render a template page with variable substitution.
        
        Uses the template engine to:
        - Replace {{source.field}} variables
        - Process {color} markers
        - Process {symbol} shortcuts
        - Apply filters like |pad:3 or |upper
        """
        if not page.template:
            return DisplayResult(
                display_type="page",
                formatted="",
                raw={"page_id": page.id},
                available=False,
                error="Template page missing template content"
            )
        
        try:
            template_engine = get_template_engine()
            
            # Render the template lines with variable substitution
            formatted = template_engine.render_lines(page.template)
            
            # Pad each line to 22 characters
            lines = formatted.split('\n')
            lines = [line[:22].ljust(22) for line in lines]
            formatted = '\n'.join(lines)
            
            return DisplayResult(
                display_type="page:template",
                formatted=formatted,
                raw={"page_id": page.id, "template": page.template},
                available=True
            )
        except Exception as e:
            logger.error(f"Failed to render template: {e}", exc_info=True)
            return DisplayResult(
                display_type="page:template",
                formatted="",
                raw={"page_id": page.id, "template": page.template},
                available=False,
                error=f"Template rendering failed: {str(e)}"
            )
    
    def preview_page(self, page_id: str) -> Optional[DisplayResult]:
        """Preview a page by ID.
        
        Args:
            page_id: The page ID
            
        Returns:
            DisplayResult or None if page not found
        """
        page = self.get_page(page_id)
        if not page:
            return None
        return self.render_page(page)


# Singleton instance
_page_service: Optional[PageService] = None


def get_page_service() -> PageService:
    """Get or create the page service singleton."""
    global _page_service
    if _page_service is None:
        _page_service = PageService()
    return _page_service

