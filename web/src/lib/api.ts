// API client for Vestaboard service
// Extensible pattern - easy to add updateConfig(), savePage() later

// Runtime configuration - API URL is fetched at startup from /api/runtime-config
let API_BASE = "";
let configLoaded = false;
let configPromise: Promise<void> | null = null;

/**
 * Load runtime configuration from the API.
 * This should be called once at app startup.
 */
export async function loadRuntimeConfig(): Promise<void> {
  if (configLoaded) return;
  
  // If already loading, return the existing promise
  if (configPromise) return configPromise;
  
  configPromise = (async () => {
    try {
      // Fetch runtime config from the API
      const response = await fetch("/api/runtime-config");
      const config = await response.json();
      
      // Set API_BASE from config, or fall back to sensible defaults
      if (config.apiUrl) {
        API_BASE = config.apiUrl;
      } else if (typeof window !== "undefined") {
        // Dynamically construct API URL based on current hostname
        const hostname = window.location.hostname;
        if (hostname === "localhost") {
          API_BASE = "http://localhost:8000";
        } else {
          // In production, API runs on port 6969
          API_BASE = `http://${hostname}:6969`;
        }
      } else {
        API_BASE = "";  // Same origin fallback
      }
      
      configLoaded = true;
    } catch (error) {
      console.error("Failed to load runtime config, using defaults:", error);
      // Fall back to dynamic hostname-based URL
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (hostname === "localhost") {
          API_BASE = "http://localhost:8000";
        } else {
          // In production, API runs on port 6969
          API_BASE = `http://${hostname}:6969`;
        }
      } else {
        API_BASE = "";
      }
      configLoaded = true;
    }
  })();
  
  return configPromise;
}

// Types for API responses
export interface StatusResponse {
  running: boolean;
  initialized: boolean;
  config_summary: ConfigSummary;
}

export interface ConfigSummary {
  weather_enabled: boolean;
  home_assistant_enabled: boolean;
  guest_wifi_enabled: boolean;
  star_trek_quotes_enabled: boolean;
  dev_mode: boolean;
  transition_strategy?: string | null;
  transition_interval_ms?: number | null;
  transition_step_size?: number | null;
  [key: string]: boolean | string | number | null | undefined;
}

export interface PreviewResponse {
  message: string;
  lines: string[];
  display_type: string;
  line_count: number;
  preview: boolean;
}

export interface ActionResponse {
  status: string;
  message: string;
  dev_mode?: boolean;
}

export interface PageDeleteResponse {
  status: string;
  message: string;
  default_page_created: boolean;
  new_page_id?: string;
  active_page_updated: boolean;
  new_active_page_id?: string;
}

// Display types
export interface DisplayInfo {
  type: string;
  available: boolean;
  description: string;
}

export interface DisplaysResponse {
  displays: DisplayInfo[];
  total: number;
  available_count: number;
}

export interface DisplayResponse {
  display_type: string;
  message: string;
  lines: string[];
  line_count: number;
  available: boolean;
}

export interface DisplayRawResponse {
  display_type: string;
  data: Record<string, unknown>;
  available: boolean;
  error: string | null;
}

// Settings types
export interface TransitionSettings {
  strategy: string | null;
  step_interval_ms: number | null;
  step_size: number | null;
  available_strategies?: string[];
}

export interface OutputSettings {
  target: "ui" | "board" | "both";
  dev_mode: boolean;
  effective_target: string;
  available_targets: string[];
}

// Active page settings
export interface ActivePageResponse {
  page_id: string | null;
}

export interface SetActivePageResponse {
  status: string;
  page_id: string | null;
  sent_to_board: boolean;
  dev_mode: boolean;
}

// Page types
export type PageType = "single" | "composite" | "template";

export interface RowConfig {
  source: string;
  row_index: number;
  target_row: number;
}

