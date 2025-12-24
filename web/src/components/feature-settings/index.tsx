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
} from "lucide-react";

// Feature configurations with their fields
const FEATURE_DEFINITIONS: Record<
  string,
  {
    title: string;
    description: string;
    icon: typeof Cloud;
    fields: FeatureField[];
  }
> = {
  weather: {
    title: "Weather",
    description: "Display current weather conditions",
    icon: Cloud,
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
        type: "text",
        placeholder: "San Francisco, CA",
        required: true,
        description: "City name or coordinates",
      },
    ],
  },
  datetime: {
    title: "Date & Time",
    description: "Display current date and time",
    icon: Calendar,
    fields: [
      {
        key: "timezone",
        label: "Timezone",
        type: "text",
        placeholder: "America/Los_Angeles",
        description: "IANA timezone identifier",
      },
    ],
  },
  home_assistant: {
    title: "Home Assistant",
    description: "Display smart home status",
    icon: Home,
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
      },
    ],
  },
  apple_music: {
    title: "Apple Music",
    description: "Display now playing info",
    icon: Music,
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
      },
    ],
  },
  guest_wifi: {
    title: "Guest WiFi",
    description: "Display WiFi credentials",
    icon: Wifi,
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
  },
  star_trek_quotes: {
    title: "Star Trek Quotes",
    description: "Display random quotes",
    icon: Sparkles,
    fields: [
      {
        key: "ratio",
        label: "Series Ratio (TNG:VOY:DS9)",
        type: "text",
        placeholder: "3:5:9",
        description: "Weighted ratio for quote selection",
      },
    ],
  },
  rotation: {
    title: "Rotation",
    description: "Rotate between displays",
    icon: RotateCw,
    fields: [
      {
        key: "default_duration",
        label: "Default Duration (seconds)",
        type: "number",
        placeholder: "300",
        description: "How long each display shows before rotating",
      },
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
            featureName={featureName as keyof FeaturesConfig}
            title={definition.title}
            description={definition.description}
            icon={definition.icon}
            fields={definition.fields}
            initialConfig={featureConfig as Record<string, unknown> | undefined}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}

