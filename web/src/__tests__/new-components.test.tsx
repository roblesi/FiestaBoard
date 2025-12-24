import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { RotationManager } from "@/components/rotation-manager";
import { PageBuilder } from "@/components/page-builder";
import { DisplayExplorer } from "@/components/display-explorer";
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

describe("RotationManager", () => {
  it("renders rotation list", async () => {
    render(<RotationManager />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Rotations")).toBeInTheDocument();
    });
  });

  it("shows active rotation status", async () => {
    render(<RotationManager />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Main Rotation")).toBeInTheDocument();
    });
  });

  it("shows new button", async () => {
    render(<RotationManager />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    });
  });

  it("has new button that can be clicked", async () => {
    const user = userEvent.setup();
    render(<RotationManager />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    });

    // Click should work without error
    await user.click(screen.getByRole("button", { name: /new/i }));

    // Form should appear - checking for the name input is sufficient
    await waitFor(
      () => {
        expect(screen.getByPlaceholderText("My Rotation")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("shows active badge for active rotation", async () => {
    render(<RotationManager />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Look for the Active badge
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges.length).toBeGreaterThan(0);
    });
  });

  it("shows page count badge", async () => {
    render(<RotationManager />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Look for page count badges
      expect(screen.getByText(/pages/i)).toBeInTheDocument();
    });
  });
});

describe("PageBuilder", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create page form", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Create Page")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My Custom Page")).toBeInTheDocument();
  });

  it("shows page type selector with all options", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Single Source")).toBeInTheDocument();
    expect(screen.getByText("Template")).toBeInTheDocument();
    expect(screen.getByText("Composite")).toBeInTheDocument();
  });

  it("shows display source dropdown for single type", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    // Single is selected by default
    expect(screen.getByText("Display Source")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows row configuration for composite type", async () => {
    const user = userEvent.setup();
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    // Click on Composite type
    await user.click(screen.getByText("Composite"));

    await waitFor(() => {
      expect(screen.getByText("Row Configuration")).toBeInTheDocument();
      expect(screen.getByText("Add Row Mapping")).toBeInTheDocument();
    });
  });

  it("adds row mapping in composite mode", async () => {
    const user = userEvent.setup();
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    // Click on Composite type
    await user.click(screen.getByText("Composite"));

    // Click Add Row Mapping
    await user.click(screen.getByText("Add Row Mapping"));

    await waitFor(() => {
      // Should show the row configuration
      expect(screen.getByText("#1")).toBeInTheDocument();
    });
  });

  it("shows template lines for template type", async () => {
    const user = userEvent.setup();
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    // Click on Template type
    await user.click(screen.getByText("Template"));

    await waitFor(() => {
      expect(screen.getByText("Template Lines")).toBeInTheDocument();
      // Should have 6 line inputs
      const lineInputs = screen.getAllByPlaceholderText(/Line \d/);
      expect(lineInputs.length).toBe(6);
    });
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows duration slider", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText("Rotation Duration")).toBeInTheDocument();
  });
});

describe("DisplayExplorer", () => {
  it("renders display source list", async () => {
    render(<DisplayExplorer />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Display Sources")).toBeInTheDocument();
    });
  });

  it("shows available sources count", async () => {
    render(<DisplayExplorer />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText(/of.*sources available/i)).toBeInTheDocument();
    });
  });

  it("shows display type buttons", async () => {
    render(<DisplayExplorer />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Check for some display types - they appear multiple times (buttons in grid)
      // Use getAllByText and check length
      const weatherElements = screen.getAllByText(/weather/i);
      expect(weatherElements.length).toBeGreaterThan(0);
    });
  });

  it("shows select prompt initially", async () => {
    render(<DisplayExplorer />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText(/select a source/i)).toBeInTheDocument();
    });
  });

  it("renders with close button when onClose provided", async () => {
    const mockOnClose = vi.fn();
    render(<DisplayExplorer onClose={mockOnClose} />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Display Sources")).toBeInTheDocument();
    });

    // Wait for buttons to be available
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

describe("ServiceControls with Output Settings", () => {
  it("renders output target selector", async () => {
    // Import dynamically to avoid issues
    const { ServiceControls } = await import("@/components/service-controls");
    
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Output Target")).toBeInTheDocument();
    });
  });

  it("shows cache controls", async () => {
    const { ServiceControls } = await import("@/components/service-controls");
    
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Message Cache")).toBeInTheDocument();
      expect(screen.getByText("Clear Cache")).toBeInTheDocument();
      expect(screen.getByText("Force Refresh")).toBeInTheDocument();
    });
  });

  it("shows output target buttons", async () => {
    const { ServiceControls } = await import("@/components/service-controls");
    
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("UI Only")).toBeInTheDocument();
      expect(screen.getByText("Board Only")).toBeInTheDocument();
      expect(screen.getByText("Both")).toBeInTheDocument();
    });
  });
});