export interface Page {
  id: string;
  name: string;
  type: PageType;
  display_type?: string;
  rows?: RowConfig[];
  template?: string[];
  duration_seconds: number;
  // Transition settings (per-page override)
  transition_strategy?: string | null;
  transition_interval_ms?: number | null;
  transition_step_size?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface PageCreate {
  name: string;
  type: PageType;
  display_type?: string;
  rows?: RowConfig[];
  template?: string[];
  duration_seconds?: number;
  // Transition settings (per-page override)
  transition_strategy?: string | null;
  transition_interval_ms?: number | null;
  transition_step_size?: number | null;
}

export interface PageUpdate {
  name?: string;
  display_type?: string;
  rows?: RowConfig[];
  template?: string[];
  duration_seconds?: number;
  // Transition settings (per-page override)
  transition_strategy?: string | null;
  transition_interval_ms?: number | null;
  transition_step_size?: number | null;
}

export interface PagesResponse {
  pages: Page[];
  total: number;
}

export interface PagePreviewResponse {
  page_id: string;
  message: string;
  lines: string[];
  display_type: string;
  raw: Record<string, unknown>;
}

export interface PagePreviewBatchResponse {
  previews: Record<string, PagePreviewResponse | { error: string; available: false }>;
  total: number;
  successful: number;
}

export interface PageSendResponse {
  status: string;
  page_id: string;
  message: string;
  sent_to_board: boolean;
  target: string;
  dev_mode: boolean;
}

// Template types
export interface FormattingVariable {
  syntax: string;
  description: string;
}

export interface TemplateVariables {
  variables: Record<string, string[]>;
  max_lengths: Record<string, number>;
  colors: Record<string, number>;
  symbols: string[];
  filters: string[];
  formatting: Record<string, FormattingVariable>;
  syntax_examples: Record<string, string>;
}

export interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  friendly_name: string;
}

export interface HomeAssistantEntitiesResponse {
  entities: HomeAssistantEntity[];
}

export interface TemplateValidationResponse {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

export interface TemplateRenderResponse {
  rendered: string;
  lines: string[];
  line_count: number;
}

// Configuration types
export interface VestaboardConfig {
  api_mode: "local" | "cloud";
  local_api_key: string;
  cloud_key: string;
  host: string;
  transition_strategy: string | null;
  transition_interval_ms: number | null;
  transition_step_size: number | null;
}

export interface WeatherFeatureConfig {
  enabled: boolean;
  api_key: string;
  provider: "weatherapi" | "openweathermap";
  location: string;  // Keep for backward compat
  locations?: Array<{
    location: string;
    name: string;
  }>;
  refresh_seconds?: number;
}

export interface DateTimeFeatureConfig {
  enabled: boolean;
  timezone: string;
}

export interface HomeAssistantFeatureConfig {
  enabled: boolean;
  base_url: string;
  access_token: string;
  entities: Array<Record<string, string>>;
  timeout: number;
  refresh_seconds: number;
}

export interface GuestWifiFeatureConfig {
  enabled: boolean;
  ssid: string;
  password: string;
  refresh_seconds: number;
}

export interface StarTrekQuotesFeatureConfig {
    enabled: boolean;
    ratio: string;
}

export interface AirFogFeatureConfig {
    enabled: boolean;
    purpleair_api_key: string;
    openweathermap_api_key: string;
    purpleair_sensor_id: string;
    latitude: number;
    longitude: number;
    refresh_seconds: number;
}

export interface MuniFeatureConfig {
    enabled: boolean;
    api_key: string;
    stop_code?: string;  // Backward compatibility
    stop_codes?: string[];  // New multi-stop support
    stop_names?: string[];  // Stop names for display
    line_name: string;
    refresh_seconds: number;
}

export interface MuniStop {
    stop_code: string;
    stop_id: string;
    name: string;
    lat: number | null;
    lon: number | null;
    distance_km?: number;
    routes?: string[];
}

export interface BayWheelsFeatureConfig {
    enabled: boolean;
    station_id?: string;  // Backward compatibility
    station_ids?: string[];  // New multi-station support
    station_name?: string;  // Backward compatibility
    refresh_seconds: number;
}

export interface BayWheelsStation {
    station_id: string;
    name: string;
    lat?: number;
    lon?: number;
    address?: string;
    capacity?: number;
    distance_km?: number;
    num_bikes_available?: number;
    electric_bikes?: number;
    classic_bikes?: number;
    num_docks_available?: number;
    is_renting?: boolean;
}

export interface SurfFeatureConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  refresh_seconds: number;
}

export interface TrafficRoute {
    origin: string;
    destination: string;
    destination_name: string;
}

export interface TrafficFeatureConfig {
    enabled: boolean;
    api_key: string;
    origin?: string;  // Backward compatibility
    destination?: string;  // Backward compatibility
    destination_name?: string;  // Backward compatibility
    routes?: TrafficRoute[];  // New multi-route support
    refresh_seconds: number;
}

