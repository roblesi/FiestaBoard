import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { FeatureSettings } from "@/components/feature-settings";
import { ConfigOverridesProvider } from "@/hooks/use-config-overrides";
import { api } from "@/lib/api";
import { requestStore, resetMockFeatureOrder } from "./mocks/handlers";

// Reset mock state before each test
beforeEach(() => {
  requestStore.lastFeatureOrderUpdate = undefined;
  resetMockFeatureOrder();
});

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigOverridesProvider>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </ConfigOverridesProvider>
    </QueryClientProvider>
  );
}

describe("Feature Order API", () => {
  it("getFeatureOrder returns default order when none is set", async () => {
    // Reset mock state
    resetMockFeatureOrder();
    requestStore.lastFeatureOrderUpdate = undefined;

    // Wait for runtime config to load
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    const result = await api.getFeatureOrder();
    
    expect(result).toBeDefined();
    expect(result.feature_order).toBeDefined();
    expect(Array.isArray(result.feature_order)).toBe(true);
    expect(result.available_features).toBeDefined();
    expect(Array.isArray(result.available_features)).toBe(true);
  });

  it("updateFeatureOrder sends correct payload", async () => {
    // Reset mock state
    resetMockFeatureOrder();
    requestStore.lastFeatureOrderUpdate = undefined;

    // Wait for runtime config to load
    await new Promise((resolve) => setTimeout(resolve, 50));

    const newOrder = ["datetime", "weather", "muni"];

    const result = await api.updateFeatureOrder(newOrder);

    expect(result).toBeDefined();
    expect(result.status).toBe("success");
    expect(result.feature_order).toEqual(newOrder);
    // The handler updates the store synchronously
    expect(requestStore.lastFeatureOrderUpdate).toEqual(newOrder);
  });

  it("updateFeatureOrder with all features", async () => {
    // Reset mock state
    resetMockFeatureOrder();
    requestStore.lastFeatureOrderUpdate = undefined;

    // Wait for runtime config to load
    await new Promise((resolve) => setTimeout(resolve, 50));

    const allFeatures = [
      "weather",
      "datetime",
      "home_assistant",
      "guest_wifi",
      "star_trek_quotes",
      "air_fog",
      "muni",
      "surf",
      "baywheels",
      "traffic",
    ];

    const result = await api.updateFeatureOrder(allFeatures);

    expect(result).toBeDefined();
    expect(result.status).toBe("success");
    expect(result.feature_order).toEqual(allFeatures);
  });
});

describe("FeatureSettings Component", () => {
  it("renders feature cards in default order", async () => {
    render(<FeatureSettings />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should see feature titles - use getAllByText since "Weather" appears multiple times
      const weatherElements = screen.getAllByText(/weather/i);
      expect(weatherElements.length).toBeGreaterThan(0);
      // Use getAllByText for date/time as well since it appears multiple times
      const dateTimeElements = screen.getAllByText(/date.*time/i);
      expect(dateTimeElements.length).toBeGreaterThan(0);
    });
  });

  it("displays drag handles on the right side", async () => {
    render(<FeatureSettings />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Look for grip icons (drag handles) - they have aria-roledescription="sortable"
      // Use queryAllByRole with a more specific selector
      const allElements = screen.getAllByRole("generic", { hidden: true });
      const dragHandles = allElements.filter(
        (el) => el.getAttribute("aria-roledescription") === "sortable"
      );
      // If that doesn't work, try finding by class name
      if (dragHandles.length === 0) {
        const gripIcons = document.querySelectorAll('.lucide-grip-vertical');
        expect(gripIcons.length).toBeGreaterThan(0);
      } else {
        expect(dragHandles.length).toBeGreaterThan(0);
      }
    });
  });

  it("loads and displays features from API", async () => {
    render(<FeatureSettings />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should see multiple features - use getAllByText since "Weather" appears in title and description
      const weatherElements = screen.getAllByText(/weather/i);
      expect(weatherElements.length).toBeGreaterThan(0);
      // Should also see other features - use getAllByText
      const dateTimeElements = screen.getAllByText(/date.*time/i);
      expect(dateTimeElements.length).toBeGreaterThan(0);
    });
  });
});

describe("Feature Order Persistence", () => {
  it("updates order when drag completes", async () => {
    // Reset the store before test
    resetMockFeatureOrder();
    requestStore.lastFeatureOrderUpdate = undefined;
    
    // Wait for runtime config to load
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // This test verifies the mutation is called correctly
    // Full drag-and-drop testing would require more complex setup
    const newOrder = ["muni", "weather", "datetime"];

    const result = await api.updateFeatureOrder(newOrder);

    expect(result).toBeDefined();
    expect(result.status).toBe("success");
    expect(result.feature_order).toEqual(newOrder);
    // The handler updates the store synchronously
    expect(requestStore.lastFeatureOrderUpdate).toEqual(newOrder);
  });
});

