import { http, HttpResponse } from "msw";
import type {
  StatusResponse,
  PreviewResponse,
  ConfigSummary,
  DisplaysResponse,
  DisplayResponse,
  DisplayRawResponse,
  TransitionSettings,
  OutputSettings,
  PagesResponse,
  Page,
  PageCreate,
  TemplateVariables,
  TemplateRenderResponse,
  RotationsResponse,
  Rotation,
  RotationCreate,
  RotationStateResponse,
  LogsResponse,
  LogEntry,
} from "@/lib/api";

const API_BASE = "http://localhost:8000";

// Type-safe mock data
export const mockStatus: StatusResponse = {
  running: true,
  initialized: true,
  config_summary: {
    weather_enabled: true,
    home_assistant_enabled: false,
    apple_music_enabled: true,
    guest_wifi_enabled: false,
    star_trek_quotes_enabled: true,
    rotation_enabled: true,
    dev_mode: true,
  },
};

export const mockPreview: PreviewResponse = {
  message: "START WHERE YOU ARE\nUSE WHAT YOU HAVE\nDO WHAT YOU CAN\n-ARTHUR ASHE",
  lines: [
    "START WHERE YOU ARE",
    "USE WHAT YOU HAVE",
    "DO WHAT YOU CAN",
    "-ARTHUR ASHE",
  ],
  display_type: "star_trek",
  line_count: 4,
  preview: true,
};

export const mockConfig: ConfigSummary = {
  weather_enabled: true,
  home_assistant_enabled: false,
  apple_music_enabled: true,
  guest_wifi_enabled: false,
  star_trek_quotes_enabled: true,
  rotation_enabled: true,
  dev_mode: false,
};

export const mockDisplays: DisplaysResponse = {
  displays: [
    { type: "weather", available: true, description: "Current weather conditions" },
    { type: "datetime", available: true, description: "Current date and time" },
    { type: "weather_datetime", available: true, description: "Combined weather and datetime" },
    { type: "home_assistant", available: false, description: "Home Assistant status" },
    { type: "apple_music", available: true, description: "Apple Music now playing" },
    { type: "star_trek", available: true, description: "Star Trek quotes" },
    { type: "guest_wifi", available: false, description: "Guest WiFi credentials" },
  ],
  total: 7,
  available_count: 5,
};

export const mockWeatherDisplay: DisplayResponse = {
  display_type: "weather",
  message: "San Francisco: * Sunny\nTemp: 72°F",
  lines: ["San Francisco: * Sunny", "Temp: 72°F"],
  line_count: 2,
  available: true,
};

export const mockWeatherRaw: DisplayRawResponse = {
  display_type: "weather",
  data: {
    temperature: 72,
    condition: "Sunny",
    location: "San Francisco",
    humidity: 45,
  },
  available: true,
  error: null,
};

export const mockTransitionSettings: TransitionSettings = {
  strategy: "column",
  step_interval_ms: 500,
  step_size: 2,
  available_strategies: [
    "column",
    "reverse-column",
    "edges-to-center",
    "row",
    "diagonal",
    "random",
  ],
};

export const mockOutputSettings: OutputSettings = {
  target: "board",
  dev_mode: true,
  effective_target: "ui",
  available_targets: ["ui", "board", "both"],
};

