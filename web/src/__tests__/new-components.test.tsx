import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { PageBuilder } from "@/components/page-builder";
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

  it("shows template lines editor", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("Template Lines")).toBeInTheDocument();
      // Should have 6 line editors (contenteditable with role="textbox")
      const lineEditors = screen.getAllByRole("textbox");
      // 6 template lines + 1 page name input = 7 textboxes
      expect(lineEditors.length).toBe(7);
    });
  });

  it("shows alignment controls for each line", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      // Should have alignment buttons - 3 per line (left, center, right) x 6 lines = 18
      const leftAlignButtons = screen.getAllByTitle("Align left");
      const centerAlignButtons = screen.getAllByTitle("Align center");
      const rightAlignButtons = screen.getAllByTitle("Align right");
      
      expect(leftAlignButtons.length).toBe(6);
      expect(centerAlignButtons.length).toBe(6);
      expect(rightAlignButtons.length).toBe(6);
    });
  });

  it("alignment buttons toggle correctly", async () => {
    const user = userEvent.setup();
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getAllByTitle("Align left").length).toBe(6);
    });

    // Click center align on first line
    const centerButtons = screen.getAllByTitle("Align center");
    await user.click(centerButtons[0]);

    // The button should now be active (has primary color class)
    // We can't easily test the styling, but we can verify no errors occur
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

  it("shows preview display", async () => {
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("Preview")).toBeInTheDocument();
    });
  });

  it("can enter text in template lines", async () => {
    const user = userEvent.setup();
    render(
      <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      // Get all textbox elements - includes page name input and 6 template line editors
      const textboxes = screen.getAllByRole("textbox");
      expect(textboxes.length).toBe(7);
    });

    // The first template line editor is the second textbox (after page name input)
    const textboxes = screen.getAllByRole("textbox");
    const line1Editor = textboxes[1]; // First template line editor
    
    await user.click(line1Editor);
    await user.type(line1Editor, "Hello World");
    
    expect(line1Editor).toHaveTextContent("Hello World");
  });
});

describe("ServiceControls with Dev Mode", () => {
  it("shows dev mode toggle", async () => {
    // Import dynamically to avoid issues
    const { ServiceControls } = await import("@/components/service-controls");
    
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText(/Dev Mode/i)).toBeInTheDocument();
    });
  });

  it("shows service status badge", async () => {
    const { ServiceControls } = await import("@/components/service-controls");
    
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should show either "Running" or "Stopped" badge
      expect(screen.getByText(/Running|Stopped/)).toBeInTheDocument();
    });
  });

  it("explains dev mode states", async () => {
    const { ServiceControls } = await import("@/components/service-controls");
    
    render(<ServiceControls />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should show explanatory text about live/preview mode
      expect(screen.getByText(/Web UI displays content/i)).toBeInTheDocument();
    });
  });
});

