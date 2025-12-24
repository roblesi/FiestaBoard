"""Tests for pages module (models, storage, service, API)."""

import pytest
import tempfile
import os
from datetime import datetime
from unittest.mock import Mock, patch

from src.pages.models import Page, PageCreate, PageUpdate, RowConfig, PageType
from src.pages.storage import PageStorage
from src.pages.service import PageService
from src.displays.service import DisplayResult


class TestPageModels:
    """Tests for Page and related models."""
    
    def test_page_single_valid(self):
        """Test valid single-type page."""
        page = Page(
            name="Weather Page",
            type="single",
            display_type="weather"
        )
        assert page.is_valid()
        assert page.type == "single"
        assert page.display_type == "weather"
    
    def test_page_single_missing_display_type(self):
        """Test single page without display_type is invalid."""
        page = Page(name="Bad Page", type="single")
        errors = page.validate_config()
        assert "display_type" in errors[0].lower()
    
    def test_page_composite_valid(self):
        """Test valid composite page."""
        page = Page(
            name="Composite Page",
            type="composite",
            rows=[
                RowConfig(source="weather", row_index=0, target_row=0),
                RowConfig(source="datetime", row_index=0, target_row=1),
            ]
        )
        assert page.is_valid()
    
    def test_page_composite_missing_rows(self):
        """Test composite page without rows is invalid."""
        page = Page(name="Bad Page", type="composite")
        errors = page.validate_config()
        assert "row" in errors[0].lower()
    
    def test_page_composite_duplicate_targets(self):
        """Test composite page with duplicate target rows is invalid."""
        page = Page(
            name="Bad Page",
            type="composite",
            rows=[
                RowConfig(source="weather", row_index=0, target_row=0),
                RowConfig(source="datetime", row_index=0, target_row=0),  # Duplicate!
            ]
        )
        errors = page.validate_config()
        assert "duplicate" in errors[0].lower()
    
    def test_page_template_valid(self):
        """Test valid template page."""
        page = Page(
            name="Template Page",
            type="template",
            template=["Line 1", "Line 2", "", "", "", ""]
        )
        assert page.is_valid()
    
    def test_page_template_missing_template(self):
        """Test template page without template is invalid."""
        page = Page(name="Bad Page", type="template")
        errors = page.validate_config()
        assert "template" in errors[0].lower()
    
    def test_page_generates_id(self):
        """Test that page auto-generates an ID."""
        page = Page(name="Test", type="single", display_type="weather")
        assert page.id is not None
        assert len(page.id) > 0
    
    def test_page_duration_defaults(self):
        """Test default duration is 300 seconds."""
        page = Page(name="Test", type="single", display_type="weather")
        assert page.duration_seconds == 300
    
    def test_row_config_valid(self):
        """Test valid row config."""
        config = RowConfig(source="weather", row_index=0, target_row=5)
        assert config.source == "weather"
        assert config.row_index == 0
        assert config.target_row == 5


