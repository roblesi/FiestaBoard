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
      getStatus: vi.fn(),
      getScheduleEnabled: vi.fn(),
      getActivePage: vi.fn(),
      getBoardSettings: vi.fn(),
      renderTemplate: vi.fn(),
      sendTemplate: vi.fn(),
      sendPage: vi.fn(),
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

describe("PageBuilder Live Mode", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock implementations
    vi.mocked(api.getStatus).mockResolvedValue({
      running: true,
      initialized: true,
      config_summary: {
        board_configured: true,
        dev_mode: false,
      },
    });
    
    vi.mocked(api.getScheduleEnabled).mockResolvedValue({
      enabled: false,
    });
    
    vi.mocked(api.getActivePage).mockResolvedValue({
      page_id: "test-active-page",
    });
    
    vi.mocked(api.getBoardSettings).mockResolvedValue({
      board_type: "black",
    });
    
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
      rendered: "TEST PREVIEW",
      lines: ["TEST PREVIEW"],
      line_count: 1,
    });
    
    vi.mocked(api.sendTemplate).mockResolvedValue({
      status: "success",
      message: "TEST PREVIEW",
      sent_to_board: true,
      target: "board",
      dev_mode: false,
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

  describe("Live Mode Toggle UI", () => {
    it("renders live mode toggle when board is configured", async () => {
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });
    });

    it("disables toggle when board is not configured", async () => {
      vi.mocked(api.getStatus).mockResolvedValue({
        running: true,
        initialized: true,
        config_summary: {
          board_configured: false,
          dev_mode: false,
        },
      });

      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const toggle = screen.getByLabelText(/live mode/i);
        expect(toggle).toBeDisabled();
      });
    });

    it("enables toggle when board is configured", async () => {
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const toggle = screen.getByLabelText(/live mode/i);
        expect(toggle).not.toBeDisabled();
      });
    });

    it("shows 'Live' badge when live mode is enabled", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });
    });

    it("hides 'Live' badge when live mode is disabled", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      
      // Enable live mode
      await user.click(toggle);
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });

      // Disable live mode
      await user.click(toggle);
      await waitFor(() => {
        expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
      });
    });

    it("shows 'Board not configured' message when board not configured", async () => {
      vi.mocked(api.getStatus).mockResolvedValue({
        running: true,
        initialized: true,
        config_summary: {
          board_configured: false,
          dev_mode: false,
        },
      });

      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByText(/board not configured/i)).toBeInTheDocument();
      });
    });
  });

  describe("Board Update Integration", () => {
    it("sends template to board when live mode is enabled and preview succeeds", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      // Enable live mode
      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      // Wait for preview to trigger (which should trigger board update)
      await waitFor(() => {
        expect(api.renderTemplate).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Advance timers to trigger debounced preview
      await vi.advanceTimersByTimeAsync(500);

      await waitFor(() => {
        expect(api.sendTemplate).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("does not send to board when live mode is disabled", async () => {
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(api.renderTemplate).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Advance timers
      await vi.advanceTimersByTimeAsync(500);

      // Should not call sendTemplate when live mode is off
      await waitFor(() => {
        expect(api.sendTemplate).not.toHaveBeenCalled();
      });
    });

    it("handles board send errors gracefully", async () => {
      const user = userEvent.setup({ delay: null });
      
      vi.mocked(api.sendTemplate).mockRejectedValue(new Error("Board send failed"));

      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      // Wait for preview and board send attempt
      await waitFor(() => {
        expect(api.renderTemplate).toHaveBeenCalled();
      }, { timeout: 2000 });

      await vi.advanceTimersByTimeAsync(500);

      await waitFor(() => {
        expect(api.sendTemplate).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Component should still be functional (not crashed)
      expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
    });
  });

  describe("Inactivity Timeout", () => {
    it("auto-disables live mode after 5 minutes of inactivity", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      // Verify live mode is enabled
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });

      // Advance time by 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      
      // Wait for the timeout to trigger
      await waitFor(() => {
        expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
      });
    }, { timeout: 10000 });

    it("resets timeout when user makes changes", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });

      // Advance 4 minutes
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

      // Make a change (type in page name)
      const nameInput = screen.getByPlaceholderText("My Custom Page");
      await user.type(nameInput, "Test");

      // Advance another 4 minutes (total 8 minutes, but should not timeout due to reset)
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

      // Live mode should still be enabled
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });
    }, { timeout: 10000 });
  });

  describe("Board Restoration", () => {
    it("restores to active page when live mode disabled in manual mode", async () => {
      const user = userEvent.setup({ delay: null });
      
      vi.mocked(api.getScheduleEnabled).mockResolvedValue({
        enabled: false, // Manual mode
      });

      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      
      // Enable live mode
      await user.click(toggle);
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });

      // Disable live mode
      await user.click(toggle);

      // Should call sendPage to restore
      await waitFor(() => {
        expect(api.sendPage).toHaveBeenCalledWith("test-active-page", "board");
      }, { timeout: 3000 });
    }, { timeout: 10000 });

    it("does not restore when live mode disabled in schedule mode", async () => {
      const user = userEvent.setup({ delay: null });
      
      vi.mocked(api.getScheduleEnabled).mockResolvedValue({
        enabled: true, // Schedule mode
      });

      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      
      // Enable live mode
      await user.click(toggle);
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });

      // Disable live mode
      await user.click(toggle);

      // In schedule mode, should not call sendPage (polling service handles it)
      // Wait a bit to ensure sendPage is not called
      await waitFor(() => {
        // Just verify the component is still functional
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });
      
      // Verify sendPage was not called
      expect(api.sendPage).not.toHaveBeenCalled();
    }, { timeout: 10000 });

    it("handles restoration errors gracefully", async () => {
      const user = userEvent.setup({ delay: null });
      
      vi.mocked(api.getScheduleEnabled).mockResolvedValue({
        enabled: false,
      });
      
      vi.mocked(api.sendPage).mockRejectedValue(new Error("Restore failed"));

      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      
      // Enable then disable live mode
      await user.click(toggle);
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });
      
      await user.click(toggle);

      // Component should still be functional
      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });
    }, { timeout: 10000 });
  });

  describe("Live Mode State Management", () => {
    it("stores active page ID when enabling live mode", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      // Should have fetched active page
      await waitFor(() => {
        expect(api.getActivePage).toHaveBeenCalled();
      });
    }, { timeout: 10000 });

    it("updates last activity time on template changes", async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <PageBuilder onClose={mockOnClose} onSave={mockOnSave} />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/live mode/i)).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/live mode/i);
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });

      // Make a change to template (via page name for simplicity)
      const nameInput = screen.getByPlaceholderText("My Custom Page");
      await user.type(nameInput, "Test");

      // Activity should reset timeout
      // This is tested implicitly by the inactivity timeout test
      await waitFor(() => {
        expect(screen.getByText(/live/i)).toBeInTheDocument();
      });
    }, { timeout: 10000 });
  });
});