export interface SilenceScheduleFeatureConfig {
  enabled: boolean;
  start_time: string; // UTC ISO format (e.g., "04:00+00:00")
  end_time: string;   // UTC ISO format (e.g., "15:00+00:00")
}

export interface StocksFeatureConfig {
  enabled: boolean;
  finnhub_api_key?: string;  // Optional - enables better symbol search
  symbols: string[];  // List of stock symbols (max 5)
  time_window: string;  // "1 Day", "5 Days", "1 Month", "3 Months", "6 Months", "1 Year", "2 Years", "5 Years", "ALL"
  refresh_seconds: number;
  color_rules?: {
    change_percent?: Array<{
      condition: string;
      value: number;
      color: string;
    }>;
  };
}

export interface StockSymbol {
  symbol: string;
  name: string;
}

export interface StockSymbolValidation {
  valid: boolean;
  symbol: string;
  name?: string;
  error?: string;
}

export interface FeaturesConfig {
  weather: WeatherFeatureConfig;
  datetime: DateTimeFeatureConfig;
  home_assistant: HomeAssistantFeatureConfig;
  guest_wifi: GuestWifiFeatureConfig;
  star_trek_quotes: StarTrekQuotesFeatureConfig;
  air_fog: AirFogFeatureConfig;
  muni: MuniFeatureConfig;
  surf: SurfFeatureConfig;
  baywheels: BayWheelsFeatureConfig;
  traffic: TrafficFeatureConfig;
  silence_schedule: SilenceScheduleFeatureConfig;
  stocks: StocksFeatureConfig;
}

export interface GeneralConfig {
  timezone: string; // IANA timezone (e.g., "America/Los_Angeles")
  refresh_interval_seconds: number;
  output_target: "ui" | "board" | "both";
}

export interface SilenceStatus {
  enabled: boolean;
  active: boolean;
  start_time_utc: string;
  end_time_utc: string;
  current_time_utc: string;
  next_change_utc: string;
}

export interface PollingSettings {
  interval_seconds: number;
}

export interface BoardSettings {
  board_type: "black" | "white" | null;
}

export interface FullConfig {
  vestaboard: VestaboardConfig;
  features: FeaturesConfig;
  general: GeneralConfig;
}

export interface FeatureConfigResponse {
  feature: string;
  config: Record<string, unknown>;
}

export interface ConfigValidationResponse {
  valid: boolean;
  errors: string[];
}

// Logs types
export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
}

export interface LogsParams {
  limit?: number;
  offset?: number;
  level?: LogLevel;
  search?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  filters: {
    level: LogLevel | null;
    search: string | null;
  };
}

export type FeatureName = 
  | "weather"
  | "datetime"
  | "home_assistant"
  | "guest_wifi"
  | "star_trek_quotes"
  | "baywheels"
  | "muni"
  | "surf"
  | "traffic"
  | "air_fog"
  | "silence_schedule";

export interface VersionResponse {
  package_version: string;
  build_version: string;
  is_dev: boolean;
}