export const mockPage: Page = {
  id: "page-1",
  name: "Weather Page",
  type: "single",
  display_type: "weather",
  duration_seconds: 300,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockCompositePage: Page = {
  id: "page-2",
  name: "Composite Page",
  type: "composite",
  rows: [
    { source: "weather", row_index: 0, target_row: 0 },
    { source: "datetime", row_index: 1, target_row: 1 },
  ],
  duration_seconds: 300,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockPages: PagesResponse = {
  pages: [mockPage, { ...mockCompositePage, id: "page-2", name: "Custom Template", type: "template" }],
  total: 2,
};

export const mockTemplateVariables: TemplateVariables = {
  variables: {
    weather: ["temperature", "condition", "location"],
    datetime: ["time", "date", "day"],
  },
  max_lengths: {
    "weather.temperature": 3,
    "weather.condition": 12,
    "weather.location": 15,
    "datetime.time": 5,
    "datetime.date": 10,
    "datetime.day": 2,
  },
  colors: { red: 63, orange: 64, yellow: 65, green: 66, blue: 67, violet: 68, white: 69, black: 70 },
  symbols: ["sun", "cloud", "rain", "star", "heart"],
  filters: ["pad:N", "upper", "lower", "truncate:N", "capitalize", "wrap"],
  formatting: {
    fill_space: {
      syntax: "{{fill_space}}",
      description: "Expands to fill remaining space on the line. Use multiple for multi-column layouts.",
    },
  },
  syntax_examples: {
    variable: "{{weather.temperature}}",
    variable_with_filter: "{{weather.temperature|pad:3}}",
    color_inline: "{{red}}Warning{{/}}",
    color_code: "{{63}}",
    symbol: "{sun}",
    fill_space: "Left{{fill_space}}Right",
  },
};

export const mockRotation: Rotation = {
  id: "rot-1",
  name: "Main Rotation",
  pages: [{ page_id: "page-1" }, { page_id: "page-2", duration_override: 120 }],
  default_duration: 300,
  enabled: true,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockRotations: RotationsResponse = {
  rotations: [mockRotation],
  total: 1,
  active_rotation_id: "rot-1",
};

export const mockRotationState: RotationStateResponse = {
  active: true,
  rotation_id: "rot-1",
  rotation_name: "Main Rotation",
  current_page_index: 0,
  current_page_id: "page-1",
  time_on_page: 45,
  page_duration: 300,
  total_pages: 2,
};

export const mockCacheStatus = {
  cached: true,
  last_message_hash: "abc123",
  last_sent_at: "2024-01-01T12:00:00Z",
  cache_hits: 5,
  total_sends: 10,
};

// Mock log entries
export const mockLogEntries: LogEntry[] = [
  {
    timestamp: "2025-12-25T10:00:00",
    level: "INFO",
    logger: "src.api_server",
    message: "API server starting up...",
  },
  {
    timestamp: "2025-12-25T10:00:01",
    level: "INFO",
    logger: "src.main",
    message: "Initializing Vestaboard Display Service...",
  },
  {
    timestamp: "2025-12-25T10:00:02",
    level: "DEBUG",
    logger: "src.vestaboard_client",
    message: "Connecting to board at 192.168.1.100",
  },
  {
    timestamp: "2025-12-25T10:00:03",
    level: "WARNING",
    logger: "src.data_sources.weather",
    message: "Weather API rate limit approaching",
  },
  {
    timestamp: "2025-12-25T10:00:04",
    level: "ERROR",
    logger: "src.displays.service",
    message: "Failed to render display: timeout",
  },
  {
    timestamp: "2025-12-25T10:00:05",
    level: "INFO",
    logger: "src.api_server",
    message: "Background service auto-started",
  },
];

export const mockLogsResponse: LogsResponse = {
  logs: mockLogEntries,
  total: mockLogEntries.length,
  limit: 50,
  offset: 0,
  has_more: false,
  filters: {
    level: null,
    search: null,
  },
};

// Store for tracking request bodies in tests
export const requestStore: {
  lastRotationCreate?: RotationCreate;
  lastPageCreate?: PageCreate;
  lastTransitionUpdate?: Partial<TransitionSettings>;
  lastOutputUpdate?: { target: string };
} = {};

// Handlers with request validation
export const handlers = [
  // Core status endpoints
  http.get(`${API_BASE}/status`, () => {
    return HttpResponse.json(mockStatus);
  }),

  http.get(`${API_BASE}/preview`, () => {
    return HttpResponse.json(mockPreview);
  }),

  http.get(`${API_BASE}/config`, () => {
    return HttpResponse.json(mockConfig);
  }),

  http.post(`${API_BASE}/start`, () => {
    return HttpResponse.json({ status: "started", message: "Service started successfully" });
  }),

  http.post(`${API_BASE}/stop`, () => {
    return HttpResponse.json({ status: "stopped", message: "Service stopped successfully" });
  }),

  http.post(`${API_BASE}/dev-mode`, async ({ request }) => {
    const body = await request.json() as { dev_mode: boolean };
    return HttpResponse.json({
      status: "success",
      dev_mode: body.dev_mode,
      message: `Dev mode ${body.dev_mode ? "enabled" : "disabled"}`,
    });
  }),

  http.post(`${API_BASE}/publish-preview`, () => {
    return HttpResponse.json({
      status: "success",
      message: "Preview published to Vestaboard successfully",
    });
  }),

  // Display endpoints
  http.get(`${API_BASE}/displays`, () => {
    return HttpResponse.json(mockDisplays);
  }),

  http.get(`${API_BASE}/displays/:type`, ({ params }) => {
    const { type } = params;
    if (type === "weather") {
      return HttpResponse.json(mockWeatherDisplay);
    }
    const response: DisplayResponse = {
      display_type: String(type),
      message: `${type} display`,
      lines: [`${type} display`],
      line_count: 1,
      available: true,
    };
    return HttpResponse.json(response);
  }),

  http.get(`${API_BASE}/displays/:type/raw`, ({ params }) => {
    const { type } = params;
    if (type === "weather") {
      return HttpResponse.json(mockWeatherRaw);
    }
    const response: DisplayRawResponse = {
      display_type: String(type),
      data: {},
      available: true,
      error: null,
    };
    return HttpResponse.json(response);
  }),

  http.post(`${API_BASE}/displays/:type/send`, ({ params }) => {
    const { type } = params;
    return HttpResponse.json({
      status: "success",
      display_type: type,
      message: `${type} sent`,
      sent_to_board: true,
      target: "board",
      dev_mode: false,
    });
  }),

  // Settings endpoints
  http.get(`${API_BASE}/settings/transitions`, () => {
    return HttpResponse.json(mockTransitionSettings);
  }),

  http.put(`${API_BASE}/settings/transitions`, async ({ request }) => {
    const body = await request.json() as Partial<TransitionSettings>;
    requestStore.lastTransitionUpdate = body;
    const response: TransitionSettings = {
      strategy: body.strategy ?? mockTransitionSettings.strategy,
      step_interval_ms: body.step_interval_ms ?? mockTransitionSettings.step_interval_ms,
      step_size: body.step_size ?? mockTransitionSettings.step_size,
      available_strategies: mockTransitionSettings.available_strategies,
    };
    return HttpResponse.json({
      status: "success",
      settings: response,
    });
  }),

  http.get(`${API_BASE}/settings/output`, () => {
    return HttpResponse.json(mockOutputSettings);
  }),

  http.put(`${API_BASE}/settings/output`, async ({ request }) => {
    const body = await request.json() as { target: string };
    requestStore.lastOutputUpdate = body;
    return HttpResponse.json({
      status: "success",
      settings: { target: body.target },
    });
  }),

  // Active page settings
  http.get(`${API_BASE}/settings/active-page`, () => {
    return HttpResponse.json({
      page_id: "page-1",
    });
  }),

  http.put(`${API_BASE}/settings/active-page`, async ({ request }) => {
    const body = await request.json() as { page_id: string | null };
    return HttpResponse.json({
      status: "success",
      page_id: body.page_id,
      sent_to_board: true,
      dev_mode: false,
    });
  }),

  // Pages endpoints
  http.get(`${API_BASE}/pages`, () => {
    return HttpResponse.json(mockPages);
  }),

  http.get(`${API_BASE}/pages/:id`, ({ params }) => {
    const { id } = params;
    if (id === "page-1") {
      return HttpResponse.json(mockPage);
    }
    if (id === "page-2") {
      return HttpResponse.json(mockCompositePage);
    }
    return HttpResponse.json(mockPage);
  }),

  http.post(`${API_BASE}/pages`, async ({ request }) => {
    const body = await request.json() as PageCreate;
    requestStore.lastPageCreate = body;
    
    const newPage: Page = {
      id: "new-page-" + Date.now(),
      name: body.name,
      type: body.type,
      display_type: body.display_type,
      rows: body.rows,
      template: body.template,
      duration_seconds: body.duration_seconds ?? 300,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      status: "success",
      page: newPage,
    });
  }),

  http.put(`${API_BASE}/pages/:id`, async ({ request, params }) => {
    const body = await request.json() as Partial<Page>;
    const { id } = params;
    const updatedPage: Page = {
      ...mockPage,
      id: String(id),
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      status: "success",
      page: updatedPage,
    });
  }),

  http.delete(`${API_BASE}/pages/:id`, () => {
    return HttpResponse.json({ status: "success", message: "Page deleted" });
  }),

  http.post(`${API_BASE}/pages/:id/preview`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      page_id: id,
      message: "Preview content",
      lines: ["Preview content"],
      display_type: "single",
      raw: {},
    });
  }),

  http.post(`${API_BASE}/pages/:id/send`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      status: "success",
      page_id: id,
      message: "Page sent",
      sent_to_board: true,
      target: "board",
      dev_mode: false,
    });
  }),

  // Template endpoints
  http.get(`${API_BASE}/templates/variables`, () => {
    return HttpResponse.json(mockTemplateVariables);
  }),

  http.post(`${API_BASE}/templates/validate`, async () => {
    return HttpResponse.json({
      valid: true,
      errors: [],
    });
  }),

  http.post(`${API_BASE}/templates/render`, async ({ request }) => {
    const body = await request.json() as { template: string | string[] };
    const template = Array.isArray(body.template) ? body.template.join("\n") : body.template;
    const response: TemplateRenderResponse = {
      rendered: template || "Rendered template",
      lines: template ? template.split("\n") : ["Rendered template"],
      line_count: template ? template.split("\n").length : 1,
    };
    return HttpResponse.json(response);
  }),

  // Rotation endpoints
  http.get(`${API_BASE}/rotations`, () => {
    return HttpResponse.json(mockRotations);
  }),

  http.get(`${API_BASE}/rotations/active`, () => {
    return HttpResponse.json(mockRotationState);
  }),

  http.get(`${API_BASE}/rotations/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      ...mockRotation,
      id: String(id),
      missing_pages: [],
    });
  }),

  http.post(`${API_BASE}/rotations`, async ({ request }) => {
    const body = await request.json() as RotationCreate;
    requestStore.lastRotationCreate = body;
    
    const newRotation: Rotation = {
      id: "new-rot-" + Date.now(),
      name: body.name,
      pages: body.pages,
      default_duration: body.default_duration ?? 300,
      enabled: body.enabled ?? true,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      status: "success",
      rotation: newRotation,
    });
  }),

  http.put(`${API_BASE}/rotations/:id`, async ({ request, params }) => {
    const body = await request.json() as Partial<Rotation>;
    const { id } = params;
    const updatedRotation: Rotation = {
      ...mockRotation,
      id: String(id),
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      status: "success",
      rotation: updatedRotation,
    });
  }),

  http.delete(`${API_BASE}/rotations/:id`, () => {
    return HttpResponse.json({ status: "success", message: "Rotation deleted" });
  }),

  http.post(`${API_BASE}/rotations/:id/activate`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      status: "success",
      message: "Rotation activated",
      state: { ...mockRotationState, rotation_id: String(id) },
    });
  }),

  http.post(`${API_BASE}/rotations/deactivate`, () => {
    return HttpResponse.json({
      status: "success",
      message: "Rotation deactivated",
    });
  }),

  // Cache endpoints
  http.get(`${API_BASE}/cache-status`, () => {
    return HttpResponse.json(mockCacheStatus);
  }),

  http.post(`${API_BASE}/clear-cache`, () => {
    return HttpResponse.json({
      status: "success",
      message: "Cache cleared",
    });
  }),

  http.post(`${API_BASE}/force-refresh`, () => {
    return HttpResponse.json({
      status: "success",
      message: "Display force-refreshed",
    });
  }),

  // Logs endpoint
  http.get(`${API_BASE}/logs`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const level = url.searchParams.get("level")?.toUpperCase();
    const search = url.searchParams.get("search")?.toLowerCase();

    let filteredLogs = [...mockLogEntries];

    // Filter by level
    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }

    // Filter by search
    if (search) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message.toLowerCase().includes(search) ||
          log.logger.toLowerCase().includes(search)
      );
    }

    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    const response: LogsResponse = {
      logs: paginatedLogs,
      total,
      limit,
      offset,
      has_more: hasMore,
      filters: {
        level: level as LogsResponse["filters"]["level"],
        search: search || null,
      },
    };

    return HttpResponse.json(response);
  }),
];

