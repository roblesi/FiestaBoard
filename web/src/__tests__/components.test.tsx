import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ServiceStatus } from "@/components/service-status";
import { ServiceControls } from "@/components/service-controls";
import { ConfigDisplay } from "@/components/config-display";

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
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("ServiceStatus", () => {
  it("shows running status when service is running", async () => {
    render(<ServiceStatus />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });
  });
});

describe("ServiceControls", () => {
  it("renders start and stop buttons", async () => {
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    });
  });

  it("shows dev mode switch", async () => {
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.getByText(/dev mode/i)).toBeInTheDocument();
    });
  });

  it("disables start button when service is running", async () => {
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      const startButton = screen.getByRole("button", { name: /start/i });
      expect(startButton).toBeDisabled();
    });
  });
});

describe("ConfigDisplay", () => {
  it("shows enabled config items", async () => {
    render(<ConfigDisplay />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Weather")).toBeInTheDocument();
      expect(screen.getByText("Apple Music")).toBeInTheDocument();
      expect(screen.getByText("Star Trek Quotes")).toBeInTheDocument();
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

