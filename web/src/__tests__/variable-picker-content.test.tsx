import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VariablePickerContent } from "@/components/tiptap-template-editor/components/VariablePickerContent";

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
      {children}
    </QueryClientProvider>
  );
}

describe("VariablePickerContent", () => {
  const mockOnInsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input with auto-focus", async () => {
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search variables...");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveFocus();
    });
  });

  it("shows all variables without truncation", async () => {
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      // Should see weather variables (mock has 11 variables)
      const weatherCategory = screen.getByText(/weather/i);
      expect(weatherCategory).toBeInTheDocument();
    });

    // Check that all weather variables are shown (not just 10)
    const weatherSection = screen.getByText(/weather/i).closest("div")?.parentElement;
    if (weatherSection) {
      const variablePills = within(weatherSection).getAllByRole("button");
      // Should show all 11 variables, not just 10
      expect(variablePills.length).toBeGreaterThanOrEqual(11);
    }

    // Should NOT see "+ X more" text
    expect(screen.queryByText(/\+ \d+ more/i)).not.toBeInTheDocument();
  });

  it("filters variables by search query", async () => {
    const user = userEvent.setup();
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search variables...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search variables...");
    await user.type(searchInput, "temp");

    await waitFor(() => {
      // Should show variables matching "temp"
      const temperaturePill = screen.getByText("temperature");
      expect(temperaturePill).toBeInTheDocument();
    });
  });

  it("shows all variables when category name matches search", async () => {
    const user = userEvent.setup();
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search variables...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search variables...");
    await user.type(searchInput, "weather");

    await waitFor(() => {
      // Should show weather category
      const weatherCategory = screen.getByText(/weather/i);
      expect(weatherCategory).toBeInTheDocument();
    });

    // All weather variables should be shown when category matches
    const weatherSection = screen.getByText(/weather/i).closest("div")?.parentElement;
    if (weatherSection) {
      const variablePills = within(weatherSection).getAllByRole("button");
      // Should show all variables, not filtered
      expect(variablePills.length).toBeGreaterThanOrEqual(11);
    }
  });

  it("shows no results message when search has no matches", async () => {
    const user = userEvent.setup();
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search variables...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search variables...");
    await user.type(searchInput, "nonexistentvariable123");

    await waitFor(() => {
      expect(screen.getByText(/No variables found matching/i)).toBeInTheDocument();
    });
  });

  it("calls onInsert when variable is clicked", async () => {
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      const temperaturePill = screen.getByText("temperature");
      expect(temperaturePill).toBeInTheDocument();
    });

    const temperaturePill = screen.getByText("temperature");
    await userEvent.click(temperaturePill);

    expect(mockOnInsert).toHaveBeenCalledWith("{{weather.temperature}}");
  });

  it("filters case-insensitively", async () => {
    const user = userEvent.setup();
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search variables...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search variables...");
    await user.type(searchInput, "TEMP");

    await waitFor(() => {
      // Should match "temperature" even with different case
      const temperaturePill = screen.getByText("temperature");
      expect(temperaturePill).toBeInTheDocument();
    });
  });

  it("matches partial strings in variable names", async () => {
    const user = userEvent.setup();
    render(
      <VariablePickerContent onInsert={mockOnInsert} />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search variables...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search variables...");
    await user.type(searchInput, "cond");

    await waitFor(() => {
      // Should match "condition"
      const conditionPill = screen.getByText("condition");
      expect(conditionPill).toBeInTheDocument();
    });
  });
});