class TestPageStorage:
    """Tests for PageStorage."""
    
    @pytest.fixture
    def temp_storage_file(self):
        """Create a temporary storage file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{"pages": []}')
            yield f.name
        os.unlink(f.name)
    
    @pytest.fixture
    def storage(self, temp_storage_file):
        """Create a storage instance with temp file."""
        return PageStorage(storage_file=temp_storage_file)
    
    def test_create_page(self, storage):
        """Test creating a page."""
        page = Page(name="Test", type="single", display_type="weather")
        created = storage.create(page)
        
        assert created.id == page.id
        assert created.name == "Test"
        assert storage.count() == 1
    
    def test_create_duplicate_id_raises(self, storage):
        """Test creating page with duplicate ID raises."""
        page = Page(name="Test", type="single", display_type="weather")
        storage.create(page)
        
        with pytest.raises(ValueError, match="already exists"):
            storage.create(page)
    
    def test_get_page(self, storage):
        """Test getting a page by ID."""
        page = Page(name="Test", type="single", display_type="weather")
        storage.create(page)
        
        retrieved = storage.get(page.id)
        assert retrieved is not None
        assert retrieved.name == "Test"
    
    def test_get_nonexistent_returns_none(self, storage):
        """Test getting nonexistent page returns None."""
        result = storage.get("nonexistent")
        assert result is None
    
    def test_list_all(self, storage):
        """Test listing all pages."""
        page1 = Page(name="Page 1", type="single", display_type="weather")
        page2 = Page(name="Page 2", type="single", display_type="datetime")
        storage.create(page1)
        storage.create(page2)
        
        pages = storage.list_all()
        assert len(pages) == 2
    
    def test_update_page(self, storage):
        """Test updating a page."""
        page = Page(name="Original", type="single", display_type="weather")
        storage.create(page)
        
        updated = storage.update(page.id, {"name": "Updated"})
        assert updated.name == "Updated"
        assert updated.updated_at is not None
    
    def test_update_nonexistent_returns_none(self, storage):
        """Test updating nonexistent page returns None."""
        result = storage.update("nonexistent", {"name": "Test"})
        assert result is None
    
    def test_delete_page(self, storage):
        """Test deleting a page."""
        page = Page(name="Test", type="single", display_type="weather")
        storage.create(page)
        
        result = storage.delete(page.id)
        assert result is True
        assert storage.get(page.id) is None
    
    def test_delete_nonexistent_returns_false(self, storage):
        """Test deleting nonexistent page returns False."""
        result = storage.delete("nonexistent")
        assert result is False
    
    def test_persistence(self, temp_storage_file):
        """Test that pages persist across storage instances."""
        # Create first storage and add page
        storage1 = PageStorage(storage_file=temp_storage_file)
        page = Page(name="Persistent", type="single", display_type="weather")
        storage1.create(page)
        
        # Create second storage and verify page exists
        storage2 = PageStorage(storage_file=temp_storage_file)
        retrieved = storage2.get(page.id)
        
        assert retrieved is not None
        assert retrieved.name == "Persistent"


class TestPageService:
    """Tests for PageService."""
    
    @pytest.fixture
    def temp_storage_file(self):
        """Create a temporary storage file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{"pages": []}')
            yield f.name
        os.unlink(f.name)
    
    @pytest.fixture
    def service(self, temp_storage_file):
        """Create a page service with temp storage."""
        storage = PageStorage(storage_file=temp_storage_file)
        return PageService(storage=storage)
    
    def test_create_page(self, service):
        """Test creating a page via service."""
        data = PageCreate(name="Test", type="single", display_type="weather")
        page = service.create_page(data)
        
        assert page.name == "Test"
        assert page.type == "single"
    
    def test_list_pages(self, service):
        """Test listing pages via service."""
        service.create_page(PageCreate(name="Page 1", type="single", display_type="weather"))
        service.create_page(PageCreate(name="Page 2", type="single", display_type="datetime"))
        
        pages = service.list_pages()
        assert len(pages) == 2
    
    def test_update_page(self, service):
        """Test updating a page via service."""
        page = service.create_page(PageCreate(name="Original", type="single", display_type="weather"))
        
        updated = service.update_page(page.id, PageUpdate(name="Updated"))
        assert updated.name == "Updated"
    
    def test_delete_page(self, service):
        """Test deleting a page via service."""
        page = service.create_page(PageCreate(name="Test", type="single", display_type="weather"))
        
        result = service.delete_page(page.id)
        assert result is True
        assert service.get_page(page.id) is None
    
    @patch('src.pages.service.get_display_service')
    def test_render_single_page(self, mock_get_display, service):
        """Test rendering a single-source page."""
        mock_display_service = Mock()
        mock_display_service.get_display.return_value = DisplayResult(
            display_type="weather",
            formatted="Sunny, 72F\nSan Francisco",
            raw={"temp": 72},
            available=True
        )
        mock_get_display.return_value = mock_display_service
        
        page = service.create_page(PageCreate(name="Weather", type="single", display_type="weather"))
        result = service.render_page(page)
        
        assert result.available is True
        assert "Sunny" in result.formatted
    
    @patch('src.pages.service.get_display_service')
    def test_render_composite_page(self, mock_get_display, service):
        """Test rendering a composite page."""
        mock_display_service = Mock()
        
        def mock_get_display_fn(display_type):
            if display_type == "weather":
                return DisplayResult(
                    display_type="weather",
                    formatted="Sunny Line 1\nSunny Line 2",
                    raw={},
                    available=True
                )
            elif display_type == "datetime":
                return DisplayResult(
                    display_type="datetime",
                    formatted="Monday Dec 25\n10:30 AM",
                    raw={},
                    available=True
                )
            return DisplayResult(display_type=display_type, formatted="", raw={}, available=False)
        
        mock_display_service.get_display.side_effect = mock_get_display_fn
        mock_get_display.return_value = mock_display_service
        
        page = service.create_page(PageCreate(
            name="Composite",
            type="composite",
            rows=[
                RowConfig(source="weather", row_index=0, target_row=0),
                RowConfig(source="datetime", row_index=0, target_row=2),
            ]
        ))
        result = service.render_page(page)
        
        assert result.available is True
        lines = result.formatted.split('\n')
        assert "Sunny" in lines[0]
        assert "Monday" in lines[2]
    
    def test_render_template_page(self, service):
        """Test rendering a template page."""
        page = service.create_page(PageCreate(
            name="Template",
            type="template",
            template=["Hello World", "Line 2", "", "", "", ""]
        ))
        result = service.render_page(page)
        
        assert result.available is True
        assert "Hello World" in result.formatted


