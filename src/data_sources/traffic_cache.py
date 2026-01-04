"""Traffic Data Cache Service for reducing API calls.

This module provides a singleton cache service that caches traffic/routing data
to minimize API calls and reduce costs. Instead of querying the API every time,
it caches route data for a configurable TTL (default 300s / 5 minutes).

The cache supports multiple providers (Google Routes API, HERE Routing API, etc.)
and automatically refreshes data in the background.
"""

import logging
import threading
import time
import hashlib
from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class TrafficCache:
    """Singleton service that caches traffic/routing data."""
    
    _instance: Optional["TrafficCache"] = None
    _lock = threading.Lock()
    
    # Cache configuration (defaults, can be overridden)
    DEFAULT_TTL = 300  # 5 minutes in seconds
    STALE_WARNING_THRESHOLD = 600  # 10 minutes - warn if cache entry is this old
    MAX_CACHE_SIZE = 100  # Maximum number of routes to cache
    
    def __new__(cls) -> "TrafficCache":
        """Singleton pattern to ensure only one cache instance exists."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the traffic cache (only runs once due to singleton)."""
        if self._initialized:
            return
        
        # Thread safety
        self._data_lock = threading.RLock()
        
        # Cache storage: route_key -> CachedRoute
        self._cache: Dict[str, "CachedRoute"] = {}
        
        # Statistics
        self._cache_hits: int = 0
        self._cache_misses: int = 0
        self._api_calls: int = 0
        self._error_count: int = 0
        
        # Configuration
        self._ttl: int = self.DEFAULT_TTL
        self._enabled: bool = True
        
        # Background refresh thread
        self._refresh_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        self._initialized = True
        logger.info("TrafficCache initialized")
    
    def configure(self, ttl: int = DEFAULT_TTL, enabled: bool = True):
        """
        Configure the cache with settings.
        
        Args:
            ttl: Time-to-live in seconds (default 300)
            enabled: Whether cache is enabled (default True)
        """
        with self._data_lock:
            self._ttl = ttl
            self._enabled = enabled
            logger.info(f"TrafficCache configured: enabled={enabled}, ttl={ttl}s")
    
    def start(self):
        """Start the background cleanup thread."""
        if not self._enabled:
            logger.warning("TrafficCache not started - disabled in configuration")
            return
        
        with self._lock:
            if self._refresh_thread is not None and self._refresh_thread.is_alive():
                logger.warning("TrafficCache cleanup thread already running")
                return
            
            logger.info("Starting TrafficCache cleanup thread")
            self._stop_event.clear()
            self._refresh_thread = threading.Thread(
                target=self._cleanup_loop,
                daemon=True,
                name="TrafficCache-Cleanup"
            )
            self._refresh_thread.start()
    
    def stop(self):
        """Stop the background cleanup thread."""
        logger.info("Stopping TrafficCache cleanup thread")
        self._stop_event.set()
        if self._refresh_thread:
            self._refresh_thread.join(timeout=5)
    
    def _cleanup_loop(self):
        """Background thread that cleans up expired cache entries."""
        logger.info("TrafficCache cleanup loop started")
        
        while not self._stop_event.is_set():
            try:
                self._cleanup_expired()
            except Exception as e:
                logger.error(f"Error in TrafficCache cleanup loop: {e}", exc_info=True)
            
            # Wait for cleanup interval (run every minute)
            self._stop_event.wait(60)
        
        logger.info("TrafficCache cleanup loop stopped")
    
    def _cleanup_expired(self):
        """Remove expired entries from cache."""
        with self._data_lock:
            now = time.time()
            expired_keys = [
                key for key, cached_route in self._cache.items()
                if now - cached_route.cached_at > self._ttl
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
            
            # Enforce max cache size (LRU-style eviction)
            if len(self._cache) > self.MAX_CACHE_SIZE:
                # Sort by cached_at and remove oldest
                sorted_items = sorted(
                    self._cache.items(),
                    key=lambda x: x[1].cached_at
                )
                to_remove = sorted_items[:len(self._cache) - self.MAX_CACHE_SIZE]
                for key, _ in to_remove:
                    del self._cache[key]
                logger.debug(f"Evicted {len(to_remove)} old cache entries (max size: {self.MAX_CACHE_SIZE})")
    
    @staticmethod
    def _make_route_key(origin: str, destination: str, travel_mode: str, provider: str = "google") -> str:
        """
        Create a unique cache key for a route.
        
        Args:
            origin: Origin address or coordinates
            destination: Destination address or coordinates
            travel_mode: Travel mode (DRIVE, BICYCLE, etc.)
            provider: API provider (google, here, etc.)
            
        Returns:
            Unique cache key string
        """
        # Normalize inputs
        origin = origin.strip().lower()
        destination = destination.strip().lower()
        travel_mode = travel_mode.strip().upper()
        provider = provider.strip().lower()
        
        # Create a hash to keep key size reasonable
        key_str = f"{provider}:{origin}:{destination}:{travel_mode}"
        key_hash = hashlib.md5(key_str.encode()).hexdigest()[:16]
        
        return f"{provider}_{travel_mode}_{key_hash}"
    
    def get(
        self,
        origin: str,
        destination: str,
        travel_mode: str = "DRIVE",
        provider: str = "google"
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached route data if available and not expired.
        
        Args:
            origin: Origin address or coordinates
            destination: Destination address or coordinates
            travel_mode: Travel mode (DRIVE, BICYCLE, etc.)
            provider: API provider (google, here, etc.)
            
        Returns:
            Cached route data dict, or None if not in cache or expired
        """
        if not self._enabled:
            with self._data_lock:
                self._cache_misses += 1
            return None
        
        route_key = self._make_route_key(origin, destination, travel_mode, provider)
        
        with self._data_lock:
            cached_route = self._cache.get(route_key)
            
            if cached_route is None:
                self._cache_misses += 1
                logger.debug(f"Cache MISS: {route_key}")
                return None
            
            # Check if expired
            age = time.time() - cached_route.cached_at
            if age > self._ttl:
                self._cache_misses += 1
                logger.debug(f"Cache EXPIRED: {route_key} (age: {age:.0f}s)")
                # Remove expired entry
                del self._cache[route_key]
                return None
            
            # Cache hit
            self._cache_hits += 1
            logger.debug(f"Cache HIT: {route_key} (age: {age:.0f}s)")
            
            # Warn if stale (but still valid)
            if age > self.STALE_WARNING_THRESHOLD:
                logger.warning(f"Cache entry is stale but valid: {route_key} (age: {age:.0f}s)")
            
            return cached_route.data
    
    def set(
        self,
        origin: str,
        destination: str,
        travel_mode: str,
        provider: str,
        data: Dict[str, Any]
    ):
        """
        Store route data in cache.
        
        Args:
            origin: Origin address or coordinates
            destination: Destination address or coordinates
            travel_mode: Travel mode (DRIVE, BICYCLE, etc.)
            provider: API provider (google, here, etc.)
            data: Route data to cache
        """
        if not self._enabled:
            return
        
        route_key = self._make_route_key(origin, destination, travel_mode, provider)
        
        with self._data_lock:
            self._cache[route_key] = CachedRoute(
                route_key=route_key,
                origin=origin,
                destination=destination,
                travel_mode=travel_mode,
                provider=provider,
                data=data,
                cached_at=time.time()
            )
            self._api_calls += 1
            logger.debug(f"Cached route: {route_key}")
    
    def invalidate(self, origin: str, destination: str, travel_mode: str = None, provider: str = None):
        """
        Invalidate (remove) cached route data.
        
        Args:
            origin: Origin address or coordinates
            destination: Destination address or coordinates
            travel_mode: Optional travel mode filter (invalidates all modes if None)
            provider: Optional provider filter (invalidates all providers if None)
        """
        with self._data_lock:
            keys_to_remove = []
            
            for key, cached_route in self._cache.items():
                if (cached_route.origin.lower() == origin.lower() and
                    cached_route.destination.lower() == destination.lower()):
                    
                    # Filter by travel_mode if specified
                    if travel_mode and cached_route.travel_mode != travel_mode.upper():
                        continue
                    
                    # Filter by provider if specified
                    if provider and cached_route.provider != provider.lower():
                        continue
                    
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._cache[key]
            
            if keys_to_remove:
                logger.info(f"Invalidated {len(keys_to_remove)} cache entries")
    
    def clear(self):
        """Clear all cached data."""
        with self._data_lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"Cleared {count} cache entries")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get cache status and statistics.
        
        Returns:
            Dictionary with cache status information
        """
        with self._data_lock:
            total_requests = self._cache_hits + self._cache_misses
            hit_rate = (self._cache_hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "enabled": self._enabled,
                "ttl_seconds": self._ttl,
                "cache_size": len(self._cache),
                "max_cache_size": self.MAX_CACHE_SIZE,
                "cache_hits": self._cache_hits,
                "cache_misses": self._cache_misses,
                "hit_rate_percent": round(hit_rate, 1),
                "api_calls_made": self._api_calls,
                "error_count": self._error_count,
                "thread_alive": self._refresh_thread.is_alive() if self._refresh_thread else False,
            }
    
    def increment_error_count(self):
        """Increment the error count (called when API call fails)."""
        with self._data_lock:
            self._error_count += 1
    
    def is_ready(self) -> bool:
        """
        Check if cache is operational.
        
        Returns:
            True if cache is enabled and ready to use
        """
        return self._enabled


class CachedRoute:
    """Represents a cached route entry."""
    
    def __init__(
        self,
        route_key: str,
        origin: str,
        destination: str,
        travel_mode: str,
        provider: str,
        data: Dict[str, Any],
        cached_at: float
    ):
        self.route_key = route_key
        self.origin = origin
        self.destination = destination
        self.travel_mode = travel_mode
        self.provider = provider
        self.data = data
        self.cached_at = cached_at


# Global singleton instance getter
_cache_instance: Optional[TrafficCache] = None


def get_traffic_cache() -> TrafficCache:
    """Get the singleton TrafficCache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = TrafficCache()
    return _cache_instance

