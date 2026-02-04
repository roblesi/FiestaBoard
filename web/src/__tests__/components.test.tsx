import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ServiceStatus } from "@/components/service-status";
import { ServiceControls } from "@/components/service-controls";
import { ConfigDisplay } from "@/components/config-display";
import { ConfigOverridesProvider } from "@/hooks/use-config-overrides";

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

describe("ServiceStatus", () => {
  it("shows running status when service is running", async () => {
    render(<ServiceStatus />, { wrapper: TestWrapper });

    await waitFor(() => {
      // ServiceStatus uses aria-label for the status indicator
      expect(screen.getByLabelText("Running")).toBeInTheDocument();
    });
  });
});

describe("ServiceControls", () => {
  it("shows dev mode switch", async () => {
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      // There may be multiple switches (dev mode + auto-refresh), get by id
      expect(screen.getByRole("switch", { name: /dev mode/i })).toBeInTheDocument();
    });
  });

  it("shows service status badge", async () => {
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should show either "Running" or "Stopped" badge
      expect(screen.getByText(/Running|Stopped/)).toBeInTheDocument();
    });
  });

  it("shows dev mode description", async () => {
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should show description about preview/live mode
      expect(screen.getByText(/Preview mode|Live mode/)).toBeInTheDocument();
    });
  });
});

describe("ConfigDisplay", () => {
  it("shows enabled config items", async () => {
    render(<ConfigDisplay />, { wrapper: TestWrapper });

    await waitFor(() => {
      // These are the short labels defined in config-display.tsx
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Weather")).toBeInTheDocument();
    });
  });

  it("shows on/off badges for config items", async () => {
    render(<ConfigDisplay />, { wrapper: TestWrapper });

    await waitFor(() => {
      const onBadges = screen.getAllByText("On");
      const offBadges = screen.getAllByText("Off");
      expect(onBadges.length).toBeGreaterThan(0);
      expect(offBadges.length).toBeGreaterThan(0);
    });
  });
});

