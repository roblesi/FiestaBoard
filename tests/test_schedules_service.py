"""Tests for schedule service."""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime, time

from src.schedules.models import ScheduleEntry, ScheduleCreate
from src.schedules.service import ScheduleService
from src.schedules.storage import ScheduleStorage


@pytest.fixture
def temp_storage_file():
    """Create a temporary storage file."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        temp_path = f.name
    yield temp_path
    Path(temp_path).unlink(missing_ok=True)


@pytest.fixture
def service(temp_storage_file):
    """Create a service instance with temporary storage."""
    storage = ScheduleStorage(storage_file=temp_storage_file)
    return ScheduleService(storage=storage)


class TestScheduleServiceCRUD:
    """Test CRUD operations."""
    
    def test_list_schedules_empty(self, service):
        """Test listing schedules when empty."""
        schedules = service.list_schedules()
        assert len(schedules) == 0
    
    def test_create_schedule(self, service):
        """Test creating a schedule."""
        create_data = ScheduleCreate(
            page_id="page-123",
            start_time="09:00",
            end_time="17:00",
            day_pattern="weekdays",
            enabled=True
        )
        
        created = service.create_schedule(create_data)
        
        assert created.page_id == "page-123"
        assert created.start_time == "09:00"
        assert created.end_time == "17:00"
        assert created.id is not None
    
    def test_get_schedule(self, service):
        """Test getting a schedule by ID."""
        create_data = ScheduleCreate(
            page_id="page-123",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        created = service.create_schedule(create_data)
        
        retrieved = service.get_schedule(created.id)
        assert retrieved is not None
        assert retrieved.id == created.id
    
    def test_update_schedule(self, service):
        """Test updating a schedule."""
        create_data = ScheduleCreate(
            page_id="page-123",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        created = service.create_schedule(create_data)
        
        from src.schedules.models import ScheduleUpdate
        update_data = ScheduleUpdate(
            start_time="10:00",
            enabled=False
        )
        
        updated = service.update_schedule(created.id, update_data)
        assert updated is not None
        assert updated.start_time == "10:00"
        assert updated.enabled is False
    
    def test_delete_schedule(self, service):
        """Test deleting a schedule."""
        create_data = ScheduleCreate(
            page_id="page-123",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        created = service.create_schedule(create_data)
        
        result = service.delete_schedule(created.id)
        assert result is True
        
        assert service.get_schedule(created.id) is None


class TestActivePageResolution:
    """Test active page resolution logic."""
    
    def test_get_active_page_id_no_schedules(self, service):
        """Test active page when no schedules exist."""
        # Monday 09:00
        page_id = service.get_active_page_id(time(9, 0), "monday")
        assert page_id is None
    
    def test_get_active_page_id_with_default(self, service):
        """Test active page falls back to default when no match."""
        service.set_default_page("default-page")
        
        # No schedules, should return default
        page_id = service.get_active_page_id(time(9, 0), "monday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_matches_schedule(self, service):
        """Test active page when schedule matches."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="weekdays",
            enabled=True
        )
        service.create_schedule(create_data)
        
        # Monday 12:00 - should match weekdays schedule
        page_id = service.get_active_page_id(time(12, 0), "monday")
        assert page_id == "work-page"
    
    def test_get_active_page_id_disabled_schedule_ignored(self, service):
        """Test that disabled schedules are ignored."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=False  # Disabled
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # Should use default, not disabled schedule
        page_id = service.get_active_page_id(time(12, 0), "monday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_before_schedule(self, service):
        """Test active page before schedule starts."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # 06:00 - before schedule
        page_id = service.get_active_page_id(time(6, 0), "monday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_after_schedule(self, service):
        """Test active page after schedule ends."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # 18:00 - after schedule (17:00 is exclusive)
        page_id = service.get_active_page_id(time(18, 0), "monday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_at_exact_start_time(self, service):
        """Test active page at exact start time (inclusive)."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        service.create_schedule(create_data)
        
        # 09:00 - exact start (inclusive)
        page_id = service.get_active_page_id(time(9, 0), "monday")
        assert page_id == "work-page"
    
    def test_get_active_page_id_at_exact_end_time(self, service):
        """Test active page at exact end time (exclusive)."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # 17:00 - exact end (exclusive)
        page_id = service.get_active_page_id(time(17, 0), "monday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_weekdays_only(self, service):
        """Test schedule applies only to weekdays."""
        create_data = ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="weekdays",
            enabled=True
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # Monday (weekday) - should match
        page_id = service.get_active_page_id(time(12, 0), "monday")
        assert page_id == "work-page"
        
        # Saturday (weekend) - should not match
        page_id = service.get_active_page_id(time(12, 0), "saturday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_weekends_only(self, service):
        """Test schedule applies only to weekends."""
        create_data = ScheduleCreate(
            page_id="leisure-page",
            start_time="10:00",
            end_time="18:00",
            day_pattern="weekends",
            enabled=True
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # Saturday (weekend) - should match
        page_id = service.get_active_page_id(time(12, 0), "saturday")
        assert page_id == "leisure-page"
        
        # Monday (weekday) - should not match
        page_id = service.get_active_page_id(time(12, 0), "monday")
        assert page_id == "default-page"
    
    def test_get_active_page_id_custom_days(self, service):
        """Test schedule with custom days."""
        create_data = ScheduleCreate(
            page_id="custom-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="custom",
            custom_days=["monday", "wednesday", "friday"],
            enabled=True
        )
        service.create_schedule(create_data)
        
        service.set_default_page("default-page")
        
        # Monday - should match
        page_id = service.get_active_page_id(time(12, 0), "monday")
        assert page_id == "custom-page"
        
        # Tuesday - should not match
        page_id = service.get_active_page_id(time(12, 0), "tuesday")
        assert page_id == "default-page"
        
        # Wednesday - should match
        page_id = service.get_active_page_id(time(12, 0), "wednesday")
        assert page_id == "custom-page"


class TestValidation:
    """Test schedule validation."""
    
    def test_validate_schedules_no_overlaps(self, service):
        """Test validation with no overlaps."""
        # Create non-overlapping schedules
        service.create_schedule(ScheduleCreate(
            page_id="morning-page",
            start_time="06:00",
            end_time="12:00",
            day_pattern="all",
            enabled=True
        ))
        
        service.create_schedule(ScheduleCreate(
            page_id="afternoon-page",
            start_time="12:00",
            end_time="18:00",
            day_pattern="all",
            enabled=True
        ))
        
        result = service.validate_schedules()
        assert result.valid is True
        assert len(result.overlaps) == 0
    
    def test_validate_schedules_with_time_overlap(self, service):
        """Test validation detects time overlaps."""
        # Create overlapping schedules (same day pattern, overlapping times)
        service.create_schedule(ScheduleCreate(
            page_id="page-1",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        ))
        
        service.create_schedule(ScheduleCreate(
            page_id="page-2",
            start_time="15:00",  # Overlaps with previous
            end_time="20:00",
            day_pattern="all",
            enabled=True
        ))
        
        result = service.validate_schedules()
        assert result.valid is False
        assert len(result.overlaps) > 0
    
    def test_validate_schedules_different_days_no_overlap(self, service):
        """Test schedules on different days don't overlap."""
        # Same times but different days
        service.create_schedule(ScheduleCreate(
            page_id="weekday-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="weekdays",
            enabled=True
        ))
        
        service.create_schedule(ScheduleCreate(
            page_id="weekend-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="weekends",
            enabled=True
        ))
        
        result = service.validate_schedules()
        assert result.valid is True
        assert len(result.overlaps) == 0
    
    def test_validate_schedules_partial_day_overlap(self, service):
        """Test overlaps when days partially overlap."""
        # "all" includes weekdays, so these overlap on weekdays
        service.create_schedule(ScheduleCreate(
            page_id="weekday-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="weekdays",
            enabled=True
        ))
        
        service.create_schedule(ScheduleCreate(
            page_id="all-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        ))
        
        result = service.validate_schedules()
        assert result.valid is False
        assert len(result.overlaps) > 0
    
    def test_validate_schedules_ignores_disabled(self, service):
        """Test validation ignores disabled schedules."""
        service.create_schedule(ScheduleCreate(
            page_id="page-1",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        ))
        
        service.create_schedule(ScheduleCreate(
            page_id="page-2",
            start_time="15:00",
            end_time="20:00",
            day_pattern="all",
            enabled=False  # Disabled - should be ignored
        ))
        
        result = service.validate_schedules()
        assert result.valid is True
        assert len(result.overlaps) == 0
    
    def test_detect_gaps_full_day(self, service):
        """Test gap detection for a full day."""
        # Only schedule 9-17, leaves gaps before and after
        service.create_schedule(ScheduleCreate(
            page_id="work-page",
            start_time="09:00",
            end_time="17:00",
            day_pattern="all",
            enabled=True
        ))
        
        result = service.validate_schedules()
        
        # Should have gaps: 00:00-09:00 and 17:00-24:00 (represented as 23:59)
        assert len(result.gaps) > 0
    
    def test_detect_gaps_no_gaps(self, service):
        """Test no gaps when day is fully covered."""
        service.create_schedule(ScheduleCreate(
            page_id="all-day-page",
            start_time="00:00",
            end_time="23:45",  # Last 15-min slot
            day_pattern="all",
            enabled=True
        ))
        
        result = service.validate_schedules()
        
        # Should have no significant gaps
        # (might have tiny gap for 23:45-24:00)
        gaps_larger_than_15min = [g for g in result.gaps if service._time_diff_minutes(g.start_time, g.end_time) > 15]
        assert len(gaps_larger_than_15min) == 0


class TestDefaultPage:
    """Test default page management."""
    
    def test_get_default_page_initial(self, service):
        """Test getting default page when not set."""
        assert service.get_default_page() is None
    
    def test_set_default_page(self, service):
        """Test setting default page."""
        service.set_default_page("page-123")
        assert service.get_default_page() == "page-123"
    
    def test_clear_default_page(self, service):
        """Test clearing default page."""
        service.set_default_page("page-123")
        service.set_default_page(None)
        assert service.get_default_page() is None