class TestPagesAPIEndpoints:
    """Tests for pages API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create a test client."""
        from src.api_server import app
        from fastapi.testclient import TestClient
        return TestClient(app)
    
    @pytest.fixture
    def mock_page_service(self):
        """Mock the page service."""
        with patch('src.api_server.get_page_service') as mock:
            mock_service = Mock()
            mock.return_value = mock_service
            yield mock_service
    
    def test_list_pages(self, client, mock_page_service):
        """Test GET /pages."""
        mock_page_service.list_pages.return_value = [
            Page(id="1", name="Page 1", type="single", display_type="weather"),
            Page(id="2", name="Page 2", type="single", display_type="datetime"),
        ]
        
        response = client.get("/pages")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["pages"]) == 2
    
    def test_create_page(self, client, mock_page_service):
        """Test POST /pages."""
        mock_page_service.create_page.return_value = Page(
            id="new-id",
            name="New Page",
            type="single",
            display_type="weather"
        )
        
        response = client.post("/pages", json={
            "name": "New Page",
            "type": "single",
            "display_type": "weather"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["page"]["name"] == "New Page"
    
    def test_get_page(self, client, mock_page_service):
        """Test GET /pages/{id}."""
        mock_page_service.get_page.return_value = Page(
            id="test-id",
            name="Test Page",
            type="single",
            display_type="weather"
        )
        
        response = client.get("/pages/test-id")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Page"
    
    def test_get_page_not_found(self, client, mock_page_service):
        """Test GET /pages/{id} with nonexistent ID."""
        mock_page_service.get_page.return_value = None
        
        response = client.get("/pages/nonexistent")
        
        assert response.status_code == 404
    
    def test_update_page(self, client, mock_page_service):
        """Test PUT /pages/{id}."""
        mock_page_service.update_page.return_value = Page(
            id="test-id",
            name="Updated Page",
            type="single",
            display_type="weather"
        )
        
        response = client.put("/pages/test-id", json={"name": "Updated Page"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"]["name"] == "Updated Page"
    
    def test_delete_page(self, client, mock_page_service):
        """Test DELETE /pages/{id}."""
        mock_page_service.delete_page.return_value = True
        
        response = client.delete("/pages/test-id")
        
        assert response.status_code == 200
        assert "deleted" in response.json()["message"]
    
    def test_preview_page(self, client, mock_page_service):
        """Test POST /pages/{id}/preview."""
        mock_page_service.preview_page.return_value = DisplayResult(
            display_type="page:single",
            formatted="Preview Content\nLine 2",
            raw={"page_id": "test-id"},
            available=True
        )
        
        response = client.post("/pages/test-id/preview")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page_id"] == "test-id"
        assert "Preview Content" in data["message"]

