"""Main application entry point for Vestaboard Display Service."""

import logging
import sys
import time
import signal
from typing import Optional

import schedule

from .config import Config
from .vestaboard_client import VestaboardClient
from .text_to_board import text_to_board_array, format_board_array_preview
from .settings.service import get_settings_service
from .pages.service import get_page_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)


class VestaboardDisplayService:
    """Main service for displaying information on Vestaboard."""
    
    def __init__(self):
        """Initialize the display service."""
        self.running = True
        self.vb_client: Optional[VestaboardClient] = None
        
        # Active page polling state
        self._last_active_page_content: Optional[str] = None
        self._last_active_page_id: Optional[str] = None
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False
    
    def initialize(self) -> bool:
        """Initialize all components."""
        logger.info("Initializing Vestaboard Display Service...")
        
        # Validate configuration
        if not Config.validate():
            logger.error("Configuration validation failed")
            return False
        
        # Initialize Vestaboard client (Local or Cloud API)
        try:
            use_cloud = Config.VB_API_MODE.lower() == "cloud"
            self.vb_client = VestaboardClient(
                api_key=Config.get_vb_api_key(),
                host=Config.VB_HOST if not use_cloud else None,
                use_cloud=use_cloud,
                skip_unchanged=True  # Default: skip sending unchanged messages
            )
            # Sync cache with current board state to avoid unnecessary initial update
            logger.info("Syncing cache with current board state...")
            self.vb_client.read_current_message(sync_cache=True)
            
            # Log transition settings if configured
            transition = Config.get_transition_settings()
            if transition["strategy"]:
                logger.info(f"Default transition: {transition['strategy']} (interval={transition['step_interval_ms']}ms, step_size={transition['step_size']})")
        except Exception as e:
            logger.error(f"Failed to initialize Vestaboard client: {e}")
            return False
        
        # Log configuration summary
        summary = Config.get_summary()
        logger.info(f"Configuration: {summary}")
        
        return True
    
    def check_and_send_active_page(self, dev_mode: bool = False) -> bool:
        """Check the active page and send to board if content changed.
        
        Args:
            dev_mode: If True, don't actually send to board
            
        Returns:
            True if content was sent to board, False otherwise
        """
        try:
            settings_service = get_settings_service()
            page_service = get_page_service()
            
            active_page_id = settings_service.get_active_page_id()
            
            # No active page set - try to default to first page
            if not active_page_id:
                pages = page_service.list_pages()
                if pages:
                    active_page_id = pages[0].id
                    settings_service.set_active_page_id(active_page_id)
                    logger.info(f"No active page set, defaulting to first page: {active_page_id}")
                else:
                    logger.debug("No active page and no pages available")
                    return False
            
            # Get the page for transition settings
            page = page_service.get_page(active_page_id)
            if not page:
                logger.warning(f"Active page not found: {active_page_id}")
                return False
            
            # Render the page
            result = page_service.preview_page(active_page_id)
            if not result or not result.available:
                logger.warning(f"Failed to render active page: {active_page_id}")
                return False
            
            # Check if content changed
            current_content = result.formatted
            if (current_content == self._last_active_page_content and 
                active_page_id == self._last_active_page_id):
                logger.debug("Active page content unchanged, skipping send")
                return False
            
            # Content changed, send to board
            logger.info(f"Active page content changed, sending to board: {active_page_id}")
            
            # Check if we're in silence mode - absolute preference
            if Config.is_silence_mode_active():
                logger.info("Silence mode is active, skipping board update")
                # Still update our cache so we don't keep trying
                self._last_active_page_content = current_content
                self._last_active_page_id = active_page_id
                return False
            
            if dev_mode:
                logger.info("[DEV MODE] Would send active page (not actually sending)")
                self._last_active_page_content = current_content
                self._last_active_page_id = active_page_id
                return False
            
            if not self.vb_client:
                logger.warning("Vestaboard client not initialized")
                return False
            
            # Get transition settings - use page-level if set, otherwise system defaults
            system_transition = settings_service.get_transition_settings()
            strategy = page.transition_strategy if page.transition_strategy else system_transition.strategy
            interval_ms = page.transition_interval_ms if page.transition_interval_ms is not None else system_transition.step_interval_ms
            step_size = page.transition_step_size if page.transition_step_size is not None else system_transition.step_size
            
            # Send to board
            board_array = text_to_board_array(current_content)
            success, was_sent = self.vb_client.send_characters(
                board_array,
                strategy=strategy,
                step_interval_ms=interval_ms,
                step_size=step_size
            )
            
            if success:
                self._last_active_page_content = current_content
                self._last_active_page_id = active_page_id
                if was_sent:
                    logger.info(f"Active page sent to board: {active_page_id}")
                else:
                    logger.debug("Active page unchanged at board level")
                return was_sent
            else:
                logger.error(f"Failed to send active page to board: {active_page_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error checking active page: {e}")
            return False
    
    def run(self):
        """Run the main service loop."""
        if not self.initialize():
            logger.error("Initialization failed, exiting")
            sys.exit(1)
        
        # Schedule active page polling every 1 minute
        # This is the ONLY way content gets sent to the board - via configured pages
        schedule.every(1).minutes.do(lambda: self.check_and_send_active_page(dev_mode=False))
        logger.info("Active page polling scheduled every 1 minute")
        
        # Send initial active page on startup
        logger.info("Sending initial active page...")
        self.check_and_send_active_page(dev_mode=False)
        
        # Main loop
        logger.info("Service started, waiting for scheduled updates...")
        try:
            while self.running:
                schedule.run_pending()
                time.sleep(1)  # Check every second
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        finally:
            logger.info("Service stopped")


def main():
    """Main entry point."""
    service = VestaboardDisplayService()
    service.run()


if __name__ == "__main__":
    main()
