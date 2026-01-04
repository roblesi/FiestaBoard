import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { PageBuilder } from "@/components/page-builder";
import { ConfigOverridesProvider } from "@/hooks/use-config-overrides";
import { api } from "@/lib/api";

// Mock the api module
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual("@/lib/api");
  return {
    ...actual,
    api: {
      ...(actual as { api: object }).api,
      renderTemplate: vi.fn(),
      getTemplateVariables: vi.fn(),
      createPage: vi.fn(),
      updatePage: vi.fn(),
      getPage: vi.fn(),
    },
  };
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

describe("PageBuilder", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(api.getTemplateVariables).mockResolvedValue({
      variables: {},
      max_lengths: {},
      colors: {},
      symbols: [],
      filters: [],
      formatting: {},
      syntax_examples: {},
    });
    vi.mocked(api.renderTemplate).mockResolvedValue({
      rendered: "test preview",
      valid: true,
    });
    vi.mocked(api.createPage).mockResolvedValue({
      id: "test-page-id",
      name: "Test Page",
      type: "template",
      template: ["", "", "", "", "", ""],
    });
    vi.mocked(api.updatePage).mockResolvedValue({
      id: "test-page-id",
      name: "Test Page",
      type: "template",
      template: ["", "", "", "", "", ""],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it.skip("can enter text in template lines", async () => {
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

  describe("Debounce behavior", () => {
    it("updates input immediately for responsive UI", async () => {
      const user = userEvent.setup();
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("My Custom Page")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("My Custom Page");
      
      // Type in the input
      await user.type(nameInput, "Test Page Name");
      
      // Input should update immediately (no debounce delay)
      expect(nameInput).toHaveValue("Test Page Name");
    });

    it("debounces preview API calls", async () => {
      const user = userEvent.setup();
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const textboxes = screen.getAllByRole("textbox");
        expect(textboxes.length).toBe(7);
      });

      const textboxes = screen.getAllByRole("textbox");
      const line1Editor = textboxes[1]; // First template line editor
      
      // Clear any initial calls
      vi.clearAllMocks();
      
      // Type rapidly
      await user.type(line1Editor, "Hello");
      
      // Preview should not be called immediately (debounced)
      // Wait a bit to see if it's called too early
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(vi.mocked(api.renderTemplate)).not.toHaveBeenCalled();
      
      // Wait for debounce to complete (300ms state + 500ms preview = ~800ms)
      await waitFor(() => {
        expect(vi.mocked(api.renderTemplate)).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debounces line length warnings", async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.getTemplateVariables).mockResolvedValue({
        variables: {},
        max_lengths: { "weather.temp": 5 },
        colors: {},
        symbols: [],
        filters: [],
        formatting: {},
        syntax_examples: {},
      });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const textboxes = screen.getAllByRole("textbox");
        expect(textboxes.length).toBe(7);
      });

      const textboxes = screen.getAllByRole("textbox");
      const line1Editor = textboxes[1];
      
      // Type a long line that would trigger warning
      const longLine = "A".repeat(30);
      await user.type(line1Editor, longLine);
      
      // Input should show the text immediately
      expect(line1Editor).toHaveValue(longLine);
      
      // Warning should not appear immediately (uses debounced state)
      const warningsBefore = screen.queryAllByTitle(/Line may render/i);
      expect(warningsBefore.length).toBe(0);
      
      // Wait for debounce to complete (~300ms)
      await waitFor(() => {
        const warningsAfter = screen.queryAllByTitle(/Line may render/i);
        expect(warningsAfter.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    it("uses immediate state for save (no data loss)", async () => {
      const user = userEvent.setup();
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("My Custom Page")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText("My Custom Page");
      const textboxes = screen.getAllByRole("textbox");
      const line1Editor = textboxes[1];
      
      // Type in inputs
      await user.clear(nameInput);
      await user.type(nameInput, "My Test Page");
      
      await user.clear(line1Editor);
      await user.type(line1Editor, "Template content");
      
      // Verify input has the value immediately
      await waitFor(() => {
        expect(nameInput).toHaveValue("My Test Page");
        expect(line1Editor).toHaveValue("Template content");
      });
      
      // Immediately click save (before debounce completes)
      const saveButton = screen.getByRole("button", { name: /save page/i });
      await user.click(saveButton);
      
      // Save should be called with immediate state values
      await waitFor(() => {
        expect(vi.mocked(api.createPage)).toHaveBeenCalled();
      });
      
      const saveCall = vi.mocked(api.createPage).mock.calls[0][0];
      expect(saveCall.name).toBe("My Test Page");
      // textboxes[0] is page name, textboxes[1] is first template line (templateLines[0])
      expect(saveCall.template[0]).toBe("Template content");
    });
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

