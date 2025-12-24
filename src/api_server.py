"""REST API server for Vestaboard Display Service."""

import logging
import threading
import time
from typing import Optional, Dict, Any
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .main import VestaboardDisplayService
from .config import Config

logger = logging.getLogger(__name__)

# Global service instance
_service: Optional[VestaboardDisplayService] = None
_service_lock = threading.Lock()
_service_thread: Optional[threading.Thread] = None
_service_running = False
_dev_mode = False  # When True, preview only - don't send to Vestaboard


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


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Get current service status."""
    global _dev_mode
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    status = StatusResponse(
        running=_service_running,
        initialized=service is not None,
        config_summary=Config.get_summary()
    )
    # Add dev mode to config summary for UI
    status.config_summary["dev_mode"] = _dev_mode
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
        success = service.vb_client.send_text(request.text)
        if success:
            return {"status": "success", "message": "Message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send message")
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@app.get("/config")
async def get_config():
    """Get current configuration (without sensitive keys)."""
    return Config.get_summary()


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


@app.post("/publish-preview")
async def publish_preview():
    """
    Publish the current preview to the actual Vestaboard.
    This bypasses dev mode and sends the message.
    """
    global _dev_mode
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not service.vb_client:
        raise HTTPException(status_code=503, detail="Vestaboard client not initialized")
    
    try:
        # Get the preview message by calling the preview logic directly
        import time as time_module
        current_time = time_module.time()
        
        # Check Home Assistant status (if enabled)
        check_home_assistant = (
            service.home_assistant_source and
            current_time - service.last_home_assistant_check >= Config.HOME_ASSISTANT_REFRESH_SECONDS
        )
        
        # Fetch Home Assistant data (if it's time)
        home_assistant_data = None
        if check_home_assistant and service.home_assistant_source:
            try:
                entities = Config.get_ha_entities()
                home_assistant_data = service.home_assistant_source.get_house_status(entities)
            except Exception as e:
                logger.error(f"Error fetching Home Assistant data: {e}")
        
        # Check Apple Music
        check_apple_music = (
            service.apple_music_source and 
            current_time - service.last_apple_music_check >= Config.APPLE_MUSIC_REFRESH_SECONDS
        )
        
        apple_music_data = None
        if check_apple_music and service.apple_music_source:
            try:
                apple_music_data = service.apple_music_source.fetch_now_playing()
            except Exception as e:
                logger.error(f"Error fetching Apple Music: {e}")
        
        # Determine what would be displayed (following priority)
        message = None
        
        # PRIORITY 1: Guest WiFi
        if Config.GUEST_WIFI_ENABLED:
            if Config.GUEST_WIFI_SSID and Config.GUEST_WIFI_PASSWORD:
                message = service.formatter.format_guest_wifi(
                    Config.GUEST_WIFI_SSID,
                    Config.GUEST_WIFI_PASSWORD
                )
        
        # PRIORITY 2: Apple Music (when playing)
        elif apple_music_data and apple_music_data.get("playing"):
            message = service.formatter.format_apple_music(apple_music_data)
        
        # PRIORITY 3: Rotation
        else:
            rotation_screen = service._get_rotation_screen(
                current_time,
                home_assistant_data is not None,
                service.star_trek_quotes_source is not None
            )
            
            if rotation_screen == "star_trek" and service.star_trek_quotes_source:
                try:
                    quote_data = service.star_trek_quotes_source.get_random_quote()
                    if quote_data:
                        message = service.formatter.format_star_trek_quote(quote_data)
                except Exception as e:
                    logger.error(f"Error getting Star Trek quote: {e}")
            
            elif rotation_screen == "home_assistant" and home_assistant_data:
                message = service.formatter.format_house_status(home_assistant_data)
            
            elif rotation_screen == "weather" or not Config.ROTATION_ENABLED:
                # Fetch weather data
                weather_data = None
                if service.weather_source:
                    try:
                        weather_data = service.weather_source.fetch_current_weather()
                    except Exception as e:
                        logger.error(f"Error fetching weather: {e}")
                
                # Fetch datetime data
                datetime_data = None
                if service.datetime_source:
                    try:
                        datetime_data = service.datetime_source.get_current_datetime()
                    except Exception as e:
                        logger.error(f"Error fetching datetime: {e}")
                
                if weather_data or datetime_data:
                    message = service.formatter.format_combined(weather_data, datetime_data)
        
        if not message:
            raise HTTPException(status_code=400, detail="No message available to publish")
        
        # Temporarily disable dev mode to send
        old_dev_mode = _dev_mode
        _dev_mode = False
        
        try:
            success = service.vb_client.send_text(message)
            if success:
                logger.info(f"Preview published to Vestaboard: {message[:50]}...")
                return {
                    "status": "success",
                    "message": "Preview published to Vestaboard successfully",
                    "preview_message": message
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to publish to Vestaboard")
        finally:
            _dev_mode = old_dev_mode  # Restore dev mode state
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing preview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to publish preview: {str(e)}")


@app.get("/preview")
async def preview_message():
    """
    Preview what would be sent to the Vestaboard without actually sending it.
    Perfect for development/testing!
    """
    service = get_service()
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        import time as time_module
        
        # Get current time
        current_time = time_module.time()
        
        # Check Home Assistant status (if enabled)
        check_home_assistant = (
            service.home_assistant_source and
            current_time - service.last_home_assistant_check >= Config.HOME_ASSISTANT_REFRESH_SECONDS
        )
        
        # Fetch Home Assistant data (if it's time)
        home_assistant_data = None
        if check_home_assistant and service.home_assistant_source:
            try:
                entities = Config.get_ha_entities()
                home_assistant_data = service.home_assistant_source.get_house_status(entities)
                if home_assistant_data:
                    logger.debug(f"Home Assistant data: {list(home_assistant_data.keys())}")
            except Exception as e:
                logger.error(f"Error fetching Home Assistant data: {e}")
        
        # Check Apple Music
        check_apple_music = (
            service.apple_music_source and 
            current_time - service.last_apple_music_check >= Config.APPLE_MUSIC_REFRESH_SECONDS
        )
        
        apple_music_data = None
        if check_apple_music and service.apple_music_source:
            try:
                apple_music_data = service.apple_music_source.fetch_now_playing()
                if apple_music_data:
                    logger.debug(f"Apple Music data: {apple_music_data}")
            except Exception as e:
                logger.error(f"Error fetching Apple Music: {e}")
        
        # Determine what would be displayed (following priority)
        message = None
        display_type = "unknown"
        
        # PRIORITY 1: Guest WiFi
        if Config.GUEST_WIFI_ENABLED:
            if Config.GUEST_WIFI_SSID and Config.GUEST_WIFI_PASSWORD:
                message = service.formatter.format_guest_wifi(
                    Config.GUEST_WIFI_SSID,
                    Config.GUEST_WIFI_PASSWORD
                )
                display_type = "guest_wifi"
        
        # PRIORITY 2: Apple Music (when playing)
        elif apple_music_data and apple_music_data.get("playing"):
            message = service.formatter.format_apple_music(apple_music_data)
            display_type = "apple_music"
        
        # PRIORITY 3: Rotation
        else:
            rotation_screen = service._get_rotation_screen(
                current_time,
                home_assistant_data is not None,
                service.star_trek_quotes_source is not None
            )
            
            if rotation_screen == "star_trek" and service.star_trek_quotes_source:
                try:
                    quote_data = service.star_trek_quotes_source.get_random_quote()
                    if quote_data:
                        message = service.formatter.format_star_trek_quote(quote_data)
                        display_type = "star_trek"
                except Exception as e:
                    logger.error(f"Error getting Star Trek quote: {e}")
            
            elif rotation_screen == "home_assistant" and home_assistant_data:
                message = service.formatter.format_house_status(home_assistant_data)
                display_type = "home_assistant"
            
            elif rotation_screen == "weather" or not Config.ROTATION_ENABLED:
                # Fetch weather data
                weather_data = None
                if service.weather_source:
                    try:
                        weather_data = service.weather_source.fetch_current_weather()
                    except Exception as e:
                        logger.error(f"Error fetching weather: {e}")
                
                # Fetch datetime data
                datetime_data = None
                if service.datetime_source:
                    try:
                        datetime_data = service.datetime_source.get_current_datetime()
                    except Exception as e:
                        logger.error(f"Error fetching datetime: {e}")
                
                if weather_data or datetime_data:
                    message = service.formatter.format_combined(weather_data, datetime_data)
                    display_type = "weather_datetime"
        
        if not message:
            message = "No data available to display"
            display_type = "empty"
        
        # Split message into lines for display
        lines = message.split('\n')
        
        return {
            "message": message,
            "lines": lines,
            "display_type": display_type,
            "line_count": len(lines),
            "preview": True
        }
        
    except Exception as e:
        logger.error(f"Error generating preview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

