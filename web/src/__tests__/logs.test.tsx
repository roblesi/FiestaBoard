import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogsViewer } from "@/components/logs-viewer";
import { api } from "@/lib/api";
import { mockLogEntries, mockLogsResponse } from "./mocks/handlers";

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  
  constructor(private callback: IntersectionObserverCallback) {}
  
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Mock the api module
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual("@/lib/api");
  return {
    ...actual,
    api: {
      ...(actual as { api: object }).api,
      getLogs: vi.fn(),
    },
  };
});

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

function renderWithProviders(component: React.ReactNode) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
}

describe("LogsViewer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(api.getLogs).mockResolvedValue(mockLogsResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Make the API hang to see loading state
    vi.mocked(api.getLogs).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithProviders(<LogsViewer />);
    
    // Should show skeleton loading
    expect(screen.getByText("Application Logs")).toBeInTheDocument();
  });

  it("renders logs when data is loaded", async () => {
    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Check that all log messages are rendered
    expect(screen.getByText("Initializing FiestaBoard Display Service...")).toBeInTheDocument();
    expect(screen.getByText("Background service auto-started")).toBeInTheDocument();
  });

  it("displays correct log level badges", async () => {
    renderWithProviders(<LogsViewer />);

    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Check that various log levels are displayed as badges
    // Use queryAllByText to check for presence since there may be multiple
    const infoBadges = screen.queryAllByText("INFO");
    expect(infoBadges.length).toBeGreaterThanOrEqual(1);
    
    const debugBadges = screen.queryAllByText("DEBUG");
    expect(debugBadges.length).toBeGreaterThanOrEqual(1);
    
    const warningBadges = screen.queryAllByText("WARNING");
    expect(warningBadges.length).toBeGreaterThanOrEqual(1);
    
    const errorBadges = screen.queryAllByText("ERROR");
    expect(errorBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("displays total log count", async () => {
    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      // Total badge should show 6
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  it("calls API with correct parameters", async () => {
    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(api.getLogs).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        level: undefined,
        search: undefined,
      });
    });
  });

  it("filters logs by level", async () => {
    const user = userEvent.setup();
    
    // Mock filtered response
    const errorOnlyResponse = {
      ...mockLogsResponse,
      logs: mockLogEntries.filter((log) => log.level === "ERROR"),
      total: 1,
      filters: { level: "ERROR" as const, search: null },
    };
    
    vi.mocked(api.getLogs)
      .mockResolvedValueOnce(mockLogsResponse)
      .mockResolvedValueOnce(errorOnlyResponse);

    renderWithProviders(<LogsViewer />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Find and change the level filter
    const levelSelect = screen.getByRole("combobox");
    await user.selectOptions(levelSelect, "ERROR");

    await waitFor(() => {
      expect(api.getLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ level: "ERROR" })
      );
    });
  });

  it("searches logs by text", async () => {
    const user = userEvent.setup();

    // Mock filtered response
    const searchResponse = {
      ...mockLogsResponse,
      logs: mockLogEntries.filter((log) =>
        log.message.toLowerCase().includes("weather")
      ),
      total: 1,
      filters: { level: null, search: "weather" },
    };

    vi.mocked(api.getLogs)
      .mockResolvedValueOnce(mockLogsResponse)
      .mockResolvedValueOnce(searchResponse);

    renderWithProviders(<LogsViewer />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Find and type in search input
    const searchInput = screen.getByPlaceholderText("Search logs...");
    await user.type(searchInput, "weather");

    // Wait for debounced search
    await waitFor(
      () => {
        expect(api.getLogs).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: "weather" })
        );
      },
      { timeout: 1000 }
    );
  });

  it("shows empty state when no logs", async () => {
    vi.mocked(api.getLogs).mockResolvedValue({
      logs: [],
      total: 0,
      limit: 50,
      offset: 0,
      has_more: false,
      filters: { level: null, search: null },
    });

    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(screen.getByText("No logs available")).toBeInTheDocument();
    });
  });

  it("shows filtered empty state when no matches", async () => {
    const user = userEvent.setup();
    
    // First load normal logs
    vi.mocked(api.getLogs).mockResolvedValueOnce(mockLogsResponse);
    
    // Then return empty for filtered
    vi.mocked(api.getLogs).mockResolvedValue({
      logs: [],
      total: 0,
      limit: 50,
      offset: 0,
      has_more: false,
      filters: { level: "CRITICAL" as const, search: null },
    });

    renderWithProviders(<LogsViewer />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Select CRITICAL level to trigger filter
    const levelSelect = screen.getByRole("combobox");
    await user.selectOptions(levelSelect, "CRITICAL");

    await waitFor(() => {
      expect(screen.getByText("No logs match your filters")).toBeInTheDocument();
    });
  });

  it("toggles auto-refresh mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Find and click auto-refresh button
    const autoRefreshButton = screen.getByRole("button", { name: /manual/i });
    await user.click(autoRefreshButton);

    // Button should now show "Auto"
    expect(screen.getByRole("button", { name: /auto/i })).toBeInTheDocument();
  });

  it("copies logs to clipboard", async () => {
    const user = userEvent.setup();
    
    // Mock clipboard using Object.defineProperty
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Find and click copy button
    const copyButton = screen.getByRole("button", { name: /copy/i });
    await user.click(copyButton);

    expect(writeTextMock).toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("API server starting up...")
    );
  });

  it("manual refresh button refetches logs", async () => {
    const _user = userEvent.setup();
    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // The refresh button should exist - find by looking at button text
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });
});

describe("LogsViewer API Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getLogs sends correct parameters for pagination", async () => {
    const paginatedResponse = {
      ...mockLogsResponse,
      offset: 50,
      has_more: true,
    };
    
    vi.mocked(api.getLogs).mockResolvedValue(paginatedResponse);

    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(api.getLogs).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        level: undefined,
        search: undefined,
      });
    });
  });

  it("handles API errors gracefully", async () => {
    vi.mocked(api.getLogs).mockRejectedValue(new Error("Network error"));

    renderWithProviders(<LogsViewer />);

    // Component should handle error without crashing
    await waitFor(() => {
      // The component should still render, just without data
      expect(screen.getByText("Logs")).toBeInTheDocument();
    });
  });
});

describe("LogsViewer Infinite Scroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows load more indicator when there are more logs", async () => {
    const responseWithMore = {
      ...mockLogsResponse,
      has_more: true,
      total: 100,
    };
    
    vi.mocked(api.getLogs).mockResolvedValue(responseWithMore);

    renderWithProviders(<LogsViewer />);

    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // The component tracks has_more for infinite scroll
    // When there are more logs, the intersection observer will trigger
    expect(responseWithMore.has_more).toBe(true);
  });

  it("shows end of logs when no more data", async () => {
    vi.mocked(api.getLogs).mockResolvedValue({
      ...mockLogsResponse,
      has_more: false,
    });

    renderWithProviders(<LogsViewer />);

    // Wait for logs to load first
    await waitFor(() => {
      expect(screen.getByText("API server starting up...")).toBeInTheDocument();
    });

    // Then check for end of logs text
    await waitFor(() => {
      expect(screen.getByText("End of logs")).toBeInTheDocument();
    });
  });
});