// API client with typed methods
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  // Ensure config is loaded before making API calls
  if (!configLoaded) {
    await loadRuntimeConfig();
  }
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Queries (read-only)
  getStatus: () => fetchApi<StatusResponse>("/status"),
  getConfig: () => fetchApi<ConfigSummary>("/config"),

  // Mutations (actions)
  startService: () =>
    fetchApi<ActionResponse>("/start", { method: "POST" }),
  stopService: () =>
    fetchApi<ActionResponse>("/stop", { method: "POST" }),
  toggleDevMode: (devMode: boolean) =>
    fetchApi<ActionResponse>("/dev-mode", {
      method: "POST",
      body: JSON.stringify({ dev_mode: devMode }),
    }),

  // Display endpoints
  getDisplays: () => fetchApi<DisplaysResponse>("/displays"),
  getDisplay: (type: string) => fetchApi<DisplayResponse>(`/displays/${type}`),
  getDisplayRaw: (type: string) => fetchApi<DisplayRawResponse>(`/displays/${type}/raw`),
  sendDisplay: (type: string, target?: "ui" | "board" | "both") => {
    const params = target ? `?target=${target}` : "";
    return fetchApi<ActionResponse>(`/displays/${type}/send${params}`, { method: "POST" });
  },

  // Settings endpoints
  getTransitionSettings: () => fetchApi<TransitionSettings>("/settings/transitions"),
  updateTransitionSettings: (settings: Partial<TransitionSettings>) =>
    fetchApi<{ status: string; settings: TransitionSettings }>("/settings/transitions", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  getOutputSettings: () => fetchApi<OutputSettings>("/settings/output"),
  updateOutputSettings: (target: "ui" | "board" | "both") =>
    fetchApi<{ status: string; settings: { target: string } }>("/settings/output", {
      method: "PUT",
      body: JSON.stringify({ target }),
    }),

  // Active page settings
  getActivePage: () => fetchApi<ActivePageResponse>("/settings/active-page"),
  setActivePage: (pageId: string | null) =>
    fetchApi<SetActivePageResponse>("/settings/active-page", {
      method: "PUT",
      body: JSON.stringify({ page_id: pageId }),
    }),

  // Pages endpoints
  getPages: () => fetchApi<PagesResponse>("/pages"),
  getPage: (pageId: string) => fetchApi<Page>(`/pages/${pageId}`),
  createPage: (page: PageCreate) =>
    fetchApi<{ status: string; page: Page }>("/pages", {
      method: "POST",
      body: JSON.stringify(page),
    }),
  updatePage: (pageId: string, page: PageUpdate) =>
    fetchApi<{ status: string; page: Page }>(`/pages/${pageId}`, {
      method: "PUT",
      body: JSON.stringify(page),
    }),
  deletePage: (pageId: string) =>
    fetchApi<PageDeleteResponse>(`/pages/${pageId}`, { method: "DELETE" }),
  previewPage: (pageId: string) =>
    fetchApi<PagePreviewResponse>(`/pages/${pageId}/preview`, { method: "POST" }),
  previewPagesBatch: (pageIds: string[]) =>
    fetchApi<PagePreviewBatchResponse>("/pages/preview/batch", {
      method: "POST",
      body: JSON.stringify({ page_ids: pageIds }),
    }),
  sendPage: (pageId: string, target?: "ui" | "board" | "both") => {
    const params = target ? `?target=${target}` : "";
    return fetchApi<PageSendResponse>(`/pages/${pageId}/send${params}`, { method: "POST" });
  },

  // Templates endpoints
  getTemplateVariables: () => fetchApi<TemplateVariables>("/templates/variables"),
  validateTemplate: (template: string | string[]) =>
    fetchApi<TemplateValidationResponse>("/templates/validate", {
      method: "POST",
      body: JSON.stringify({ template }),
    }),
  renderTemplate: (template: string | string[]) =>
    fetchApi<TemplateRenderResponse>("/templates/render", {
      method: "POST",
      body: JSON.stringify({ template }),
    }),

  // Logs endpoints
  getLogs: (params: LogsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
    if (params.level) searchParams.set("level", params.level);
    if (params.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return fetchApi<LogsResponse>(`/logs${query ? `?${query}` : ""}`);
  },

  // Configuration endpoints
  getFullConfig: () => fetchApi<FullConfig>("/config/full"),
  getFeaturesConfig: () =>
    fetchApi<{ features: FeaturesConfig; available_features: FeatureName[] }>("/config/features"),
  getFeatureConfig: (featureName: FeatureName) =>
    fetchApi<FeatureConfigResponse>(`/config/features/${featureName}`),
  updateFeatureConfig: (featureName: FeatureName, config: Record<string, unknown>) =>
    fetchApi<{ status: string; feature: string; config: Record<string, unknown> }>(
      `/config/features/${featureName}`,
      {
        method: "PUT",
        body: JSON.stringify(config),
      }
    ),
  getVestaboardConfig: () =>
    fetchApi<{ config: VestaboardConfig; api_modes: string[] }>("/config/vestaboard"),
  updateVestaboardConfig: (config: Partial<VestaboardConfig>) =>
    fetchApi<{ status: string; config: VestaboardConfig }>("/config/vestaboard", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  validateConfig: () => fetchApi<ConfigValidationResponse>("/config/validate"),

  // Bay Wheels station search endpoints
  listBayWheelsStations: () =>
    fetchApi<{ stations: BayWheelsStation[]; total: number }>("/baywheels/stations"),
  findNearbyBayWheelsStations: (lat: number, lng: number, radius?: number, limit?: number) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      ...(radius !== undefined && { radius: radius.toString() }),
      ...(limit !== undefined && { limit: limit.toString() }),
    });
    return fetchApi<{
      stations: BayWheelsStation[];
      count: number;
      search_location: { lat: number; lng: number };
      radius_km: number;
    }>(`/baywheels/stations/nearby?${params}`);
  },
  searchBayWheelsStationsByAddress: (address: string, radius?: number, limit?: number) => {
    const params = new URLSearchParams({
      address,
      ...(radius !== undefined && { radius: radius.toString() }),
      ...(limit !== undefined && { limit: limit.toString() }),
    });
    return fetchApi<{
      stations: BayWheelsStation[];
      count: number;
      search_address: string;
      geocoded_location: { lat: number; lng: number; display_name: string };
      radius_km: number;
    }>(`/baywheels/stations/search?${params}`);
  },

  // MUNI stop search endpoints
  listMuniStops: () =>
    fetchApi<{ stops: MuniStop[]; total: number }>("/muni/stops"),
  findNearbyMuniStops: (lat: number, lng: number, radius?: number, limit?: number) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      ...(radius !== undefined && { radius: radius.toString() }),
      ...(limit !== undefined && { limit: limit.toString() }),
    });
    return fetchApi<{
      stops: MuniStop[];
      count: number;
      search_location: { lat: number; lng: number };
      radius_km: number;
    }>(`/muni/stops/nearby?${params}`);
  },
  searchMuniStopsByAddress: (address: string, radius?: number, limit?: number) => {
    const params = new URLSearchParams({
      address,
      ...(radius !== undefined && { radius: radius.toString() }),
      ...(limit !== undefined && { limit: limit.toString() }),
    });
    return fetchApi<{
      stops: MuniStop[];
      count: number;
      search_address: string;
      geocoded_location: { lat: number; lng: number; display_name: string };
      radius_km: number;
    }>(`/muni/stops/search?${params}`);
  },

  // Traffic route endpoints
  geocodeAddress: (address: string) =>
    fetchApi<{ lat: number; lng: number; formatted_address: string }>("/traffic/routes/geocode", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),
  validateTrafficRoute: (origin: string, destination: string, destination_name: string, travel_mode: string = "DRIVE") =>
    fetchApi<{
      valid: boolean;
      distance_km?: number;
      static_duration_minutes?: number;
      error?: string;
    }>("/traffic/routes/validate", {
      method: "POST",
      body: JSON.stringify({ origin, destination, destination_name, travel_mode }),
    }),
  
  // Stocks endpoints
  searchStockSymbols: (query: string, limit?: number) => {
    const params = new URLSearchParams({
      query,
      ...(limit !== undefined && { limit: limit.toString() }),
    });
    return fetchApi<{
      symbols: StockSymbol[];
      count: number;
      query: string;
    }>(`/stocks/search?${params}`);
  },
  validateStockSymbol: (symbol: string) =>
    fetchApi<StockSymbolValidation>("/stocks/validate", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  
  // General configuration
  getGeneralConfig: () => fetchApi<GeneralConfig>("/config/general"),
  updateGeneralConfig: (config: Partial<GeneralConfig>) =>
    fetchApi<{ status: string; general: GeneralConfig }>("/config/general", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }),
  
  // Silence mode status
  getSilenceStatus: () => fetchApi<SilenceStatus>("/silence-status"),

  // Polling settings
  getPollingSettings: () => fetchApi<PollingSettings>("/settings/polling"),
  updatePollingSettings: (interval_seconds: number) =>
    fetchApi<{ status: string; settings: PollingSettings; requires_restart: boolean }>("/settings/polling", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval_seconds }),
    }),

  // Board settings
  getBoardSettings: () => fetchApi<BoardSettings>("/settings/board"),
  updateBoardSettings: (board_type: "black" | "white" | null) =>
    fetchApi<{ status: string; settings: BoardSettings }>("/settings/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_type }),
    }),

  // Home Assistant endpoints
  getHomeAssistantEntities: () =>
    fetchApi<HomeAssistantEntitiesResponse>("/home-assistant/entities"),

  // Version endpoint
  getVersion: () =>
    fetchApi<VersionResponse>("/version"),
};
