"""Vestaboard character codes and symbol mappings.

Vestaboard uses numeric character codes (0-63) to represent different characters.
This module provides mappings for common characters and symbols that can be used
for weather icons and other visual elements.

Note: Character codes are based on Vestaboard's 64-character set. Some codes
may need to be verified against the official documentation.
"""

from typing import Dict, Optional, List


class VestaboardChars:
    """Vestaboard character code mappings."""
    
    # Basic characters (standard ASCII-like mapping)
    # These are the most common character codes
    SPACE = 0
    A = 1
    B = 2
    C = 3
    D = 4
    E = 5
    F = 6
    G = 7
    H = 8
    I = 9
    J = 10
    K = 11
    L = 12
    M = 13
    N = 14
    O = 15
    P = 16
    Q = 17
    R = 18
    S = 19
    T = 20
    U = 21
    V = 22
    W = 23
    X = 24
    Y = 25
    Z = 26
    
    # Numbers
    ZERO = 27
    ONE = 28
    TWO = 29
    THREE = 30
    FOUR = 31
    FIVE = 32
    SIX = 33
    SEVEN = 34
    EIGHT = 35
    NINE = 36
    
    # Punctuation and symbols (approximate mappings)
    PERIOD = 37      # .
    COMMA = 38       # ,
    APOSTROPHE = 39  # '
    EXCLAMATION = 40 # !
    QUESTION = 41    # ?
    COLON = 42       # :
    SEMICOLON = 43   # ;
    DASH = 44        # -
    SLASH = 45       # /
    PLUS = 46        # +
    EQUALS = 47      # =
    ASTERISK = 48    # *
    PERCENT = 49     # %
    POUND = 50       # #
    AMPERSAND = 51   # &
    AT = 52          # @
    DOLLAR = 53      # $
    
    # Additional symbols (may vary - these are common patterns)
    # Note: Actual codes may differ - verify with Vestaboard docs
    DEGREE = 54      # ° (if available, otherwise use 'O')
    
    # Weather-related symbol approximations using available characters
    # Since true icons aren't available, we use creative character combinations
    WEATHER_SUN = ASTERISK      # * for sun
    WEATHER_CLOUD = O           # O for cloud (can be styled)
    WEATHER_RAIN = SLASH       # / for rain
    WEATHER_SNOW = ASTERISK     # * for snow (or use different char)
    WEATHER_STORM = EXCLAMATION # ! for storm
    WEATHER_PARTLY = PERCENT    # % for partly cloudy
    
    @classmethod
    def get_char_code(cls, char: str) -> Optional[int]:
        """
        Get character code for a single character.
        
        Args:
            char: Single character to convert
            
        Returns:
            Character code (0-63) or None if not found
        """
        char = char.upper()
        
        # Letters
        if 'A' <= char <= 'Z':
            return ord(char) - ord('A') + 1
        
        # Numbers
        if '0' <= char <= '9':
            return ord(char) - ord('0') + 27
        
        # Special characters mapping
        special_map = {
            ' ': cls.SPACE,
            '.': cls.PERIOD,
            ',': cls.COMMA,
            "'": cls.APOSTROPHE,
            '!': cls.EXCLAMATION,
            '?': cls.QUESTION,
            ':': cls.COLON,
            ';': cls.SEMICOLON,
            '-': cls.DASH,
            '/': cls.SLASH,
            '+': cls.PLUS,
            '=': cls.EQUALS,
            '*': cls.ASTERISK,
            '%': cls.PERCENT,
            '#': cls.POUND,
            '&': cls.AMPERSAND,
            '@': cls.AT,
            '$': cls.DOLLAR,
            '°': cls.DEGREE if hasattr(cls, 'DEGREE') else ord('O') - ord('A') + 1,
        }
        
        return special_map.get(char)
    
    @classmethod
    def text_to_codes(cls, text: str) -> List[int]:
        """
        Convert text string to list of character codes.
        
        Args:
            text: Text string to convert
            
        Returns:
            List of character codes
        """
        codes = []
        for char in text:
            code = cls.get_char_code(char)
            if code is not None:
                codes.append(code)
            else:
                # Fallback to space if character not found
                codes.append(cls.SPACE)
        return codes


# Weather condition to symbol mapping
WEATHER_SYMBOLS: Dict[str, Dict[str, any]] = {
    "Clear": {
        "symbol": "*",  # Sun
        "char_code": VestaboardChars.ASTERISK,
        "description": "Sunny"
    },
    "Sunny": {
        "symbol": "*",
        "char_code": VestaboardChars.ASTERISK,
        "description": "Sunny"
    },
    "Partly Cloudy": {
        "symbol": "%",
        "char_code": VestaboardChars.PERCENT,
        "description": "Partly Cloudy"
    },
    "Cloudy": {
        "symbol": "O",
        "char_code": VestaboardChars.O,
        "description": "Cloudy"
    },
    "Overcast": {
        "symbol": "O",
        "char_code": VestaboardChars.O,
        "description": "Overcast"
    },
    "Rain": {
        "symbol": "/",
        "char_code": VestaboardChars.SLASH,
        "description": "Rain"
    },
    "Rainy": {
        "symbol": "/",
        "char_code": VestaboardChars.SLASH,
        "description": "Rain"
    },
    "Light Rain": {
        "symbol": "/",
        "char_code": VestaboardChars.SLASH,
        "description": "Light Rain"
    },
    "Heavy Rain": {
        "symbol": "//",
        "char_code": VestaboardChars.SLASH,
        "description": "Heavy Rain"
    },
    "Thunderstorm": {
        "symbol": "!",
        "char_code": VestaboardChars.EXCLAMATION,
        "description": "Storm"
    },
    "Storm": {
        "symbol": "!",
        "char_code": VestaboardChars.EXCLAMATION,
        "description": "Storm"
    },
    "Snow": {
        "symbol": "*",
        "char_code": VestaboardChars.ASTERISK,
        "description": "Snow"
    },
    "Snowy": {
        "symbol": "*",
        "char_code": VestaboardChars.ASTERISK,
        "description": "Snow"
    },
    "Fog": {
        "symbol": "~",
        "char_code": VestaboardChars.DASH,  # Approximation
        "description": "Fog"
    },
    "Mist": {
        "symbol": "~",
        "char_code": VestaboardChars.DASH,
        "description": "Mist"
    },
}


def get_weather_symbol(condition: str) -> Dict[str, any]:
    """
    Get weather symbol for a condition.
    
    Args:
        condition: Weather condition string (e.g., "Clear", "Rainy")
        
    Returns:
        Dictionary with symbol, char_code, and description
    """
    # Normalize condition string
    condition = condition.strip()
    
    # Try exact match first
    if condition in WEATHER_SYMBOLS:
        return WEATHER_SYMBOLS[condition]
    
    # Try case-insensitive match
    for key, value in WEATHER_SYMBOLS.items():
        if key.lower() == condition.lower():
            return value
    
    # Try partial match (e.g., "Light Rain" contains "Rain")
    condition_lower = condition.lower()
    for key, value in WEATHER_SYMBOLS.items():
        if key.lower() in condition_lower or condition_lower in key.lower():
            return value
    
    # Default fallback
    return {
        "symbol": "?",
        "char_code": VestaboardChars.QUESTION,
        "description": condition
    }

