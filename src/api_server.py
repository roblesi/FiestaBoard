"""REST API server for Vestaboard Display Service."""

import logging
import logging.handlers
import threading
import time
import os
import json
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
from collections import deque
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .main import VestaboardDisplayService
from .config import Config
from .config_manager import get_config_manager
from .displays.service import get_display_service, DISPLAY_TYPES, DisplayResult
from .settings.service import get_settings_service, VALID_STRATEGIES, VALID_OUTPUT_TARGETS
from .pages.service import get_page_service, DeleteResult
from .pages.models import PageCreate, PageUpdate
from .templates.engine import get_template_engine
from .text_to_board import text_to_board_array

logger = logging.getLogger(__name__)

# Log file configuration
LOG_DIR = Path("/app/data/logs")
LOG_FILE = LOG_DIR / "app.log"
LOG_MAX_BYTES = 5 * 1024 * 1024  # 5MB per file
LOG_BACKUP_COUNT = 5  # Keep 5 backup files (25MB total max)

# Global service instance
_service: Optional[VestaboardDisplayService] = None
_service_lock = threading.Lock()
_service_thread: Optional[threading.Thread] = None
_service_running = False
_dev_mode = False  # When True, preview only - don't send to Vestaboard

# In-memory log buffer (last 500 log entries for quick access)
_log_buffer: deque = deque(maxlen=500)
_log_lock = threading.Lock()


def _create_log_entry(record: logging.LogRecord, formatted_message: str) -> Dict[str, Any]:
    """Create a structured log entry from a log record with UTC timestamp."""
    from .time_service import get_time_service
    time_service = get_time_service()
    
    return {
        "timestamp": time_service.create_utc_timestamp(),
        "level": record.levelname,
        "logger": record.name,
        "message": formatted_message
    }


class LogBufferHandler(logging.Handler):
    """Custom logging handler that stores logs in memory for API access."""
    
    def emit(self, record):
        try:
            log_entry = _create_log_entry(record, self.format(record))
            with _log_lock:
                _log_buffer.append(log_entry)
        except Exception:
            self.handleError(record)


class JSONFileHandler(logging.handlers.RotatingFileHandler):
    """Rotating file handler that writes logs as JSON lines."""
    
    def emit(self, record):
        try:
            log_entry = _create_log_entry(record, self.format(record))
            # Write as JSON line
            msg = json.dumps(log_entry) + '\n'
            stream = self.stream
            stream.write(msg)
            self.flush()
            # Handle rotation
            if self.shouldRollover(record):
                self.doRollover()
        except Exception:
            self.handleError(record)
    
    def shouldRollover(self, record):
        """Check if we should rollover based on file size."""
        if self.stream is None:
            self.stream = self._open()
        if self.maxBytes > 0:
            self.stream.seek(0, 2)  # Seek to end
            if self.stream.tell() >= self.maxBytes:
                return True
        return False


