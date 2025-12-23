"""Weather data source using WeatherAPI.com or OpenWeatherMap."""

import logging
import requests
from typing import Optional, Dict
from ..config import Config

logger = logging.getLogger(__name__)


class WeatherSource:
    """Fetches current weather data from weather APIs."""
    
    def __init__(self, provider: str, api_key: str, location: str):
        """
        Initialize weather source.
        
        Args:
            provider: "weatherapi" or "openweathermap"
            api_key: API key for the weather service
            location: Location string (city name or lat/lon)
        """
        self.provider = provider
        self.api_key = api_key
        self.location = location
    
    def fetch_current_weather(self) -> Optional[Dict[str, any]]:
        """
        Fetch current weather data.
        
        Returns:
            Dictionary with weather data, or None if failed
        """
        if self.provider == "weatherapi":
            return self._fetch_weatherapi()
        elif self.provider == "openweathermap":
            return self._fetch_openweathermap()
        else:
            logger.error(f"Unknown weather provider: {self.provider}")
            return None
    
    def _fetch_weatherapi(self) -> Optional[Dict[str, any]]:
        """Fetch weather from WeatherAPI.com."""
        url = "http://api.weatherapi.com/v1/current.json"
        params = {
            "key": self.api_key,
            "q": self.location,
            "aqi": "no"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            return {
                "temperature": data["current"]["temp_f"],
                "feels_like": data["current"]["feelslike_f"],
                "condition": data["current"]["condition"]["text"],
                "humidity": data["current"]["humidity"],
                "wind_mph": data["current"]["wind_mph"],
                "location": data["location"]["name"]
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch weather from WeatherAPI: {e}")
            return None
        except KeyError as e:
            logger.error(f"Unexpected response format from WeatherAPI: {e}")
            return None
    
    def _fetch_openweathermap(self) -> Optional[Dict[str, any]]:
        """Fetch weather from OpenWeatherMap."""
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "q": self.location,
            "appid": self.api_key,
            "units": "imperial"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            return {
                "temperature": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "condition": data["weather"][0]["main"],
                "description": data["weather"][0]["description"],
                "humidity": data["main"]["humidity"],
                "wind_mph": data["wind"]["speed"]
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch weather from OpenWeatherMap: {e}")
            return None
        except KeyError as e:
            logger.error(f"Unexpected response format from OpenWeatherMap: {e}")
            return None


def get_weather_source() -> Optional[WeatherSource]:
    """Get configured weather source instance."""
    if not Config.WEATHER_API_KEY:
        logger.warning("Weather API key not configured")
        return None
    
    return WeatherSource(
        provider=Config.WEATHER_PROVIDER,
        api_key=Config.WEATHER_API_KEY,
        location=Config.WEATHER_LOCATION
    )

