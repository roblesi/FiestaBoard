// API client for Vestaboard service
// Extensible pattern - easy to add updateConfig(), savePage() later

// In Docker: empty string means relative URL (/api proxied by nginx)
// In dev: falls back to localhost:8000
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== "undefined" && window.location.hostname === "localhost" 
    ? "http://localhost:8000" 
    : "/api");

// Types for API responses
export interface StatusResponse {
  running: boolean;
  initialized: boolean;
  config_summary: ConfigSummary;
}

export interface ConfigSummary {
  weather_enabled: boolean;
  home_assistant_enabled: boolean;
  apple_music_enabled: boolean;
  guest_wifi_enabled: boolean;
  star_trek_quotes_enabled: boolean;
  rotation_enabled: boolean;
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

// Rotation types
export interface RotationEntry {
  page_id: string;
  duration_override?: number;
}

export interface Rotation {
  id: string;
  name: string;
  pages: RotationEntry[];
  default_duration: number;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RotationCreate {
  name: string;
  pages: RotationEntry[];
  default_duration?: number;
  enabled?: boolean;
}

export interface RotationUpdate {
  name?: string;
  pages?: RotationEntry[];
  default_duration?: number;
  enabled?: boolean;
}

export interface RotationsResponse {
  rotations: Rotation[];
  total: number;
  active_rotation_id: string | null;
}

export interface RotationStateResponse {
  active: boolean;
  rotation_id: string | null;
  rotation_name: string | null;
  current_page_index: number | null;
  current_page_id: string | null;
  time_on_page: number | null;
  page_duration: number | null;
  total_pages?: number;
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
  location: string;
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

export interface AppleMusicFeatureConfig {
  enabled: boolean;
  service_url: string;
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
    stop_code: string;
    line_name: string;
    refresh_seconds: number;
}

export interface BayWheelsFeatureConfig {
    enabled: boolean;
    station_id: string;
    station_name: string;
    refresh_seconds: number;
}

export interface RotationFeatureConfig {
  enabled: boolean;
  default_duration: number;
}

export interface FeaturesConfig {
  weather: WeatherFeatureConfig;
  datetime: DateTimeFeatureConfig;
  home_assistant: HomeAssistantFeatureConfig;
  apple_music: AppleMusicFeatureConfig;
    guest_wifi: GuestWifiFeatureConfig;
    star_trek_quotes: StarTrekQuotesFeatureConfig;
    air_fog: AirFogFeatureConfig;
    muni: MuniFeatureConfig;
    baywheels: BayWheelsFeatureConfig;
    rotation: RotationFeatureConfig;
}

export interface GeneralConfig {
  refresh_interval_seconds: number;
  output_target: "ui" | "board" | "both";
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
  | "apple_music"
  | "guest_wifi"
  | "star_trek_quotes"
  | "rotation";

// API client with typed methods
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
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

  // Rotations endpoints
  getRotations: () => fetchApi<RotationsResponse>("/rotations"),
  getRotation: (rotationId: string) =>
    fetchApi<Rotation & { missing_pages: string[] }>(`/rotations/${rotationId}`),
  createRotation: (rotation: RotationCreate) =>
    fetchApi<{ status: string; rotation: Rotation }>("/rotations", {
      method: "POST",
      body: JSON.stringify(rotation),
    }),
  updateRotation: (rotationId: string, rotation: RotationUpdate) =>
    fetchApi<{ status: string; rotation: Rotation }>(`/rotations/${rotationId}`, {
      method: "PUT",
      body: JSON.stringify(rotation),
    }),
  deleteRotation: (rotationId: string) =>
    fetchApi<ActionResponse>(`/rotations/${rotationId}`, { method: "DELETE" }),
  activateRotation: (rotationId: string) =>
    fetchApi<{ status: string; message: string; state: RotationStateResponse }>(
      `/rotations/${rotationId}/activate`,
      { method: "POST" }
    ),
  deactivateRotation: () =>
    fetchApi<ActionResponse>("/rotations/deactivate", { method: "POST" }),
  getActiveRotation: () => fetchApi<RotationStateResponse>("/rotations/active"),

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
};
