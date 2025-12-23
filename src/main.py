"""Main application entry point for Vestaboard Display Service."""

import logging
import sys
import time
import signal
from typing import Optional

import schedule

from .config import Config
from .vestaboard_client import VestaboardClient
from .data_sources.weather import get_weather_source
from .data_sources.datetime import get_datetime_source
from .data_sources.apple_music import get_apple_music_source
from .data_sources.home_assistant import get_home_assistant_source
from .data_sources.star_trek_quotes import get_star_trek_quotes_source
from .formatters.message_formatter import get_message_formatter

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
        self.weather_source = None
        self.datetime_source = None
        self.apple_music_source = None
        self.home_assistant_source = None
        self.star_trek_quotes_source = None
        self.formatter = get_message_formatter()
        self.message_rotation_index = 0
        self.last_apple_music_check = 0.0
        self.last_home_assistant_check = 0.0
        self.last_rotation_change = 0.0
        self.current_rotation_screen = None
        
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
        
        # Initialize Vestaboard client
        try:
            self.vb_client = VestaboardClient(Config.VB_READ_WRITE_KEY)
            logger.info("Vestaboard client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Vestaboard client: {e}")
            return False
        
        # Initialize weather source
        self.weather_source = get_weather_source()
        if self.weather_source:
            logger.info(f"Weather source initialized ({Config.WEATHER_PROVIDER})")
        else:
            logger.warning("Weather source not available")
        
        # Initialize datetime source
        self.datetime_source = get_datetime_source()
        logger.info(f"DateTime source initialized (timezone: {Config.TIMEZONE})")
        
        # Initialize Apple Music source
        self.apple_music_source = get_apple_music_source()
        if self.apple_music_source:
            logger.info(f"Apple Music source initialized ({Config.APPLE_MUSIC_SERVICE_URL})")
        else:
            logger.info("Apple Music source not enabled or not available")
        
        # Initialize Star Trek quotes source
        self.star_trek_quotes_source = get_star_trek_quotes_source()
        if self.star_trek_quotes_source:
            logger.info(f"Star Trek quotes enabled (ratio: {Config.STAR_TREK_QUOTES_RATIO})")
        else:
            logger.info("Star Trek quotes disabled")
        
        # Log Guest WiFi status
        if Config.GUEST_WIFI_ENABLED:
            logger.info(f"Guest WiFi enabled (SSID: {Config.GUEST_WIFI_SSID})")
        else:
            logger.info("Guest WiFi disabled")
        
        # Initialize Home Assistant source
        self.home_assistant_source = get_home_assistant_source()
        if self.home_assistant_source:
            entities = Config.get_ha_entities()
            logger.info(f"Home Assistant source initialized ({Config.HOME_ASSISTANT_BASE_URL}, {len(entities)} entities)")
            # Test connection
            if self.home_assistant_source.test_connection():
                logger.info("Home Assistant connection test successful")
            else:
                logger.warning("Home Assistant connection test failed")
        else:
            logger.info("Home Assistant source not enabled or not available")
        
        # Log configuration summary
        summary = Config.get_summary()
        logger.info(f"Configuration: {summary}")
        
        return True
    
    def fetch_and_display(self, force_apple_music: bool = False):
        """
        Fetch data and display on Vestaboard.
        
        Priority order:
        1. Guest WiFi (highest priority - overrides everything)
        2. Apple Music (when playing)
        3. Rotation: Home Assistant, Star Trek Quotes, Weather/DateTime
        4. Weather + DateTime (default)
        
        Args:
            force_apple_music: If True, display Apple Music even if not in rotation
        """
        import time as time_module
        
        logger.info("Fetching data and updating display...")
        
        # PRIORITY 1: Guest WiFi (highest priority - check first)
        if Config.GUEST_WIFI_ENABLED:
            if Config.GUEST_WIFI_SSID and Config.GUEST_WIFI_PASSWORD:
                message = self.formatter.format_guest_wifi(
                    Config.GUEST_WIFI_SSID,
                    Config.GUEST_WIFI_PASSWORD
                )
                logger.info(f"Formatted message (Guest WiFi):\n{message}")
                
                if self.vb_client:
                    success = self.vb_client.send_text(message)
                    if success:
                        logger.info("Display updated with Guest WiFi")
                    else:
                        logger.error("Failed to update display with Guest WiFi")
                return  # Guest WiFi overrides everything else
        
        # Get current time (used throughout)
        current_time = time_module.time()
        
        # Check Home Assistant status (if enabled)
        check_home_assistant = (
            self.home_assistant_source and
            current_time - self.last_home_assistant_check >= Config.HOME_ASSISTANT_REFRESH_SECONDS
        )
        
        # Fetch Home Assistant data (if it's time)
        home_assistant_data = None
        if check_home_assistant and self.home_assistant_source:
            try:
                entities = Config.get_ha_entities()
                home_assistant_data = self.home_assistant_source.get_house_status(entities)
                self.last_home_assistant_check = current_time
                if home_assistant_data:
                    logger.debug(f"Home Assistant data: {list(home_assistant_data.keys())}")
            except Exception as e:
                logger.error(f"Error fetching Home Assistant data: {e}")
        
        # Check Apple Music more frequently (if enabled)
        check_apple_music = (
            force_apple_music or
            (self.apple_music_source and 
             current_time - self.last_apple_music_check >= Config.APPLE_MUSIC_REFRESH_SECONDS)
        )
        
        # Fetch Apple Music data (if it's time or forced)
        apple_music_data = None
        if check_apple_music and self.apple_music_source:
            try:
                apple_music_data = self.apple_music_source.fetch_now_playing()
                self.last_apple_music_check = current_time
                if apple_music_data:
                    logger.debug(f"Apple Music data: {apple_music_data}")
            except Exception as e:
                logger.error(f"Error fetching Apple Music: {e}")
        
        # PRIORITY 2: Apple Music (when playing)
        if apple_music_data and not force_apple_music:
            message = self.formatter.format_apple_music(apple_music_data)
            logger.info(f"Formatted message (Apple Music):\n{message}")
            
            if self.vb_client:
                success = self.vb_client.send_text(message)
                if success:
                    logger.info("Display updated with Apple Music")
                else:
                    logger.error("Failed to update display")
            return
        
        # PRIORITY 3: Rotate between Home Assistant, Star Trek, and Weather/DateTime
        # Use time-based rotation if enabled, otherwise use simple alternation
        
        # Determine which screen to show based on rotation configuration
        rotation_screen = self._get_rotation_screen(
            current_time,
            home_assistant_data is not None,
            self.star_trek_quotes_source is not None
        )
        
        # Show Star Trek quote if it's time
        if rotation_screen == "star_trek" and self.star_trek_quotes_source:
            try:
                quote_data = self.star_trek_quotes_source.get_random_quote()
                if quote_data:
                    message = self.formatter.format_star_trek_quote(quote_data)
                    logger.info(f"Formatted message (Star Trek - {quote_data['series'].upper()}):\n{message}")
                    
                    if self.vb_client:
                        success = self.vb_client.send_text(message)
                        if success:
                            logger.info("Display updated with Star Trek quote")
                            self.current_rotation_screen = "star_trek"
                            self.last_rotation_change = current_time
                        else:
                            logger.error("Failed to update display")
                    return
            except Exception as e:
                logger.error(f"Error displaying Star Trek quote: {e}")
        
        # Show Home Assistant if it's time
        if rotation_screen == "home_assistant" and home_assistant_data:
            message = self.formatter.format_house_status(home_assistant_data)
            logger.info(f"Formatted message (House Status):\n{message}")
            
            if self.vb_client:
                success = self.vb_client.send_text(message)
                if success:
                    logger.info("Display updated with House Status")
                    self.current_rotation_screen = "home_assistant"
                    self.last_rotation_change = current_time
                else:
                    logger.error("Failed to update display")
            return
        
        # PRIORITY 4: Weather + DateTime (normal rotation or when it's time)
        if rotation_screen == "weather" or not Config.ROTATION_ENABLED:
            # Fetch weather data
            weather_data = None
            if self.weather_source:
                try:
                    weather_data = self.weather_source.fetch_current_weather()
                    if weather_data:
                        logger.debug(f"Weather data: {weather_data}")
                    else:
                        logger.warning("Failed to fetch weather data")
                except Exception as e:
                    logger.error(f"Error fetching weather: {e}")
            
            # Fetch datetime data
            datetime_data = None
            if self.datetime_source:
                try:
                    datetime_data = self.datetime_source.get_current_datetime()
                    logger.debug(f"DateTime data: {datetime_data}")
                except Exception as e:
                    logger.error(f"Error fetching datetime: {e}")
            
            # Format and display combined message
            if weather_data or datetime_data:
                message = self.formatter.format_combined(weather_data, datetime_data)
                logger.info(f"Formatted message:\n{message}")
                
                # Send to Vestaboard
                if self.vb_client:
                    success = self.vb_client.send_text(message)
                    if success:
                        logger.info("Display updated successfully")
                        self.current_rotation_screen = "weather"
                        self.last_rotation_change = current_time
                    else:
                        logger.error("Failed to update display")
                else:
                    logger.error("Vestaboard client not initialized")
            else:
                logger.warning("No data available to display")
    
    def _get_rotation_screen(self, current_time: float, ha_available: bool, star_trek_available: bool) -> str:
        """
        Determine which screen to show based on rotation configuration.
        
        Args:
            current_time: Current timestamp
            ha_available: Whether Home Assistant data is available
            star_trek_available: Whether Star Trek quotes are available
            
        Returns:
            Screen name: "home_assistant", "star_trek", or "weather"
        """
        if not Config.ROTATION_ENABLED:
            # Rotation disabled - always show weather
            return "weather"
        
        # Parse rotation order
        rotation_order = [s.strip() for s in Config.ROTATION_ORDER.split(",")]
        
        # Filter to only enabled screens
        available_screens = []
        if "weather" in rotation_order:
            available_screens.append("weather")
        if "home_assistant" in rotation_order and ha_available:
            available_screens.append("home_assistant")
        if "star_trek" in rotation_order and star_trek_available:
            available_screens.append("star_trek")
        
        if not available_screens:
            # Fallback to weather if nothing available
            return "weather"
        
        if len(available_screens) == 1:
            # Only one screen available, show it
            return available_screens[0]
        
        # Time-based rotation
        # Calculate total rotation cycle time
        total_duration = 0
        screen_durations = {}
        
        if "weather" in available_screens:
            weather_duration = Config.ROTATION_WEATHER_DURATION
            screen_durations["weather"] = weather_duration
            total_duration += weather_duration
        
        if "home_assistant" in available_screens:
            ha_duration = Config.ROTATION_HOME_ASSISTANT_DURATION
            screen_durations["home_assistant"] = ha_duration
            total_duration += ha_duration
        
        if "star_trek" in available_screens:
            st_duration = Config.ROTATION_STAR_TREK_DURATION
            screen_durations["star_trek"] = st_duration
            total_duration += st_duration
        
        if total_duration == 0:
            return "weather"  # Fallback
        
        # Calculate time since last rotation change (or start)
        if self.last_rotation_change == 0:
            # First time, start with first screen
            self.last_rotation_change = current_time
            return available_screens[0]
        
        elapsed = current_time - self.last_rotation_change
        
        # Determine which screen based on elapsed time
        current_pos = 0
        for screen in available_screens:
            duration = screen_durations.get(screen, 300)  # Default 5 min
            if elapsed < current_pos + duration:
                return screen
            current_pos += duration
        
        # Cycle complete, restart
        self.last_rotation_change = current_time
        return available_screens[0]
    
    def run(self):
        """Run the main service loop."""
        if not self.initialize():
            logger.error("Initialization failed, exiting")
            sys.exit(1)
        
        # Send initial update
        logger.info("Sending initial update...")
        self.fetch_and_display()
        
        # Schedule periodic updates
        interval_minutes = Config.REFRESH_INTERVAL_SECONDS / 60
        schedule.every(interval_minutes).minutes.do(self.fetch_and_display)
        logger.info(f"Scheduled updates every {interval_minutes} minutes")
        
        # Schedule Apple Music checks more frequently (if enabled)
        if self.apple_music_source:
            apple_music_interval = Config.APPLE_MUSIC_REFRESH_SECONDS
            schedule.every(apple_music_interval).seconds.do(
                lambda: self.fetch_and_display(force_apple_music=False)
            )
            logger.info(f"Apple Music checks every {apple_music_interval} seconds")
        
        # Schedule Guest WiFi refresh (if enabled)
        if Config.GUEST_WIFI_ENABLED:
            guest_wifi_interval = Config.GUEST_WIFI_REFRESH_SECONDS
            schedule.every(guest_wifi_interval).seconds.do(self.fetch_and_display)
            logger.info(f"Guest WiFi refresh every {guest_wifi_interval} seconds")
        
        # Schedule Home Assistant checks (if enabled)
        if self.home_assistant_source:
            ha_interval = Config.HOME_ASSISTANT_REFRESH_SECONDS
            schedule.every(ha_interval).seconds.do(self.fetch_and_display)
            logger.info(f"Home Assistant checks every {ha_interval} seconds")
        
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

