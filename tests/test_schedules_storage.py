"""Tests for schedule storage."""

import pytest
import json
import tempfile
from pathlib import Path
from datetime import datetime

from src.schedules.models import ScheduleEntry
from src.schedules.storage import ScheduleStorage


@pytest.fixture
def temp_storage_file():
    """Create a temporary storage file."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        temp_path = f.name
    yield temp_path
    # Cleanup
    Path(temp_path).unlink(missing_ok=True)


@pytest.fixture
def storage(temp_storage_file):
    """Create a storage instance with temporary file."""
    return ScheduleStorage(storage_file=temp_storage_file)


@pytest.fixture
def sample_schedule():
    """Create a sample schedule entry."""
    return ScheduleEntry(
        id="test-schedule-1",
        page_id="page-123",
        start_time="09:00",
        end_time="17:00",
        day_pattern="weekdays",
        enabled=True
    )


class TestScheduleStorage:
    """Test schedule storage operations."""
    
    def test_init_creates_empty_storage(self, temp_storage_file):
        """Test that init creates empty storage if file doesn't exist."""
        storage = ScheduleStorage(storage_file=temp_storage_file)
        
        assert storage.count() == 0
        assert storage.list_all() == []
        assert storage.get_default_page_id() is None
    
    def test_create_schedule(self, storage, sample_schedule):
        """Test creating a schedule entry."""
        created = storage.create(sample_schedule)
        
        assert created.id == sample_schedule.id
        assert created.page_id == sample_schedule.page_id
        assert storage.count() == 1
    
    def test_create_duplicate_id_raises_error(self, storage, sample_schedule):
        """Test that creating duplicate ID raises error."""
        storage.create(sample_schedule)
        
        with pytest.raises(ValueError, match="already exists"):
            storage.create(sample_schedule)
    
    def test_get_schedule(self, storage, sample_schedule):
        """Test retrieving a schedule by ID."""
        storage.create(sample_schedule)
        
        retrieved = storage.get(sample_schedule.id)
        assert retrieved is not None
        assert retrieved.id == sample_schedule.id
        assert retrieved.page_id == sample_schedule.page_id
    
    def test_get_nonexistent_schedule(self, storage):
        """Test retrieving non-existent schedule returns None."""
        result = storage.get("nonexistent-id")
        assert result is None
    
    def test_list_all_schedules(self, storage):
        """Test listing all schedules."""
        # Create multiple schedules
        schedule1 = ScheduleEntry(
            page_id="page-1",
            start_time="09:00",
            end_time="12:00",
            day_pattern="all",
            enabled=True
        )
        schedule2 = ScheduleEntry(
            page_id="page-2",
            start_time="12:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        
        storage.create(schedule1)
        storage.create(schedule2)
        
        schedules = storage.list_all()
        assert len(schedules) == 2
        assert any(s.id == schedule1.id for s in schedules)
        assert any(s.id == schedule2.id for s in schedules)
    
    def test_list_all_sorted_by_created_at(self, storage):
        """Test that list_all returns schedules sorted by created_at."""
        # Create schedules with slight time differences
        schedule1 = ScheduleEntry(
            page_id="page-1",
            start_time="09:00",
            end_time="12:00",
            day_pattern="all",
            enabled=True
        )
        storage.create(schedule1)
        
        schedule2 = ScheduleEntry(
            page_id="page-2",
            start_time="12:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        storage.create(schedule2)
        
        schedules = storage.list_all()
        assert schedules[0].id == schedule1.id
        assert schedules[1].id == schedule2.id
    
    def test_update_schedule(self, storage, sample_schedule):
        """Test updating a schedule entry."""
        storage.create(sample_schedule)
        
        updates = {
            "start_time": "10:00",
            "end_time": "18:00",
            "enabled": False
        }
        
        updated = storage.update(sample_schedule.id, updates)
        
        assert updated is not None
        assert updated.start_time == "10:00"
        assert updated.end_time == "18:00"
        assert updated.enabled is False
        assert updated.updated_at is not None
    
    def test_update_nonexistent_schedule(self, storage):
        """Test updating non-existent schedule returns None."""
        result = storage.update("nonexistent-id", {"enabled": False})
        assert result is None
    
    def test_update_preserves_unchanged_fields(self, storage, sample_schedule):
        """Test that update preserves fields not in updates dict."""
        storage.create(sample_schedule)
        
        updates = {"enabled": False}
        updated = storage.update(sample_schedule.id, updates)
        
        assert updated.page_id == sample_schedule.page_id
        assert updated.start_time == sample_schedule.start_time
        assert updated.end_time == sample_schedule.end_time
        assert updated.enabled is False
    
    def test_delete_schedule(self, storage, sample_schedule):
        """Test deleting a schedule entry."""
        storage.create(sample_schedule)
        assert storage.count() == 1
        
        result = storage.delete(sample_schedule.id)
        assert result is True
        assert storage.count() == 0
    
    def test_delete_nonexistent_schedule(self, storage):
        """Test deleting non-existent schedule returns False."""
        result = storage.delete("nonexistent-id")
        assert result is False
    
    def test_exists(self, storage, sample_schedule):
        """Test checking if schedule exists."""
        assert storage.exists(sample_schedule.id) is False
        
        storage.create(sample_schedule)
        assert storage.exists(sample_schedule.id) is True
        
        storage.delete(sample_schedule.id)
        assert storage.exists(sample_schedule.id) is False
    
    def test_count(self, storage):
        """Test counting schedules."""
        assert storage.count() == 0
        
        schedule1 = ScheduleEntry(
            page_id="page-1",
            start_time="09:00",
            end_time="12:00",
            day_pattern="all",
            enabled=True
        )
        storage.create(schedule1)
        assert storage.count() == 1
        
        schedule2 = ScheduleEntry(
            page_id="page-2",
            start_time="12:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        storage.create(schedule2)
        assert storage.count() == 2
    
    def test_set_default_page_id(self, storage):
        """Test setting default page ID."""
        storage.set_default_page_id("page-default")
        assert storage.get_default_page_id() == "page-default"
    
    def test_get_default_page_id_initial_none(self, storage):
        """Test that default page ID is initially None."""
        assert storage.get_default_page_id() is None
    
    def test_set_default_page_id_to_none(self, storage):
        """Test clearing default page ID."""
        storage.set_default_page_id("page-default")
        assert storage.get_default_page_id() == "page-default"
        
        storage.set_default_page_id(None)
        assert storage.get_default_page_id() is None
    
    def test_persistence_survives_reload(self, temp_storage_file, sample_schedule):
        """Test that data persists across storage instances."""
        # Create and save schedule
        storage1 = ScheduleStorage(storage_file=temp_storage_file)
        storage1.create(sample_schedule)
        storage1.set_default_page_id("page-default")
        
        # Create new storage instance (simulates restart)
        storage2 = ScheduleStorage(storage_file=temp_storage_file)
        
        # Verify data persisted
        assert storage2.count() == 1
        retrieved = storage2.get(sample_schedule.id)
        assert retrieved is not None
        assert retrieved.page_id == sample_schedule.page_id
        assert storage2.get_default_page_id() == "page-default"
    
    def test_handles_corrupted_json_file(self, temp_storage_file):
        """Test that storage handles corrupted JSON gracefully."""
        # Write invalid JSON to file
        with open(temp_storage_file, 'w') as f:
            f.write("{ invalid json }")
        
        # Should load with empty data instead of crashing
        storage = ScheduleStorage(storage_file=temp_storage_file)
        assert storage.count() == 0
        assert storage.get_default_page_id() is None
    
    def test_datetime_serialization(self, storage, sample_schedule):
        """Test that datetime fields are properly serialized/deserialized."""
        storage.create(sample_schedule)
        
        # Update to set updated_at
        storage.update(sample_schedule.id, {"enabled": False})
        
        # Reload from file
        storage2 = ScheduleStorage(storage_file=storage.storage_file)
        retrieved = storage2.get(sample_schedule.id)
        
        assert isinstance(retrieved.created_at, datetime)
        assert isinstance(retrieved.updated_at, datetime)
