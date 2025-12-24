import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:8000";

// Mock data
export const mockStatus = {
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

export const mockPreview = {
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

export const mockConfig = {
  weather_enabled: true,
  home_assistant_enabled: false,
  apple_music_enabled: true,
  guest_wifi_enabled: false,
  star_trek_quotes_enabled: true,
  rotation_enabled: true,
};

export const mockDisplays = {
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

export const mockWeatherDisplay = {
  display_type: "weather",
  message: "San Francisco: * Sunny\nTemp: 72°F",
  lines: ["San Francisco: * Sunny", "Temp: 72°F"],
  line_count: 2,
  available: true,
};

export const mockWeatherRaw = {
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

// Handlers
export const handlers = [
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
    return HttpResponse.json({
      display_type: type,
      message: `${type} display`,
      lines: [`${type} display`],
      line_count: 1,
      available: true,
    });
  }),

  http.get(`${API_BASE}/displays/:type/raw`, ({ params }) => {
    const { type } = params;
    if (type === "weather") {
      return HttpResponse.json(mockWeatherRaw);
    }
    return HttpResponse.json({
      display_type: type,
      data: {},
      available: true,
      error: null,
    });
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
    return HttpResponse.json({
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
    });
  }),

  http.put(`${API_BASE}/settings/transitions`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      status: "success",
      settings: {
        strategy: body.strategy ?? "column",
        step_interval_ms: body.step_interval_ms ?? 500,
        step_size: body.step_size ?? 2,
      },
    });
  }),

  http.get(`${API_BASE}/settings/output`, () => {
    return HttpResponse.json({
      target: "board",
      dev_mode: true,
      effective_target: "ui",
      available_targets: ["ui", "board", "both"],
    });
  }),

  http.put(`${API_BASE}/settings/output`, async ({ request }) => {
    const body = await request.json() as { target: string };
    return HttpResponse.json({
      status: "success",
      settings: { target: body.target },
    });
  }),

  // Pages endpoints
  http.get(`${API_BASE}/pages`, () => {
    return HttpResponse.json({
      pages: [
        { id: "page-1", name: "Weather Page", type: "single", display_type: "weather" },
        { id: "page-2", name: "Custom Template", type: "template" },
      ],
      total: 2,
    });
  }),

  http.post(`${API_BASE}/pages`, () => {
    return HttpResponse.json({
      status: "success",
      page: { id: "new-page", name: "New Page", type: "single" },
    });
  }),

  http.delete(`${API_BASE}/pages/:id`, () => {
    return HttpResponse.json({ status: "success", message: "Page deleted" });
  }),

  http.post(`${API_BASE}/pages/:id/send`, () => {
    return HttpResponse.json({
      status: "success",
      sent_to_board: true,
    });
  }),

  // Template endpoints
  http.get(`${API_BASE}/templates/variables`, () => {
    return HttpResponse.json({
      variables: {
        weather: ["temp", "condition"],
        datetime: ["time", "date"],
      },
      colors: { red: 63, blue: 67 },
      symbols: ["sun", "cloud", "rain"],
    });
  }),

  http.post(`${API_BASE}/templates/render`, () => {
    return HttpResponse.json({
      rendered: "Rendered template",
      lines: ["Rendered template"],
    });
  }),

  // Rotation endpoints
  http.get(`${API_BASE}/rotations`, () => {
    return HttpResponse.json({
      rotations: [
        { id: "rot-1", name: "Main Rotation", pages: [{ page_id: "page-1" }] },
      ],
      total: 1,
      active_rotation_id: "rot-1",
    });
  }),

  http.post(`${API_BASE}/rotations/:id/activate`, () => {
    return HttpResponse.json({
      status: "success",
      message: "Rotation activated",
    });
  }),

  http.get(`${API_BASE}/rotations/active`, () => {
    return HttpResponse.json({
      active: true,
      rotation_id: "rot-1",
      rotation_name: "Main Rotation",
      current_page_index: 0,
    });
  }),
];


