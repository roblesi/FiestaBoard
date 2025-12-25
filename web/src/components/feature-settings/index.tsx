"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api, FeaturesConfig } from "@/lib/api";
import { FeatureCard, FeatureField } from "./feature-card";
import {
  Cloud,
  Calendar,
  Home,
  Music,
  Wifi,
  Sparkles,
  RotateCw,
  Waves,
} from "lucide-react";

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
    icon: typeof Cloud;
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
  apple_music: {
    title: "Apple Music",
    description: "Display now playing info",
    icon: Music,
    hasRefreshInterval: true,
    defaultRefreshSeconds: 10,
    fields: [
      {
        key: "service_url",
        label: "Service URL",
        type: "text",
        placeholder: "http://localhost:5123",
        required: true,
        description: "URL of the macOS helper service",
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
        placeholder: "10",
        description: "How often to check now playing (min: 5)",
      },
    ],
    outputs: [
      { name: "track", description: "Song/track name", example: "Bohemian Rhapsody", maxChars: 22, typical: "5-22 chars" },
      { name: "artist", description: "Artist name", example: "Queen", maxChars: 22, typical: "3-22 chars" },
      { name: "album", description: "Album name", example: "A Night at the Opera", maxChars: 22, typical: "5-22 chars" },
      { name: "playing", description: "Is playing (bool)", example: "Yes", maxChars: 3, typical: "Yes/No" },
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
    icon: Sparkles,
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
      { name: "quality", description: "Surf quality rating", example: "GOOD", maxChars: 9, typical: "POOR/FAIR/GOOD/EXCELLENT" },
      { name: "quality_color", description: "Quality color tile", example: "{66}", maxChars: 4, typical: "Color tile" },
      { name: "formatted", description: "Pre-formatted message", example: "4FT GOOD", maxChars: 22, typical: "10-22 chars" },
    ],
  },
  rotation: {
    title: "Rotation",
    description: "Rotate between displays",
    icon: RotateCw,
    hasRefreshInterval: false,
    fields: [
      {
        key: "default_duration",
        label: "Default Duration (seconds)",
        type: "number",
        placeholder: "300",
        description: "How long each display shows before rotating",
      },
    ],
    outputs: [], // Rotation doesn't have template outputs
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
            featureName={featureName as keyof FeaturesConfig}
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