def _setup_file_logging():
    """Set up file-based logging with rotation."""
    try:
        # Create logs directory if it doesn't exist
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        # Create JSON file handler with rotation
        file_handler = JSONFileHandler(
            str(LOG_FILE),
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setFormatter(logging.Formatter('%(message)s'))
        file_handler.setLevel(logging.INFO)
        
        # Add to root logger
        logging.getLogger().addHandler(file_handler)
        logger.info(f"File logging initialized: {LOG_FILE}")
    except Exception as e:
        logger.warning(f"Failed to set up file logging: {e}")


def _read_logs_from_files(
    limit: int = 100,
    offset: int = 0,
    level: Optional[str] = None,
    search: Optional[str] = None
) -> tuple[List[Dict[str, Any]], int, bool]:
    """
    Read logs from log files with filtering and pagination.
    
    Returns: (logs, total_matching, has_more)
    """
    all_logs = []
    
    # Read from current log file and backups
    log_files = [LOG_FILE]
    for i in range(1, LOG_BACKUP_COUNT + 1):
        backup_file = Path(f"{LOG_FILE}.{i}")
        if backup_file.exists():
            log_files.append(backup_file)
    
    # Read all log entries from files (newest first)
    for log_file in log_files:
        if not log_file.exists():
            continue
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        all_logs.append(entry)
                    except json.JSONDecodeError:
                        continue
        except Exception:
            continue
    
    # Also include in-memory buffer (most recent)
    with _log_lock:
        memory_logs = list(_log_buffer)
    
    # Merge: memory logs are most recent, then file logs
    # Deduplicate by timestamp + message
    seen = set()
    merged_logs = []
    
    for log in reversed(memory_logs):
        key = (log.get('timestamp'), log.get('message'))
        if key not in seen:
            seen.add(key)
            merged_logs.append(log)
    
    for log in all_logs:
        key = (log.get('timestamp'), log.get('message'))
        if key not in seen:
            seen.add(key)
            merged_logs.append(log)
    
    # Apply filters
    filtered_logs = merged_logs
    
    if level:
        level_upper = level.upper()
        filtered_logs = [log for log in filtered_logs if log.get('level') == level_upper]
    
    if search:
        search_lower = search.lower()
        filtered_logs = [
            log for log in filtered_logs
            if search_lower in log.get('message', '').lower() or
               search_lower in log.get('logger', '').lower()
        ]
    
    total_matching = len(filtered_logs)
    
    # Apply pagination
    start = offset
    end = offset + limit
    paginated = filtered_logs[start:end]
    has_more = end < total_matching
    
    return paginated, total_matching, has_more


class MessageRequest(BaseModel):
    """Request model for sending a custom message."""
    text: str


class StatusResponse(BaseModel):
    """Response model for service status."""
    running: bool
    initialized: bool
    config_summary: Dict[str, Any]


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    service_running: bool


# Create FastAPI app
app = FastAPI(
    title="Vestaboard Display API",
    description="REST API for controlling and monitoring the Vestaboard Display Service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your UI domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up log buffer handler
log_buffer_handler = LogBufferHandler()
log_buffer_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logging.getLogger().addHandler(log_buffer_handler)


def get_service() -> Optional[VestaboardDisplayService]:
    """Get or create the service instance."""
    global _service
    if _service is None:
        with _service_lock:
            if _service is None:
                _service = VestaboardDisplayService()
                if not _service.initialize():
                    logger.error("Failed to initialize service")
                    return None
    return _service


def run_service_background():
    """Run the service in a background thread."""
    global _service_running, _service
    service = get_service()
    if service:
        _service_running = True
        try:
            logger.info("Starting background display service...")
            service.run()
        except Exception as e:
            logger.error(f"Service error: {e}", exc_info=True)
        finally:
            _service_running = False
            logger.info("Background display service stopped")


@app.on_event("startup")
async def startup_event():
    """Initialize service on startup."""
    global _dev_mode, _service_thread
    logger.info("API server starting up...")
    
    # Set up file-based logging
    _setup_file_logging()
    
    # Auto-enable dev mode in local development (when not in production)
    # Check if we're in a development environment
    is_production = os.getenv("PRODUCTION", "false").lower() == "true"
    if not is_production:
        _dev_mode = True
        logger.info("Dev mode auto-enabled for local development")
    
    # Initialize and auto-start the service
    service = get_service()
    if service:
        logger.info("Auto-starting background service...")
        _service_thread = threading.Thread(target=run_service_background, daemon=True)
        _service_thread.start()
        time.sleep(0.5)  # Give it a moment to start
        logger.info("Background service auto-started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global _service, _service_running
    logger.info("API server shutting down...")
    _service_running = False
    if _service:
        _service.running = False


@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Vestaboard Display API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    service = get_service()
    return HealthResponse(
        status="ok",
        service_running=_service_running and service is not None
    )


@app.get("/logs")
async def get_logs(
    limit: int = Query(default=50, ge=1, le=500, description="Number of log entries to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    level: Optional[str] = Query(default=None, description="Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"),
    search: Optional[str] = Query(default=None, description="Search in log message or logger name")
):
    """Get application logs with pagination, filtering, and search.
    
    Args:
        limit: Maximum number of log entries to return (default 50, max 500)
        offset: Number of entries to skip for pagination
        level: Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        search: Search text in log message or logger name
    
    Returns:
        List of log entries with pagination info
    """
    # Validate level if provided
    valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    if level and level.upper() not in valid_levels:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid log level: {level}. Valid levels: {valid_levels}"
        )
    
    logs, total, has_more = _read_logs_from_files(
        limit=limit,
        offset=offset,
        level=level,
        search=search
    )
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": has_more,
        "filters": {
            "level": level.upper() if level else None,
            "search": search
        }
    }


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Get current service status."""
    global _dev_mode
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    settings_service = get_settings_service()
    
    status = StatusResponse(
        running=_service_running,
        initialized=service is not None,
        config_summary=Config.get_summary()
    )
    # Add dev mode to config summary for UI
    status.config_summary["dev_mode"] = _dev_mode
    # Add active page ID to config summary
    status.config_summary["active_page_id"] = settings_service.get_active_page_id()
    return status


@app.post("/start")
async def start_service(background_tasks: BackgroundTasks):
    """Start the background service."""
    global _service_thread, _service_running
    
    if _service_running:
        return {"status": "already_running", "message": "Service is already running"}
    
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    # Start service in background thread
    _service_thread = threading.Thread(target=run_service_background, daemon=True)
    _service_thread.start()
    
    # Give it a moment to start
    time.sleep(0.5)
    
    return {"status": "started", "message": "Service started successfully"}


@app.post("/stop")
async def stop_service():
    """Stop the background service."""
    global _service_running, _service
    
    if not _service_running:
        return {"status": "not_running", "message": "Service is not running"}
    
    if _service:
        _service.running = False
        _service_running = False
    
    return {"status": "stopped", "message": "Service stopped successfully"}


@app.post("/refresh")
async def refresh_display():
    """Manually trigger a display refresh."""
    global _dev_mode
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        service.fetch_and_display(dev_mode=_dev_mode)
        if _dev_mode:
            return {
                "status": "success", 
                "message": "Display previewed (dev mode enabled - not sent to Vestaboard)",
                "dev_mode": True
            }
        return {"status": "success", "message": "Display refreshed successfully"}
    except Exception as e:
        logger.error(f"Error refreshing display: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh display: {str(e)}")


@app.post("/send-message")
async def send_message(request: MessageRequest):
    """Send a custom message to the Vestaboard."""
    global _dev_mode
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if _dev_mode:
        logger.info(f"[DEV MODE] Would send message (not actually sending):\n{request.text}")
        return {
            "status": "success", 
            "message": "Message previewed (dev mode enabled - not sent to Vestaboard)",
            "dev_mode": True
        }
    
    # Check if we're in silence mode - absolute preference
    if Config.is_silence_mode_active():
        logger.info("Silence mode is active, skipping board update")
        return {
            "status": "success",
            "message": "Message skipped (silence mode is active)",
            "skipped": True,
            "silence_mode": True
        }
    
    if not service.vb_client:
        raise HTTPException(status_code=503, detail="Vestaboard client not initialized")
    
    try:
        # Convert text to board array for proper character/color support
        board_array = text_to_board_array(request.text)
        settings_service = get_settings_service()
        transition = settings_service.get_transition_settings()
        
        success, was_sent = service.vb_client.send_characters(
            board_array,
            strategy=transition.strategy,
            step_interval_ms=transition.step_interval_ms,
            step_size=transition.step_size
        )
        if success:
            if was_sent:
                return {"status": "success", "message": "Message sent successfully"}
            else:
                return {"status": "success", "message": "Message unchanged, no update needed", "skipped": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to send message")
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@app.get("/config")
async def get_config():
    """Get current configuration summary (without sensitive keys)."""
    return Config.get_summary()


# =============================================================================
# Configuration Management Endpoints
# =============================================================================

@app.get("/config/full")
async def get_full_config():
    """
    Get the full configuration with sensitive fields masked.
    
    Returns the complete config structure including all features and settings.
    API keys and passwords are masked with '***'.
    """
    config_manager = get_config_manager()
    return config_manager.get_all_masked()


@app.get("/config/features")
async def get_features_config():
    """Get configuration for all features."""
    config_manager = get_config_manager()
    full_config = config_manager.get_all_masked()
    return {
        "features": full_config.get("features", {}),
        "available_features": config_manager.get_feature_list()
    }


@app.get("/config/features/{feature_name}")
async def get_feature_config(feature_name: str):
    """
    Get configuration for a specific feature.
    
    Args:
        feature_name: One of: weather, datetime, home_assistant, apple_music,
                      guest_wifi, star_trek_quotes, rotation
    """
    config_manager = get_config_manager()
    feature = config_manager.get_feature(feature_name)
    
    if feature is None:
        available = config_manager.get_feature_list()
        raise HTTPException(
            status_code=404,
            detail=f"Feature not found: {feature_name}. Available: {available}"
        )
    
    # Mask sensitive fields
    masked = config_manager._mask_sensitive(feature)
    
    return {
        "feature": feature_name,
        "config": masked
    }


@app.put("/config/features/{feature_name}")
async def update_feature_config(feature_name: str, request: dict):
    """
    Update configuration for a specific feature.
    
    Args:
        feature_name: The feature to update
        request: Partial feature configuration to update
    
    Example body:
    {
        "enabled": true,
        "api_key": "your-api-key",
        "location": "New York, NY"
    }
    """
    config_manager = get_config_manager()
    
    if feature_name not in config_manager.get_feature_list():
        available = config_manager.get_feature_list()
        raise HTTPException(
            status_code=404,
            detail=f"Feature not found: {feature_name}. Available: {available}"
        )
    
    # Update the feature
    success = config_manager.set_feature(feature_name, request)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update feature")
    
    # Reload config in the Config class
    Config.reload()
    
    # Get updated config (masked)
    updated = config_manager.get_feature(feature_name)
    masked = config_manager._mask_sensitive(updated)
    
    return {
        "status": "success",
        "feature": feature_name,
        "config": masked
    }


@app.get("/config/vestaboard")
async def get_vestaboard_config():
    """Get Vestaboard connection configuration (keys masked)."""
    config_manager = get_config_manager()
    vb_config = config_manager.get_vestaboard()
    masked = config_manager._mask_sensitive(vb_config)
    
    return {
        "config": masked,
        "api_modes": ["local", "cloud"]
    }


@app.put("/config/vestaboard")
async def update_vestaboard_config(request: dict):
    """
    Update Vestaboard configuration.
    
    Example body:
    {
        "api_mode": "local",
        "local_api_key": "your-key",
        "host": "192.168.1.100"
    }
    """
    config_manager = get_config_manager()
    
    # Update vestaboard config
    config_manager.set_vestaboard(request)
    
    # Reload config in the Config class
    Config.reload()
    
    # Get updated config (masked)
    updated = config_manager.get_vestaboard()
    masked = config_manager._mask_sensitive(updated)
    
    return {
        "status": "success",
        "config": masked
    }


@app.get("/config/validate")
async def validate_config():
    """
    Validate the current configuration.
    
    Returns validation status and any errors found.
    """
    config_manager = get_config_manager()
    is_valid, errors = config_manager.validate()
    
    return {
        "valid": is_valid,
        "errors": errors
    }


@app.get("/config/general")
async def get_general_config():
    """Get general configuration (timezone, refresh interval, etc.)."""
    config_manager = get_config_manager()
    return config_manager.get_general()


@app.put("/config/general")
async def update_general_config(request: dict):
    """
    Update general configuration.
    
    Body can include:
    - timezone: IANA timezone name (e.g., "America/Los_Angeles")
    - refresh_interval_seconds: Refresh interval in seconds
    - output_target: Output target ("ui", "board", or "both")
    """
    config_manager = get_config_manager()
    
    # Get current general config
    general_config = config_manager.get_general()
    
    # Update with provided values
    if "timezone" in request:
        general_config["timezone"] = request["timezone"]
    if "refresh_interval_seconds" in request:
        general_config["refresh_interval_seconds"] = request["refresh_interval_seconds"]
    if "output_target" in request:
        general_config["output_target"] = request["output_target"]
    
    # Save back
    success = config_manager.set_general(general_config)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update general configuration")
    
    return {
        "status": "success",
        "general": general_config
    }


@app.get("/silence-status")
async def get_silence_status():
    """
    Get current silence mode status with UTC times.
    
    Returns:
    - enabled: Whether silence schedule is enabled
    - active: Whether silence mode is currently active
    - start_time_utc: Start time in UTC ISO format
    - end_time_utc: End time in UTC ISO format
    - current_time_utc: Current UTC time
    - next_change_utc: Time of next status change
    """
    from .time_service import get_time_service
    
    time_service = get_time_service()
    config_manager = get_config_manager()
    
    # Trigger migration if needed
    config_manager.migrate_silence_schedule_to_utc()
    
    silence_config = config_manager.get_feature("silence_schedule")
    enabled = silence_config.get("enabled", False)
    start_time = silence_config.get("start_time", "20:00+00:00")
    end_time = silence_config.get("end_time", "07:00+00:00")
    
    # Check if currently active
    active = False
    if enabled:
        active = time_service.is_time_in_window(start_time, end_time)
    
    # Get current UTC time
    current_utc = time_service.get_current_utc()
    current_time_utc = current_utc.strftime("%H:%M+00:00")
    
    # Determine next change time (simplified - just return start or end)
    next_change_utc = end_time if active else start_time
    
    return {
        "enabled": enabled,
        "active": active,
        "start_time_utc": start_time,
        "end_time_utc": end_time,
        "current_time_utc": current_time_utc,
        "next_change_utc": next_change_utc
    }


# =============================================================================
# Display Source Endpoints
# =============================================================================

@app.get("/displays")
async def list_displays():
    """
    List all available display types and their status.
    
    Returns information about each display source including whether
    it's currently available/configured.
    """
    display_service = get_display_service()
    displays = display_service.get_available_displays()
    return {
        "displays": displays,
        "total": len(displays),
        "available_count": sum(1 for d in displays if d["available"])
    }


@app.get("/displays/{display_type}")
async def get_display(display_type: str):
    """
    Get formatted output for a specific display type.
    
    Args:
        display_type: One of: weather, datetime, weather_datetime, 
                      home_assistant, apple_music, star_trek, guest_wifi
    
    Returns:
        Formatted message text ready for display on Vestaboard.
    """
    if display_type not in DISPLAY_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid display type: {display_type}. Valid types: {DISPLAY_TYPES}"
        )
    
    display_service = get_display_service()
    result = display_service.get_display(display_type)
    
    if not result.available and result.error:
        raise HTTPException(status_code=503, detail=result.error)
    
    return {
        "display_type": result.display_type,
        "message": result.formatted,
        "lines": result.formatted.split('\n') if result.formatted else [],
        "line_count": len(result.formatted.split('\n')) if result.formatted else 0,
        "available": result.available
    }


@app.get("/displays/{display_type}/raw")
async def get_display_raw(display_type: str):
    """
    Get raw data from a display source (before formatting).
    
    This is useful for debugging or building custom displays.
    
    Args:
        display_type: One of: weather, datetime, weather_datetime,
                      home_assistant, apple_music, star_trek, guest_wifi
    
    Returns:
        Raw data dictionary from the source.
    """
    if display_type not in DISPLAY_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid display type: {display_type}. Valid types: {DISPLAY_TYPES}"
        )
    
    display_service = get_display_service()
    result = display_service.get_display(display_type)
    
    if not result.available and result.error:
        raise HTTPException(status_code=503, detail=result.error)
    
    return {
        "display_type": result.display_type,
        "data": result.raw,
        "available": result.available,
        "error": result.error
    }


@app.post("/displays/{display_type}/send")
async def send_display(
    display_type: str,
    target: Optional[str] = None
):
    """
    Send a display to the configured target (ui, board, or both).
    
    Args:
        display_type: The display type to send
        target: Override output target (ui, board, both). If not provided,
                uses the configured default based on dev_mode.
    
    Returns:
        Result of the send operation.
    """
    global _dev_mode
    
    if display_type not in DISPLAY_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid display type: {display_type}. Valid types: {DISPLAY_TYPES}"
        )
    
    if target is not None and target not in VALID_OUTPUT_TARGETS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target: {target}. Valid targets: {VALID_OUTPUT_TARGETS}"
        )
    
    display_service = get_display_service()
    settings_service = get_settings_service()
    service = get_service()
    
    if not service or not service.vb_client:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    # Get the display content
    result = display_service.get_display(display_type)
    
    if not result.available:
        raise HTTPException(status_code=503, detail=result.error or "Display not available")
    
    # Determine target
    if target is None:
        # Use settings-based logic
        send_to_board = settings_service.should_send_to_board(_dev_mode)
    else:
        send_to_board = target in ["board", "both"]
    
    # Send to board if appropriate
    sent_to_board = False
    if send_to_board and not _dev_mode:
        transition = settings_service.get_transition_settings()
        # Convert to board array for proper character/color support
        board_array = text_to_board_array(result.formatted)
        success, was_sent = service.vb_client.send_characters(
            board_array,
            strategy=transition.strategy,
            step_interval_ms=transition.step_interval_ms,
            step_size=transition.step_size
        )
        sent_to_board = was_sent
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send to board")
    
    return {
        "status": "success",
        "display_type": display_type,
        "message": result.formatted,
        "sent_to_board": sent_to_board,
        "target": target or ("ui" if _dev_mode else settings_service.get_output_settings().target),
        "dev_mode": _dev_mode
    }


# =============================================================================
# Bay Wheels Station Search Endpoints
# =============================================================================

@app.get("/baywheels/stations")
async def list_all_baywheels_stations():
    """
    List all Bay Wheels stations with current status.
    
    Returns all stations from the GBFS feed with their current bike availability.
    """
    from src.data_sources.baywheels import BayWheelsSource, STATION_STATUS_URL
    import requests
    
    try:
        # Get station information
        station_info = BayWheelsSource._get_station_information()
        
        # Get current status
        response = requests.get(STATION_STATUS_URL, timeout=10)
        response.raise_for_status()
        status_data = response.json()
        stations_status = {s.get("station_id"): s for s in status_data.get("data", {}).get("stations", [])}
        
        # Combine information and status
        result = []
        for station_id, info in (station_info or {}).items():
            status = stations_status.get(station_id, {})
            
            # Count bike types
            electric = 0
            classic = 0
            for vt in status.get("vehicle_types_available", []):
                vt_id = vt.get("vehicle_type_id", "").lower()
                count = vt.get("count", 0)
                if "electric" in vt_id or "boost" in vt_id:
                    electric += count
                elif "classic" in vt_id:
                    classic += count
                else:
                    classic += count
            
            result.append({
                "station_id": station_id,
                "name": info.get("name", station_id),
                "lat": info.get("lat"),
                "lon": info.get("lon"),
                "address": info.get("address", ""),
                "capacity": info.get("capacity", 0),
                "num_bikes_available": status.get("num_bikes_available", 0),
                "electric_bikes": electric,
                "classic_bikes": classic,
                "num_docks_available": status.get("num_docks_available", 0),
                "is_renting": status.get("is_renting", 1) == 1,
            })
        
        return {
            "stations": result,
            "total": len(result)
        }
    except Exception as e:
        logger.error(f"Error listing Bay Wheels stations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/baywheels/stations/nearby")
async def find_nearby_baywheels_stations(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(2.0, description="Search radius in kilometers"),
    limit: int = Query(10, description="Maximum number of results")
):
    """
    Find Bay Wheels stations near a location.
    
    Args:
        lat: Latitude
        lng: Longitude
        radius: Search radius in kilometers (default 2.0)
        limit: Maximum number of results (default 10)
    
    Returns:
        List of nearby stations sorted by distance
    """
    from src.data_sources.baywheels import BayWheelsSource, STATION_STATUS_URL
    import requests
    
    try:
        stations = BayWheelsSource.find_stations_near_location(lat, lng, radius, limit)
        
        # Get current status for these stations
        response = requests.get(STATION_STATUS_URL, timeout=10)
        response.raise_for_status()
        status_data = response.json()
        stations_status = {s.get("station_id"): s for s in status_data.get("data", {}).get("stations", [])}
        
        # Add status information to each station
        for station in stations:
            station_id = station["station_id"]
            status = stations_status.get(station_id, {})
            
            # Count bike types
            electric = 0
            classic = 0
            for vt in status.get("vehicle_types_available", []):
                vt_id = vt.get("vehicle_type_id", "").lower()
                count = vt.get("count", 0)
                if "electric" in vt_id or "boost" in vt_id:
                    electric += count
                elif "classic" in vt_id:
                    classic += count
                else:
                    classic += count
            
            station["num_bikes_available"] = status.get("num_bikes_available", 0)
            station["electric_bikes"] = electric
            station["classic_bikes"] = classic
            station["num_docks_available"] = status.get("num_docks_available", 0)
            station["is_renting"] = status.get("is_renting", 1) == 1
        
        return {
            "stations": stations,
            "count": len(stations),
            "search_location": {"lat": lat, "lng": lng},
            "radius_km": radius
        }
    except Exception as e:
        logger.error(f"Error finding nearby Bay Wheels stations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/baywheels/stations/search")
async def search_baywheels_stations_by_address(
    address: str = Query(..., description="Address to search near"),
    radius: float = Query(2.0, description="Search radius in kilometers"),
    limit: int = Query(10, description="Maximum number of results")
):
    """
    Find Bay Wheels stations near an address.
    
    Uses OpenStreetMap Nominatim for geocoding (free, no API key required).
    
    Args:
        address: Address string (e.g., "123 Main St, San Francisco, CA")
        radius: Search radius in kilometers (default 2.0)
        limit: Maximum number of results (default 10)
    
    Returns:
        List of nearby stations sorted by distance
    """
    from src.data_sources.baywheels import BayWheelsSource, STATION_STATUS_URL
    import requests
    
    try:
        # Geocode address using Nominatim
        geocode_url = "https://nominatim.openstreetmap.org/search"
        geocode_params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        geocode_headers = {
            "User-Agent": "Vesta-Vestaboard-Service/1.0"
        }
        
        geocode_response = requests.get(geocode_url, params=geocode_params, headers=geocode_headers, timeout=10)
        geocode_response.raise_for_status()
        geocode_data = geocode_response.json()
        
        if not geocode_data:
            raise HTTPException(status_code=404, detail=f"Address not found: {address}")
        
        location = geocode_data[0]
        lat = float(location["lat"])
        lng = float(location["lon"])
        
        # Find nearby stations
        stations = BayWheelsSource.find_stations_near_location(lat, lng, radius, limit)
        
        # Get current status for these stations
        response = requests.get(STATION_STATUS_URL, timeout=10)
        response.raise_for_status()
        status_data = response.json()
        stations_status = {s.get("station_id"): s for s in status_data.get("data", {}).get("stations", [])}
        
        # Add status information to each station
        for station in stations:
            station_id = station["station_id"]
            status = stations_status.get(station_id, {})
            
            # Count bike types
            electric = 0
            classic = 0
            for vt in status.get("vehicle_types_available", []):
                vt_id = vt.get("vehicle_type_id", "").lower()
                count = vt.get("count", 0)
                if "electric" in vt_id or "boost" in vt_id:
                    electric += count
                elif "classic" in vt_id:
                    classic += count
                else:
                    classic += count
            
            station["num_bikes_available"] = status.get("num_bikes_available", 0)
            station["electric_bikes"] = electric
            station["classic_bikes"] = classic
            station["num_docks_available"] = status.get("num_docks_available", 0)
            station["is_renting"] = status.get("is_renting", 1) == 1
        
        return {
            "stations": stations,
            "count": len(stations),
            "search_address": address,
            "geocoded_location": {"lat": lat, "lng": lng, "display_name": location.get("display_name", "")},
            "radius_km": radius
        }
    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Error geocoding address: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Error searching Bay Wheels stations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MUNI Endpoints
# =============================================================================

@app.get("/muni/stops")
async def list_all_muni_stops():
    """
    List all SF Muni stops with metadata.
    
    Returns all stops from the 511.org transit API with cached data (24hr TTL).
    """
    import requests
    import time
    
    # Cache for stop information (24 hour TTL)
    cache_key = "_muni_stops_cache"
    cache_time_key = "_muni_stops_cache_time"
    CACHE_TTL = 24 * 60 * 60  # 24 hours
    
    # Check if we have cached data
    if not hasattr(list_all_muni_stops, cache_key):
        setattr(list_all_muni_stops, cache_key, None)
        setattr(list_all_muni_stops, cache_time_key, 0)
    
    cached_data = getattr(list_all_muni_stops, cache_key)
    cache_time = getattr(list_all_muni_stops, cache_time_key)
    current_time = time.time()
    
    # Return cached data if still valid
    if cached_data and (current_time - cache_time) < CACHE_TTL:
        return cached_data
    
    try:
        # Fetch stops from 511.org
        # Note: 511.org requires an API key for most endpoints
        # We'll use the configured MUNI API key
        from src.config import Config
        api_key = Config.MUNI_API_KEY
        
        if not api_key:
            raise HTTPException(status_code=400, detail="MUNI API key not configured")
        
        url = "http://api.511.org/transit/stops"
        params = {
            "api_key": api_key,
            "operator_id": "SF",
            "format": "json"
        }
        
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        
        # Handle BOM if present
        content = response.text
        if content.startswith('\ufeff'):
            content = content[1:]
        
        import json
        data = json.loads(content)
        
        # Parse stops from the Contents.dataObjects.ScheduledStopPoint array
        stops = []
        stop_points = data.get("Contents", {}).get("dataObjects", {}).get("ScheduledStopPoint", [])
        
        for stop in stop_points:
            stop_id = stop.get("id", "")
            # Extract numeric stop code from ID (format: "SF_####")
            stop_code = stop_id.split("_")[-1] if "_" in stop_id else stop_id
            
            location = stop.get("Location", {})
            lat = location.get("Latitude")
            lon = location.get("Longitude")
            
            # Get stop name
            name = stop.get("Name", stop_code)
            
            stops.append({
                "stop_code": stop_code,
                "stop_id": stop_id,
                "name": name,
                "lat": float(lat) if lat else None,
                "lon": float(lon) if lon else None,
            })
        
        result = {
            "stops": stops,
            "total": len(stops)
        }
        
        # Update cache
        setattr(list_all_muni_stops, cache_key, result)
        setattr(list_all_muni_stops, cache_time_key, current_time)
        
        return result
        
    except Exception as e:
        logger.error(f"Error listing Muni stops: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/muni/stops/nearby")
async def find_nearby_muni_stops(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(0.5, description="Search radius in kilometers"),
    limit: int = Query(10, description="Maximum number of results")
):
    """
    Find Muni stops near a location.
    
    Args:
        lat: Latitude
        lng: Longitude
        radius: Search radius in kilometers (default 0.5)
        limit: Maximum number of results (default 10)
    
    Returns:
        List of nearby stops sorted by distance with live arrival data
    """
    import math
    
    try:
        # Get all stops (from cache if available)
        stops_data = await list_all_muni_stops()
        all_stops = stops_data["stops"]
        
        # Calculate distance to each stop using haversine formula
        def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            """Calculate distance in kilometers between two points."""
            R = 6371.0  # Earth radius in km
            
            lat1_rad = math.radians(lat1)
            lon1_rad = math.radians(lon1)
            lat2_rad = math.radians(lat2)
            lon2_rad = math.radians(lon2)
            
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            
            a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            
            return R * c
        
        # Filter stops within radius and calculate distances
        nearby_stops = []
        for stop in all_stops:
            if stop["lat"] is None or stop["lon"] is None:
                continue
            
            distance = haversine_distance(lat, lng, stop["lat"], stop["lon"])
            
            if distance <= radius:
                stop_with_distance = stop.copy()
                stop_with_distance["distance_km"] = round(distance, 2)
                nearby_stops.append(stop_with_distance)
        
        # Sort by distance and limit
        nearby_stops.sort(key=lambda x: x["distance_km"])
        nearby_stops = nearby_stops[:limit]
        
        # Try to get routes serving each stop from regional transit cache
        try:
            from src.data_sources.transit_cache import get_transit_cache
            cache = get_transit_cache()
            
            if cache.is_ready():
                # Get all cached stop codes for SF agency
                all_sf_stops = cache.get_all_stops_for_agency("SF")
                
                for stop in nearby_stops:
                    try:
                        # Get cached visits for this stop
                        visits = all_sf_stops.get(stop["stop_code"], [])
                        
                        # Extract unique route names from cached visits
                        routes = set()
                        for visit in visits:
                            journey = visit.get("MonitoredVehicleJourney", {})
                            published_line = journey.get("PublishedLineName", "")
                            if isinstance(published_line, list):
                                published_line = published_line[0] if published_line else ""
                            if published_line:
                                routes.add(published_line.upper())
                        
                        stop["routes"] = sorted(list(routes))
                    except Exception:
                        # If we can't get routes, just skip
                        stop["routes"] = []
            else:
                logger.warning("Regional transit cache not ready, routes unavailable")
                for stop in nearby_stops:
                    stop["routes"] = []
        except Exception as e:
            logger.error(f"Error accessing regional transit cache: {e}")
            for stop in nearby_stops:
                stop["routes"] = []
        
        return {
            "stops": nearby_stops,
            "count": len(nearby_stops),
            "search_location": {"lat": lat, "lng": lng},
            "radius_km": radius
        }
        
    except Exception as e:
        logger.error(f"Error finding nearby Muni stops: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/muni/stops/search")
async def search_muni_stops_by_address(
    address: str = Query(..., description="Address to search near"),
    radius: float = Query(0.5, description="Search radius in kilometers"),
    limit: int = Query(10, description="Maximum number of results")
):
    """
    Find Muni stops near an address.
    
    Uses OpenStreetMap Nominatim for geocoding (free, no API key required).
    
    Args:
        address: Address string (e.g., "123 Main St, San Francisco, CA")
        radius: Search radius in kilometers (default 0.5)
        limit: Maximum number of results (default 10)
    
    Returns:
        List of nearby stops sorted by distance
    """
    import requests
    
    try:
        # Geocode address using Nominatim
        geocode_url = "https://nominatim.openstreetmap.org/search"
        geocode_params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        geocode_headers = {
            "User-Agent": "Vesta-Vestaboard-Service/1.0"
        }
        
        geocode_response = requests.get(geocode_url, params=geocode_params, headers=geocode_headers, timeout=10)
        geocode_response.raise_for_status()
        geocode_data = geocode_response.json()
        
        if not geocode_data:
            raise HTTPException(status_code=404, detail=f"Address not found: {address}")
        
        location = geocode_data[0]
        lat = float(location["lat"])
        lng = float(location["lon"])
        
        # Find nearby stops
        stops_data = await find_nearby_muni_stops(lat=lat, lng=lng, radius=radius, limit=limit)
        
        return {
            "stops": stops_data["stops"],
            "count": stops_data["count"],
            "search_address": address,
            "geocoded_location": {"lat": lat, "lng": lng, "display_name": location.get("display_name", "")},
            "radius_km": radius
        }
        
    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Error geocoding address: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Error searching Muni stops: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/transit/cache/status")
async def get_transit_cache_status():
    """
    Get status and health information about the regional transit cache.
    
    Returns cache statistics including:
    - Last refresh time and age
    - Number of agencies and stops cached
    - Refresh count and error count
    - Whether cache is stale
    """
    try:
        from src.data_sources.transit_cache import get_transit_cache
        cache = get_transit_cache()
        status = cache.get_status()
        
        # Add human-readable timestamps
        from datetime import datetime
        if status["last_refresh"] > 0:
            status["last_refresh_iso"] = datetime.fromtimestamp(status["last_refresh"]).isoformat()
        else:
            status["last_refresh_iso"] = None
            
        if status["last_success"] > 0:
            status["last_success_iso"] = datetime.fromtimestamp(status["last_success"]).isoformat()
        else:
            status["last_success_iso"] = None
        
        return status
    except Exception as e:
        logger.error(f"Error getting transit cache status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Traffic Endpoints
# =============================================================================

@app.post("/traffic/routes/geocode")
async def geocode_address(request: dict):
    """
    Geocode an address to coordinates.
    
    Body:
        address: Address string
    
    Returns:
        lat, lng, and formatted_address
    """
    import requests
    
    address = request.get("address")
    if not address:
        raise HTTPException(status_code=400, detail="address parameter required")
    
    try:
        # Try Nominatim (free, no key needed)
        geocode_url = "https://nominatim.openstreetmap.org/search"
        geocode_params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        geocode_headers = {
            "User-Agent": "Vesta-Vestaboard-Service/1.0"
        }
        
        response = requests.get(geocode_url, params=geocode_params, headers=geocode_headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data:
            raise HTTPException(status_code=404, detail=f"Address not found: {address}")
        
        location = data[0]
        return {
            "lat": float(location["lat"]),
            "lng": float(location["lon"]),
            "formatted_address": location.get("display_name", address)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error geocoding address: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/traffic/routes/validate")
async def validate_traffic_route(request: dict):
    """
    Validate a traffic route and get basic info.
    
    Body:
        origin: Origin address or lat,lng
        destination: Destination address or lat,lng
        destination_name: Display name for destination
    
    Returns:
        Validation result with distance and duration estimates
    """
    from src.data_sources.traffic import TrafficSource
    from src.config import Config
    
    origin = request.get("origin")
    destination = request.get("destination")
    destination_name = request.get("destination_name", "DESTINATION")
    
    if not origin or not destination:
        raise HTTPException(status_code=400, detail="origin and destination required")
    
    # Get API key from config
    api_key = getattr(Config, 'GOOGLE_ROUTES_API_KEY', None)
    if not api_key:
        raise HTTPException(status_code=400, detail="Google Routes API key not configured")
    
    try:
        # Create a temporary TrafficSource to test the route
        traffic_source = TrafficSource(
            api_key=api_key,
            origin=origin,
            destination=destination,
            destination_name=destination_name
        )
        
        # Fetch traffic data to validate
        data = traffic_source.fetch_traffic_data()
        
        if not data:
            return {
                "valid": False,
                "error": "Failed to fetch route data. Check that addresses are valid."
            }
        
        # Extract coordinates if available
        origin_coords = None
        destination_coords = None
        
        return {
            "valid": True,
            "distance_km": round(data.get("static_duration", 0) / 60 * 0.8, 1),  # Rough estimate
            "static_duration_minutes": data.get("static_duration_minutes", 0),
            "origin": origin,
            "destination": destination,
            "destination_name": destination_name,
            "origin_coords": origin_coords,
            "destination_coords": destination_coords
        }
        
    except Exception as e:
        logger.error(f"Error validating traffic route: {e}", exc_info=True)
        return {
            "valid": False,
            "error": str(e)
        }


# =============================================================================
# Settings Endpoints
# =============================================================================

@app.get("/settings/transitions")
async def get_transition_settings():
    """Get current transition animation settings."""
    settings_service = get_settings_service()
    transition = settings_service.get_transition_settings()
    return {
        "strategy": transition.strategy,
        "step_interval_ms": transition.step_interval_ms,
        "step_size": transition.step_size,
        "available_strategies": VALID_STRATEGIES
    }


@app.put("/settings/transitions")
async def update_transition_settings(request: dict):
    """
    Update transition animation settings.
    
    Body can include:
    - strategy: One of column, reverse-column, edges-to-center, row, diagonal, random, or null
    - step_interval_ms: Delay between animation steps (ms), or null for default
    - step_size: How many columns/rows animate at once, or null for default
    """
    settings_service = get_settings_service()
    
    try:
        # Use ... as sentinel for "not provided"
        strategy = request.get("strategy", ...)
        step_interval_ms = request.get("step_interval_ms", ...)
        step_size = request.get("step_size", ...)
        
        transition = settings_service.update_transition_settings(
            strategy=strategy,
            step_interval_ms=step_interval_ms,
            step_size=step_size
        )
        
        return {
            "status": "success",
            "settings": transition.to_dict()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/settings/output")
async def get_output_settings():
    """Get current output target settings."""
    global _dev_mode
    settings_service = get_settings_service()
    output = settings_service.get_output_settings()
    return {
        "target": output.target,
        "dev_mode": _dev_mode,
        "effective_target": "ui" if _dev_mode else output.target,
        "available_targets": VALID_OUTPUT_TARGETS
    }


@app.put("/settings/output")
async def update_output_settings(request: dict):
    """
    Update output target settings.
    
    Body should include:
    - target: One of "ui", "board", or "both"
    """
    if "target" not in request:
        raise HTTPException(status_code=400, detail="target parameter required")
    
    settings_service = get_settings_service()
    
    try:
        output = settings_service.set_output_target(request["target"])
        return {
            "status": "success",
            "settings": output.to_dict()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/settings/active-page")
async def get_active_page():
    """Get the currently active page ID."""
    settings_service = get_settings_service()
    page_id = settings_service.get_active_page_id()
    return {
        "page_id": page_id
    }


@app.put("/settings/active-page")
async def set_active_page(request: dict):
    """
    Set the active page ID.
    
    Body should include:
    - page_id: Page ID to set as active, or null to clear
    
    When a page is set, it will be immediately rendered and sent to the board
    (unless dev_mode is enabled).
    """
    global _dev_mode
    
    settings_service = get_settings_service()
    page_service = get_page_service()
    service = get_service()
    
    page_id = request.get("page_id")
    
    # Validate page exists if not clearing
    page = None
    if page_id is not None:
        page = page_service.get_page(page_id)
        if not page:
            raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    # Set the active page
    settings_service.set_active_page_id(page_id)
    
    # Immediately send to board if a page is set
    sent_to_board = False
    if page_id and page and service and service.vb_client and not _dev_mode:
        result = page_service.preview_page(page_id)
        if result and result.available:
            # Use page-level transitions if set, otherwise fall back to system defaults
            system_transition = settings_service.get_transition_settings()
            strategy = page.transition_strategy if page.transition_strategy else system_transition.strategy
            interval_ms = page.transition_interval_ms if page.transition_interval_ms is not None else system_transition.step_interval_ms
            step_size = page.transition_step_size if page.transition_step_size is not None else system_transition.step_size
            
            board_array = text_to_board_array(result.formatted)
            success, was_sent = service.vb_client.send_characters(
                board_array,
                strategy=strategy,
                step_interval_ms=interval_ms,
                step_size=step_size
            )
            sent_to_board = was_sent
            if not success:
                logger.warning(f"Failed to send active page to board: {page_id}")
    
    return {
        "status": "success",
        "page_id": page_id,
        "sent_to_board": sent_to_board,
        "dev_mode": _dev_mode
    }


# =============================================================================
# Pages Endpoints
# =============================================================================

@app.get("/pages")
async def list_pages():
    """List all saved pages."""
    page_service = get_page_service()
    pages = page_service.list_pages()
    
    return {
        "pages": [p.model_dump() for p in pages],
        "total": len(pages)
    }


@app.post("/pages")
async def create_page(page_data: PageCreate):
    """
    Create a new page.
    
    Page types:
    - single: Display a single source (set display_type)
    - composite: Combine rows from multiple sources (set rows)
    - template: Custom templated content (set template)
    """
    page_service = get_page_service()
    
    try:
        page = page_service.create_page(page_data)
        return {
            "status": "success",
            "page": page.model_dump()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/pages/{page_id}")
async def get_page(page_id: str):
    """Get a page by ID."""
    page_service = get_page_service()
    page = page_service.get_page(page_id)
    
    if not page:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    return page.model_dump()


@app.put("/pages/{page_id}")
async def update_page(page_id: str, page_data: PageUpdate):
    """Update an existing page."""
    page_service = get_page_service()
    
    try:
        page = page_service.update_page(page_id, page_data)
        if not page:
            raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
        
        return {
            "status": "success",
            "page": page.model_dump()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/pages/{page_id}")
async def delete_page(page_id: str):
    """Delete a page.
    
    If this is the last page, a default welcome page is automatically created
    to ensure there is always at least one page.
    
    If the deleted page was the active display page, the active page will be
    updated to another valid page automatically.
    """
    page_service = get_page_service()
    
    result = page_service.delete_page(page_id)
    
    if not result.deleted:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    response = {
        "status": "success",
        "message": f"Page {page_id} deleted",
        "default_page_created": result.default_page_created,
        "active_page_updated": result.active_page_updated,
    }
    
    if result.default_page_created:
        response["message"] = f"Page {page_id} deleted. A default welcome page was created."
        response["new_page_id"] = result.new_page_id
    
    if result.active_page_updated:
        response["new_active_page_id"] = result.new_active_page_id
    
    return response


@app.post("/pages/{page_id}/preview")
async def preview_page(page_id: str):
    """
    Preview a page's rendered output.
    
    Returns the formatted text that would be displayed.
    """
    page_service = get_page_service()
    result = page_service.preview_page(page_id)
    
    if result is None:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    if not result.available:
        raise HTTPException(status_code=503, detail=result.error or "Page rendering failed")
    
    return {
        "page_id": page_id,
        "message": result.formatted,
        "lines": result.formatted.split('\n'),
        "display_type": result.display_type,
        "raw": result.raw
    }


@app.post("/pages/{page_id}/send")
async def send_page(page_id: str, target: Optional[str] = None):
    """
    Send a page to the configured target.
    
    Args:
        page_id: The page ID
        target: Override output target (ui, board, both)
    """
    global _dev_mode
    
    if target is not None and target not in VALID_OUTPUT_TARGETS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target: {target}. Valid targets: {VALID_OUTPUT_TARGETS}"
        )
    
    page_service = get_page_service()
    settings_service = get_settings_service()
    service = get_service()
    
    if not service or not service.vb_client:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    # Get the page for transition settings
    page = page_service.get_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    # Render the page
    result = page_service.preview_page(page_id)
    
    if result is None:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    if not result.available:
        raise HTTPException(status_code=503, detail=result.error or "Page rendering failed")
    
    # Determine target
    if target is None:
        send_to_board = settings_service.should_send_to_board(_dev_mode)
    else:
        send_to_board = target in ["board", "both"]
    
    # Send to board if appropriate
    sent_to_board = False
    if send_to_board and not _dev_mode:
        # Check if we're in silence mode - absolute preference
        if Config.is_silence_mode_active():
            logger.info("Silence mode is active, skipping board update")
            sent_to_board = False
        else:
            # Use page-level transitions if set, otherwise fall back to system defaults
            system_transition = settings_service.get_transition_settings()
            strategy = page.transition_strategy if page.transition_strategy else system_transition.strategy
            interval_ms = page.transition_interval_ms if page.transition_interval_ms is not None else system_transition.step_interval_ms
            step_size = page.transition_step_size if page.transition_step_size is not None else system_transition.step_size
            
            # Convert to board array for proper character/color support
            board_array = text_to_board_array(result.formatted)
            success, was_sent = service.vb_client.send_characters(
                board_array,
                strategy=strategy,
                step_interval_ms=interval_ms,
                step_size=step_size
            )
            sent_to_board = was_sent
            if not success:
                raise HTTPException(status_code=500, detail="Failed to send to board")
    
    return {
        "status": "success",
        "page_id": page_id,
        "message": result.formatted,
        "sent_to_board": sent_to_board,
        "target": target or ("ui" if _dev_mode else settings_service.get_output_settings().target),
        "dev_mode": _dev_mode
    }


# =============================================================================
# Template Endpoints
# =============================================================================

@app.get("/templates/variables")
async def get_template_variables():
    """
    Get available template variables by source.
    
    Returns a dictionary mapping source names to available field names.
    Use these in templates as {{source.field}}, e.g., {{weather.temperature}}.
    Also includes max character lengths for validation.
    """
    template_engine = get_template_engine()
    return {
        "variables": template_engine.get_available_variables(),
        "max_lengths": template_engine.get_variable_max_lengths(),
        "colors": {
            "red": 63,
            "orange": 64,
            "yellow": 65,
            "green": 66,
            "blue": 67,
            "violet": 68,
            "white": 69,
            "black": 70,
        },
        "symbols": ["sun", "star", "cloud", "rain", "snow", "storm", "fog", "partly", "heart", "check", "x"],
        "filters": ["pad:N", "upper", "lower", "truncate:N", "capitalize", "wrap"],
        "formatting": {
            "fill_space": {
                "syntax": "{{fill_space}}",
                "description": "Expands to fill remaining space on the line. Use multiple for multi-column layouts."
            }
        },
        "syntax_examples": {
            "variable": "{{weather.temperature}}",
            "variable_with_filter": "{{weather.temperature|pad:3}}",
            "color_inline": "{{red}} Warning {{red}}",
            "color_code": "{63}",
            "symbol": "{sun}",
            "wrap": "{{star_trek.quote|wrap}}",
            "fill_space": "Left{{fill_space}}Right",
            "fill_space_three_columns": "A{{fill_space}}B{{fill_space}}C",
        }
    }


@app.post("/templates/validate")
async def validate_template(request: dict):
    """
    Validate template syntax.
    
    Body should include:
    - template: Template string or list of lines to validate
    
    Returns validation errors if any.
    """
    if "template" not in request:
        raise HTTPException(status_code=400, detail="template parameter required")
    
    template = request["template"]
    
    # Handle both string and list input
    if isinstance(template, list):
        template = '\n'.join(template)
    
    template_engine = get_template_engine()
    errors = template_engine.validate_template(template)
    
    return {
        "valid": len(errors) == 0,
        "errors": [
            {"line": e.line, "column": e.column, "message": e.message}
            for e in errors
        ]
    }


@app.post("/templates/render")
async def render_template(request: dict):
    """
    Render a template with current data.
    
    Body should include:
    - template: Template string or list of lines to render
    
    Useful for previewing template output before saving as a page.
    """
    if "template" not in request:
        raise HTTPException(status_code=400, detail="template parameter required")
    
    template = request["template"]
    
    template_engine = get_template_engine()
    
    try:
        if isinstance(template, list):
            rendered = template_engine.render_lines(template)
        else:
            rendered = template_engine.render(template)
        
        return {
            "rendered": rendered,
            "lines": rendered.split('\n'),
            "line_count": len(rendered.split('\n'))
        }
    except Exception as e:
        logger.error(f"Template rendering error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Template rendering failed: {str(e)}")


@app.get("/dev-mode")
async def get_dev_mode():
    """Get current dev mode status."""
    global _dev_mode
    return {"dev_mode": _dev_mode}


@app.post("/dev-mode")
async def set_dev_mode(request: dict):
    """Enable or disable dev mode (preview only, no actual sending)."""
    global _dev_mode
    if "dev_mode" in request:
        _dev_mode = bool(request["dev_mode"])
        logger.info(f"Dev mode {'enabled' if _dev_mode else 'disabled'}")
        return {
            "status": "success",
            "dev_mode": _dev_mode,
            "message": f"Dev mode {'enabled' if _dev_mode else 'disabled'}"
        }
    raise HTTPException(status_code=400, detail="dev_mode parameter required")


@app.get("/cache-status")
async def get_cache_status():
    """Get the current client-side cache status for the Vestaboard client."""
    service = get_service()
    if not service or not service.vb_client:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return service.vb_client.get_cache_status()


@app.post("/clear-cache")
async def clear_cache():
    """
    Clear the client-side message cache.
    
    This forces the next update to be sent to the Vestaboard, 
    even if the message content hasn't changed.
    """
    service = get_service()
    if not service or not service.vb_client:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    service.vb_client.clear_cache()
    return {"status": "success", "message": "Cache cleared - next update will be sent to board"}


@app.post("/force-refresh")
async def force_refresh():
    """
    Force a display refresh, ignoring the cache.
    
    Unlike /refresh, this will send to the Vestaboard even if the message 
    content hasn't changed. Useful when you want to resync the board.
    """
    global _dev_mode
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if _dev_mode:
        return {
            "status": "success", 
            "message": "Force refresh previewed (dev mode enabled - not sent to Vestaboard)",
            "dev_mode": True
        }
    
    # Clear cache to force send
    if service.vb_client:
        service.vb_client.clear_cache()
    
    try:
        service.fetch_and_display(dev_mode=False)
        return {"status": "success", "message": "Display force-refreshed successfully"}
    except Exception as e:
        logger.error(f"Error force-refreshing display: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to force refresh: {str(e)}")


# Legacy endpoints /preview and /publish-preview have been removed.
# Use /pages/{page_id}/preview and /pages/{page_id}/send instead.
# Set the active page with PUT /settings/active-page for automatic board updates.


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

