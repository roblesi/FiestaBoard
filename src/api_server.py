"""REST API server for Vestaboard Display Service."""

import logging
import threading
import time
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
from collections import deque
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .main import VestaboardDisplayService
from .config import Config
from .config_manager import get_config_manager
from .displays.service import get_display_service, DISPLAY_TYPES, DisplayResult
from .settings.service import get_settings_service, VALID_STRATEGIES, VALID_OUTPUT_TARGETS
from .pages.service import get_page_service
from .pages.models import PageCreate, PageUpdate
from .templates.engine import get_template_engine
from .rotations.service import get_rotation_service
from .rotations.models import RotationCreate, RotationUpdate
from .text_to_board import text_to_board_array

logger = logging.getLogger(__name__)

# Global service instance
_service: Optional[VestaboardDisplayService] = None
_service_lock = threading.Lock()
_service_thread: Optional[threading.Thread] = None
_service_running = False
_dev_mode = False  # When True, preview only - don't send to Vestaboard

# In-memory log buffer (last 200 log entries)
_log_buffer: deque = deque(maxlen=200)
_log_lock = threading.Lock()


class LogBufferHandler(logging.Handler):
    """Custom logging handler that stores logs in memory for API access."""
    
    def emit(self, record):
        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": self.format(record)
            }
            with _log_lock:
                _log_buffer.append(log_entry)
        except Exception:
            self.handleError(record)


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
    global _dev_mode
    logger.info("API server starting up...")
    
    # Auto-enable dev mode in local development (when not in production)
    # Check if we're in a development environment
    import os
    is_production = os.getenv("PRODUCTION", "false").lower() == "true"
    if not is_production:
        _dev_mode = True
        logger.info("Dev mode auto-enabled for local development")
    
    get_service()


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
async def get_logs(limit: int = 100):
    """Get recent application logs.
    
    Args:
        limit: Maximum number of log entries to return (default 100, max 200)
    
    Returns:
        List of log entries with timestamp, level, logger, and message
    """
    limit = min(limit, 200)  # Cap at buffer size
    with _log_lock:
        logs = list(_log_buffer)
    
    # Return most recent logs first
    return {
        "logs": logs[-limit:] if len(logs) > limit else logs,
        "total": len(logs)
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
    if page_id is not None:
        page = page_service.get_page(page_id)
        if not page:
            raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    # Set the active page
    settings_service.set_active_page_id(page_id)
    
    # Immediately send to board if a page is set
    sent_to_board = False
    if page_id and service and service.vb_client and not _dev_mode:
        result = page_service.preview_page(page_id)
        if result and result.available:
            transition = settings_service.get_transition_settings()
            board_array = text_to_board_array(result.formatted)
            success, was_sent = service.vb_client.send_characters(
                board_array,
                strategy=transition.strategy,
                step_interval_ms=transition.step_interval_ms,
                step_size=transition.step_size
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
    """Delete a page."""
    page_service = get_page_service()
    
    if not page_service.delete_page(page_id):
        raise HTTPException(status_code=404, detail=f"Page not found: {page_id}")
    
    return {"status": "success", "message": f"Page {page_id} deleted"}


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
        "syntax_examples": {
            "variable": "{{weather.temperature}}",
            "variable_with_filter": "{{weather.temperature|pad:3}}",
            "color_inline": "{red}Warning{/}",
            "color_code": "{63}",
            "symbol": "{sun}",
            "wrap": "{{star_trek.quote|wrap}}",
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


# =============================================================================
# Rotation Endpoints
# =============================================================================

@app.get("/rotations")
async def list_rotations():
    """List all rotation configurations."""
    rotation_service = get_rotation_service()
    rotations = rotation_service.list_rotations()
    active = rotation_service.get_active_rotation()
    
    return {
        "rotations": [r.model_dump() for r in rotations],
        "total": len(rotations),
        "active_rotation_id": active.id if active else None
    }


@app.post("/rotations")
async def create_rotation(rotation_data: RotationCreate):
    """
    Create a new rotation configuration.
    
    Rotations define sequences of pages to display with timing.
    """
    rotation_service = get_rotation_service()
    
    try:
        rotation = rotation_service.create_rotation(rotation_data)
        return {
            "status": "success",
            "rotation": rotation.model_dump()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/rotations/active")
async def get_active_rotation():
    """Get the currently active rotation and its state."""
    rotation_service = get_rotation_service()
    state = rotation_service.get_rotation_state()
    
    return state


@app.get("/rotations/{rotation_id}")
async def get_rotation(rotation_id: str):
    """Get a rotation by ID."""
    rotation_service = get_rotation_service()
    rotation = rotation_service.get_rotation(rotation_id)
    
    if not rotation:
        raise HTTPException(status_code=404, detail=f"Rotation not found: {rotation_id}")
    
    # Check for missing pages
    missing = rotation_service.validate_rotation_pages(rotation)
    
    return {
        **rotation.model_dump(),
        "missing_pages": missing
    }


@app.put("/rotations/{rotation_id}")
async def update_rotation(rotation_id: str, rotation_data: RotationUpdate):
    """Update an existing rotation."""
    rotation_service = get_rotation_service()
    
    try:
        rotation = rotation_service.update_rotation(rotation_id, rotation_data)
        if not rotation:
            raise HTTPException(status_code=404, detail=f"Rotation not found: {rotation_id}")
        
        return {
            "status": "success",
            "rotation": rotation.model_dump()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/rotations/{rotation_id}")
async def delete_rotation(rotation_id: str):
    """Delete a rotation."""
    rotation_service = get_rotation_service()
    
    if not rotation_service.delete_rotation(rotation_id):
        raise HTTPException(status_code=404, detail=f"Rotation not found: {rotation_id}")
    
    return {"status": "success", "message": f"Rotation {rotation_id} deleted"}


@app.post("/rotations/{rotation_id}/activate")
async def activate_rotation(rotation_id: str):
    """
    Activate a rotation.
    
    The active rotation determines which pages cycle on the Vestaboard.
    Validates that all pages in the rotation exist before activating.
    """
    rotation_service = get_rotation_service()
    
    try:
        if not rotation_service.activate_rotation(rotation_id):
            raise HTTPException(status_code=404, detail=f"Rotation not found: {rotation_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "status": "success",
        "message": f"Rotation {rotation_id} activated",
        "state": rotation_service.get_rotation_state()
    }


@app.post("/rotations/deactivate")
async def deactivate_rotation():
    """Deactivate the current rotation."""
    rotation_service = get_rotation_service()
    rotation_service.deactivate_rotation()
    
    return {
        "status": "success",
        "message": "Rotation deactivated"
    }


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

