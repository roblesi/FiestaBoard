"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api, FeaturesConfig, FeatureName } from "@/lib/api";
import { FeatureCard, FeatureField } from "./feature-card";
import {
  Cloud,
  Calendar,
  Home,
  Wifi,
  Sparkles,
  Wind,
  TrainFront,
  Waves,
  Bike,
  Car,
  Moon,
  TrendingUp,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

// Vulcan salute component - uses emoji with CSS filter to match icon theme
// Converts emoji to grayscale so it matches the monochrome icon style
const VulcanSalute = ({ className }: { className?: string }) => {
  // Check if it should be primary (enabled) or muted (disabled)
  const isPrimary = className?.includes('text-primary');
  const isMuted = className?.includes('text-muted-foreground');
  
  // Apply grayscale filter to remove yellow color and match icon style
  // Use brightness to match the theme
  const filter = isMuted 
    ? 'grayscale(100%) brightness(0.6)' // Dimmer for muted state
    : 'grayscale(100%) brightness(0)'; // Black for primary/enabled state
  
  return (
    <span 
      className={className}
      style={{ 
        fontSize: '1.25rem', 
        lineHeight: '1.25rem', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '1.25rem', 
        height: '1.25rem',
        filter: filter,
        color: 'currentColor'
      }}
    >
      🖖
    </span>
  );
};

// Output parameter definition
export interface OutputParameter {
  name: string;           // Template variable name (e.g., "temp")
  description: string;    // Human-readable description
  example: string;        // Example output
  maxChars: number;       // Maximum character length
  typical?: string;       // Typical value format
}

// Feature configurations with their fields and output parameters
const FEATURE_DEFINITIONS: Record<
  string,
  {
    title: string;
    description: string;
    icon: LucideIcon | typeof VulcanSalute;
    fields: FeatureField[];
    outputs: OutputParameter[];
    hasRefreshInterval?: boolean;
    defaultRefreshSeconds?: number;
  }
> = {
  weather: {
    title: "Weather",
    description: "Display current weather conditions",
    icon: Cloud,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 300,
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "Enter your weather API key",
        required: true,
        description: "Get a free key from weatherapi.com",
      },
      {
        key: "provider",
        label: "Provider",
        type: "select",
        options: [
          { value: "weatherapi", label: "WeatherAPI" },
          { value: "openweathermap", label: "OpenWeatherMap" },
        ],
      },
      {
        key: "location",
        label: "Location",
        type: "location",
        placeholder: "San Francisco, CA or 37.7749,-122.4194",
        required: true,
        description: "City name or coordinates (use button to auto-detect)",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "300",
        description: "How often to fetch new weather data (min: 60)",
      },
    ],
    outputs: [
      { name: "temperature", description: "Temperature in °F", example: "72", maxChars: 3, typical: "2-3 digits" },
      { name: "condition", description: "Weather condition", example: "Sunny", maxChars: 12, typical: "4-12 chars" },
      { name: "humidity", description: "Humidity percentage", example: "65", maxChars: 3, typical: "2-3 digits" },
      { name: "location", description: "Location name", example: "San Francisco", maxChars: 15, typical: "5-15 chars" },
      { name: "wind_speed", description: "Wind speed in mph", example: "12", maxChars: 3, typical: "1-3 digits" },
    ],
  },
  datetime: {
    title: "Date & Time",
    description: "Display current date and time",
    icon: Calendar,
    hasRefreshInterval: false, // Always current
    fields: [
      {
        key: "timezone",
        label: "Timezone",
        type: "text",
        placeholder: "America/Los_Angeles",
        description: "IANA timezone identifier",
      },
    ],
    outputs: [
      { name: "time", description: "Current time (HH:MM)", example: "14:30", maxChars: 5, typical: "5 chars" },
      { name: "date", description: "Current date", example: "2025-01-15", maxChars: 10, typical: "10 chars" },
      { name: "day", description: "Day of month", example: "15", maxChars: 2, typical: "1-2 digits" },
      { name: "day_of_week", description: "Day name", example: "Wednesday", maxChars: 9, typical: "6-9 chars" },
      { name: "month", description: "Month name", example: "January", maxChars: 9, typical: "3-9 chars" },
      { name: "year", description: "Current year", example: "2025", maxChars: 4, typical: "4 digits" },
      { name: "hour", description: "Hour (24h)", example: "14", maxChars: 2, typical: "2 digits" },
      { name: "minute", description: "Minute", example: "30", maxChars: 2, typical: "2 digits" },
    ],
  },
  home_assistant: {
    title: "Home Assistant",
    description: "Display smart home status",
    icon: Home,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 30,
    fields: [
      {
        key: "base_url",
        label: "Base URL",
        type: "text",
        placeholder: "http://homeassistant.local:8123",
        required: true,
      },
      {
        key: "access_token",
        label: "Access Token",
        type: "password",
        placeholder: "Long-lived access token",
        required: true,
        description: "Create in HA Profile → Long-lived access tokens",
      },
      {
        key: "timeout",
        label: "Timeout (seconds)",
        type: "number",
        placeholder: "5",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "30",
        description: "How often to poll entity states (min: 10)",
      },
    ],
    outputs: [
      { name: "{entity}.state", description: "Entity state value", example: "on", maxChars: 10, typical: "2-10 chars" },
      { name: "{entity}.friendly_name", description: "Entity display name", example: "Front Door", maxChars: 15 },
    ],
  },
  guest_wifi: {
    title: "Guest WiFi",
    description: "Display WiFi credentials",
    icon: Wifi,
    hasRefreshInterval: false, // Static data
    fields: [
      {
        key: "ssid",
        label: "Network Name (SSID)",
        type: "text",
        placeholder: "MyGuestNetwork",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "WiFi password",
        required: true,
      },
    ],
    outputs: [
      { name: "ssid", description: "Network name", example: "GuestWiFi", maxChars: 22, typical: "5-22 chars" },
      { name: "password", description: "WiFi password", example: "guest123", maxChars: 22, typical: "8-22 chars" },
    ],
  },
  star_trek_quotes: {
    title: "Star Trek Quotes",
    description: "Display random quotes",
    icon: VulcanSalute,
    hasRefreshInterval: false, // Changes per rotation
    fields: [
      {
        key: "ratio",
        label: "Series Ratio (TNG:VOY:DS9)",
        type: "text",
        placeholder: "3:5:9",
        description: "Weighted ratio for quote selection",
      },
    ],
    outputs: [
      { name: "quote", description: "The quote text", example: "Make it so.", maxChars: 120, typical: "20-120 chars (multi-line)" },
      { name: "character", description: "Character name", example: "Picard", maxChars: 15, typical: "4-15 chars" },
      { name: "series", description: "Series name", example: "TNG", maxChars: 3, typical: "3 chars" },
    ],
  },
  air_fog: {
    title: "Air Quality & Fog",
    description: "AQI and fog conditions",
    icon: Wind,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 600,
    fields: [
      {
        key: "purpleair_api_key",
        label: "PurpleAir API Key",
        type: "password",
        placeholder: "Enter PurpleAir API key",
        description: "API key from PurpleAir (for AQI)",
      },
      {
        key: "openweathermap_api_key",
        label: "OpenWeatherMap API Key",
        type: "password",
        placeholder: "Enter OpenWeatherMap API key",
        description: "API key from OpenWeatherMap (for fog/visibility)",
      },
      {
        key: "purpleair_sensor_id",
        label: "PurpleAir Sensor ID (optional)",
        type: "text",
        placeholder: "123456",
        description: "Specific sensor ID, or leave blank for nearest",
      },
      {
        key: "latitude",
        label: "Latitude",
        type: "number",
        placeholder: "37.7749",
        description: "Location latitude (default: San Francisco)",
      },
      {
        key: "longitude",
        label: "Longitude",
        type: "number",
        placeholder: "-122.4194",
        description: "Location longitude (default: San Francisco)",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "600",
        description: "How often to fetch data (default: 10 min)",
      },
    ],
    outputs: [
      { name: "aqi", description: "Air Quality Index", example: "45", maxChars: 3, typical: "1-3 digits" },
      { name: "air_status", description: "Air quality status", example: "GOOD", maxChars: 18, typical: "GOOD/MODERATE/UNHEALTHY" },
      { name: "air_color", description: "AQI color tile", example: "{65}", maxChars: 4, typical: "Color tile" },
      { name: "fog_status", description: "Fog condition", example: "FOGGY", maxChars: 10, typical: "CLEAR/HAZE/MIST/FOG" },
      { name: "fog_color", description: "Fog color tile", example: "{64}", maxChars: 4, typical: "Color tile" },
      { name: "is_foggy", description: "Fog present", example: "Yes", maxChars: 3, typical: "Yes/No" },
      { name: "formatted", description: "Pre-formatted message", example: "AQI:45 CLEAR", maxChars: 22, typical: "10-22 chars" },
    ],
  },
  muni: {
    title: "Muni Transit",
    description: "Real-time SF Muni arrivals",
    icon: TrainFront,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 60,
    fields: [
      {
        key: "api_key",
        label: "511.org API Key",
        type: "password",
        placeholder: "Enter your 511.org API key",
        required: true,
        description: "Get a free key from 511.org/open-data",
      },
      {
        key: "line_name",
        label: "Line Filter (optional)",
        type: "text",
        placeholder: "N",
        description: "Filter to specific line (e.g., N, J, KT)",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "60",
        description: "How often to fetch arrival data (min: 30)",
      },
    ],
    outputs: [
      { name: "line", description: "Transit line name (first stop)", example: "N-JUDAH", maxChars: 12, typical: "1-12 chars" },
      { name: "stop_name", description: "Stop name (first stop)", example: "Church & Duboce", maxChars: 22, typical: "10-22 chars" },
      { name: "formatted", description: "Pre-formatted arrivals (first stop)", example: "N: 3, 8, 15 min", maxChars: 22, typical: "10-22 chars" },
      { name: "is_delayed", description: "Delay status (first stop)", example: "Yes", maxChars: 3, typical: "Yes/No" },
      { name: "stop_count", description: "Number of tracked stops", example: "3", maxChars: 1, typical: "1 digit" },
      { name: "stops.0.line", description: "Line at first stop", example: "N-JUDAH", maxChars: 12, typical: "1-12 chars" },
      { name: "stops.0.stop_name", description: "Name of first stop", example: "Church & Duboce", maxChars: 22, typical: "10-22 chars" },
      { name: "stops.0.formatted", description: "Formatted arrivals at first stop", example: "N: 3, 8, 15 min", maxChars: 22, typical: "10-22 chars" },
      { name: "stops.1.line", description: "Line at second stop", example: "J-CHURCH", maxChars: 12, typical: "1-12 chars" },
      { name: "stops.2.line", description: "Line at third stop", example: "KT", maxChars: 12, typical: "1-12 chars" },
      { name: "stops.3.line", description: "Line at fourth stop", example: "L-TARAVAL", maxChars: 12, typical: "1-12 chars" },
    ],
  },
  surf: {
    title: "Surf Conditions",
    description: "Ocean Beach wave conditions",
    icon: Waves,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 1800,
    fields: [
      {
        key: "latitude",
        label: "Latitude",
        type: "number",
        placeholder: "37.7599",
        description: "Location latitude (default: Ocean Beach, SF)",
      },
      {
        key: "longitude",
        label: "Longitude",
        type: "number",
        placeholder: "-122.5121",
        description: "Location longitude (default: Ocean Beach, SF)",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "1800",
        description: "How often to fetch surf data (default: 30 min)",
      },
    ],
    outputs: [
      { name: "wave_height", description: "Wave height in feet", example: "4.2", maxChars: 4, typical: "1-4 chars" },
      { name: "swell_period", description: "Swell period in seconds", example: "12.5", maxChars: 4, typical: "2-4 chars" },
      { name: "quality", description: "Surf quality", example: "GOOD", maxChars: 9, typical: "EXCELLENT/GOOD/FAIR/POOR" },
      { name: "quality_color", description: "Quality color tile", example: "{66}", maxChars: 4, typical: "Color tile" },
      { name: "formatted", description: "Pre-formatted message", example: "WAVES: 4.2FT GOOD", maxChars: 22, typical: "10-22 chars" },
    ],
  },
  baywheels: {
    title: "Bay Wheels",
    description: "Bike share availability",
    icon: Bike,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 60,
    fields: [
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "60",
        description: "How often to check availability (min: 30)",
      },
    ],
    outputs: [
      { name: "electric_bikes", description: "Electric bikes (first station)", example: "5", maxChars: 2, typical: "1-2 digits" },
      { name: "classic_bikes", description: "Classic bikes (first station)", example: "8", maxChars: 2, typical: "1-2 digits" },
      { name: "num_bikes_available", description: "Total bikes (first station)", example: "13", maxChars: 2, typical: "1-2 digits" },
      { name: "station_name", description: "Station name (first station)", example: "19TH", maxChars: 10, typical: "4-10 chars" },
      { name: "status_color", description: "Availability color (first station)", example: "{66}", maxChars: 4, typical: "Color tile" },
      { name: "total_electric", description: "Total e-bikes (all stations)", example: "15", maxChars: 2, typical: "1-2 digits" },
      { name: "total_classic", description: "Total classic bikes (all stations)", example: "20", maxChars: 2, typical: "1-2 digits" },
      { name: "total_bikes", description: "Total bikes (all stations)", example: "35", maxChars: 2, typical: "1-2 digits" },
      { name: "station_count", description: "Number of tracked stations", example: "3", maxChars: 1, typical: "1 digit" },
      { name: "best_station_name", description: "Station with most e-bikes", example: "19TH ST", maxChars: 10, typical: "4-10 chars" },
      { name: "best_station_electric", description: "E-bikes at best station", example: "8", maxChars: 2, typical: "1-2 digits" },
      { name: "stations.0.electric_bikes", description: "E-bikes at first station", example: "5", maxChars: 2, typical: "1-2 digits" },
      { name: "stations.0.station_name", description: "Name of first station", example: "19TH ST", maxChars: 10, typical: "4-10 chars" },
      { name: "stations.1.electric_bikes", description: "E-bikes at second station", example: "3", maxChars: 2, typical: "1-2 digits" },
      { name: "stations.2.electric_bikes", description: "E-bikes at third station", example: "7", maxChars: 2, typical: "1-2 digits" },
      { name: "stations.3.electric_bikes", description: "E-bikes at fourth station", example: "2", maxChars: 2, typical: "1-2 digits" },
    ],
  },
  traffic: {
    title: "Traffic",
    description: "Drive time to destinations",
    icon: Car,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 300,
    fields: [
      {
        key: "api_key",
        label: "Google Routes API Key",
        type: "password",
        placeholder: "Enter Google Routes API key",
        required: true,
        description: "API key with Routes API enabled",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "300",
        description: "How often to fetch traffic data (default: 5 min)",
      },
    ],
    outputs: [
      { name: "duration_minutes", description: "Travel time (first route)", example: "25", maxChars: 3, typical: "1-3 digits" },
      { name: "delay_minutes", description: "Delay (first route)", example: "+5", maxChars: 3, typical: "1-3 chars" },
      { name: "traffic_status", description: "Traffic status (first route)", example: "MODERATE", maxChars: 8, typical: "LIGHT/MODERATE/HEAVY" },
      { name: "traffic_color", description: "Traffic color tile (first route)", example: "{66}", maxChars: 4, typical: "Color tile" },
      { name: "destination_name", description: "Destination name (first route)", example: "DOWNTOWN", maxChars: 10, typical: "4-10 chars" },
      { name: "formatted", description: "Pre-formatted message (first route)", example: "DOWNTOWN: 25m (+5m)", maxChars: 22, typical: "12-22 chars" },
      { name: "route_count", description: "Number of tracked routes", example: "3", maxChars: 1, typical: "1 digit" },
      { name: "routes.0.duration_minutes", description: "Travel time for first route", example: "25", maxChars: 3, typical: "1-3 digits" },
      { name: "routes.0.delay_minutes", description: "Delay for first route", example: "+5", maxChars: 3, typical: "1-3 chars" },
      { name: "routes.0.destination_name", description: "Name of first route", example: "WORK", maxChars: 10, typical: "4-10 chars" },
      { name: "routes.0.formatted", description: "Formatted for first route", example: "WORK: 25m (+5m)", maxChars: 22, typical: "12-22 chars" },
      { name: "routes.1.duration_minutes", description: "Travel time for second route", example: "35", maxChars: 3, typical: "1-3 digits" },
      { name: "routes.2.duration_minutes", description: "Travel time for third route", example: "45", maxChars: 3, typical: "1-3 digits" },
      { name: "routes.3.duration_minutes", description: "Travel time for fourth route", example: "20", maxChars: 3, typical: "1-3 digits" },
    ],
  },
  stocks: {
    title: "Stocks",
    description: "Display US stock market prices and percentage changes",
    icon: TrendingUp,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 300,
    fields: [
      {
        key: "finnhub_api_key",
        label: "Finnhub API Key (Optional)",
        type: "password",
        placeholder: "Enter Finnhub API key for better symbol search",
        required: false,
        description: "Optional - enables better symbol search/autocomplete. Get free key at finnhub.io",
      },
      {
        key: "symbols",
        label: "Stock Symbols",
        type: "stocks",  // Custom type for stock symbol input
        placeholder: "Search and select stock symbols",
        required: true,
        description: "Select up to 5 stock symbols to monitor",
      },
      {
        key: "time_window",
        label: "Time Window",
        type: "select",
        options: [
          { value: "1 Day", label: "1 Day" },
          { value: "5 Days", label: "5 Days" },
          { value: "1 Month", label: "1 Month" },
          { value: "3 Months", label: "3 Months" },
          { value: "6 Months", label: "6 Months" },
          { value: "1 Year", label: "1 Year" },
          { value: "2 Years", label: "2 Years" },
          { value: "5 Years", label: "5 Years" },
          { value: "ALL", label: "All Time" },
        ],
        description: "Compare current price to price from this time period",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "300",
        description: "How often to fetch new stock data (min: 60, default: 5 min)",
      },
    ],
    outputs: [
      { name: "symbol", description: "Stock symbol (first stock)", example: "GOOG", maxChars: 5, typical: "1-5 chars" },
      { name: "current_price", description: "Current price (first stock)", example: "150.25", maxChars: 8, typical: "6-8 chars" },
      { name: "change_percent", description: "Percentage change (first stock)", example: "+1.18", maxChars: 6, typical: "4-6 chars" },
      { name: "formatted", description: "Pre-formatted display (first stock)", example: "GOOG{green} $150.25 +1.18%", maxChars: 22, typical: "15-22 chars" },
      { name: "symbol_count", description: "Number of tracked symbols", example: "3", maxChars: 1, typical: "1 digit" },
      { name: "stocks.0.symbol", description: "Symbol of first stock", example: "GOOG", maxChars: 5, typical: "1-5 chars" },
      { name: "stocks.0.current_price", description: "Current price of first stock", example: "150.25", maxChars: 8, typical: "6-8 chars" },
      { name: "stocks.0.change_percent", description: "Percentage change of first stock", example: "+1.18", maxChars: 6, typical: "4-6 chars" },
      { name: "stocks.0.formatted", description: "Formatted display of first stock", example: "GOOG{green} $150.25 +1.18%", maxChars: 22, typical: "15-22 chars" },
      { name: "stocks.1.symbol", description: "Symbol of second stock", example: "AAPL", maxChars: 5, typical: "1-5 chars" },
      { name: "stocks.1.current_price", description: "Current price of second stock", example: "175.50", maxChars: 8, typical: "6-8 chars" },
      { name: "stocks.2.symbol", description: "Symbol of third stock", example: "MSFT", maxChars: 5, typical: "1-5 chars" },
      { name: "stocks.3.symbol", description: "Symbol of fourth stock", example: "TSLA", maxChars: 5, typical: "1-5 chars" },
    ],
  },
  property: {
    title: "Property Values",
    description: "Track real estate property values over time",
    icon: Home,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 86400, // 24 hours
    fields: [
      {
        key: "api_provider",
        label: "Data Provider",
        type: "select",
        options: [
          { value: "redfin", label: "Redfin (Free)" },
          { value: "realty_mole", label: "Realty Mole (Paid)" },
          { value: "manual", label: "Manual/Testing" },
        ],
        description: "Redfin is free and doesn't require an API key",
      },
      {
        key: "api_key",
        label: "API Key (if required)",
        type: "password",
        placeholder: "Enter API key for paid providers",
        required: false,
        description: "Only needed for Realty Mole provider",
      },
      {
        key: "addresses",
        label: "Property Addresses",
        type: "properties",
        placeholder: "",
        required: true,
        description: "Manage up to 3 properties to track their estimated values",
      },
      {
        key: "time_window",
        label: "Time Window",
        type: "select",
        options: [
          { value: "1 Week", label: "1 Week" },
          { value: "1 Month", label: "1 Month" },
          { value: "3 Months", label: "3 Months" },
          { value: "6 Months", label: "6 Months" },
          { value: "1 Year", label: "1 Year" },
        ],
        description: "Compare current value to value from this time period",
      },
      {
        key: "refresh_seconds",
        label: "Refresh Interval (seconds)",
        type: "number",
        placeholder: "86400",
        description: "How often to check property values (default: daily = 86400)",
      },
    ],
    outputs: [
      { name: "display_name", description: "Property name (first property)", example: "HOME", maxChars: 10, typical: "3-10 chars" },
      { name: "current_value", description: "Current estimated value (first property)", example: "$1.25M", maxChars: 8, typical: "6-8 chars" },
      { name: "change_percent", description: "Percentage change (first property)", example: "+2.5%", maxChars: 6, typical: "4-6 chars" },
      { name: "formatted", description: "Pre-formatted display (first property)", example: "HOME{green} $1.25M +2.5%", maxChars: 22, typical: "15-22 chars" },
      { name: "color_tile", description: "Color tile for change (first property)", example: "{green}", maxChars: 7, typical: "Color tile" },
      { name: "property_count", description: "Number of tracked properties", example: "2", maxChars: 1, typical: "1 digit" },
      { name: "properties.0.display_name", description: "Name of first property", example: "HOME", maxChars: 10, typical: "3-10 chars" },
      { name: "properties.0.current_value", description: "Current value of first property", example: "$1.25M", maxChars: 8, typical: "6-8 chars" },
      { name: "properties.0.change_percent", description: "Percentage change of first property", example: "+2.5%", maxChars: 6, typical: "4-6 chars" },
      { name: "properties.0.formatted", description: "Formatted display of first property", example: "HOME{green} $1.25M +2.5%", maxChars: 22, typical: "15-22 chars" },
      { name: "properties.1.display_name", description: "Name of second property", example: "RENTAL", maxChars: 10, typical: "3-10 chars" },
      { name: "properties.1.current_value", description: "Current value of second property", example: "$850K", maxChars: 8, typical: "6-8 chars" },
      { name: "properties.2.display_name", description: "Name of third property", example: "CABIN", maxChars: 10, typical: "3-10 chars" },
    ],
  },
};

export function FeatureSettings() {
  // Fetch all features config
  const { data: featuresData, isLoading } = useQuery({
    queryKey: ["features-config"],
    queryFn: api.getFeaturesConfig,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Object.keys(FEATURE_DEFINITIONS).map((key) => (
          <Skeleton key={key} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const features = featuresData?.features as FeaturesConfig | undefined;

  return (
    <div className="space-y-4">
      {Object.entries(FEATURE_DEFINITIONS).map(([featureName, definition]) => {
        const featureConfig = features?.[featureName as keyof FeaturesConfig];
        
        return (
          <FeatureCard
            key={featureName}
            featureName={featureName as FeatureName}
            title={definition.title}
            description={definition.description}
            icon={definition.icon}
            fields={definition.fields}
            outputs={definition.outputs}
            initialConfig={featureConfig as Record<string, unknown> | undefined}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}

// Export for use in other components
export { FEATURE_DEFINITIONS };
