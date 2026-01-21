import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimezonePicker } from "@/components/ui/timezone-picker";

describe("TimezonePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default value", () => {
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("America Los Angeles (UTC-8)");
  });

  it("displays input field for searching", () => {
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("filters timezones as user types", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.type(input, "New York");

    // Wait for filtered results to appear
    await waitFor(() => {
      const dropdown = screen.queryByText(/America New York/i);
      expect(dropdown).toBeInTheDocument();
    });
  });

  it("calls onChange when timezone is selected from dropdown", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.click(input);
    
    // Wait for dropdown to appear and find New York option
    await waitFor(() => {
      const newYorkOption = screen.getByText(/America New York/i);
      expect(newYorkOption).toBeInTheDocument();
    });

    const newYorkOption = screen.getByText(/America New York/i);
    await user.click(newYorkOption);

    expect(handleChange).toHaveBeenCalledWith("America/New_York");
  });

  it("can be disabled", () => {
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
        disabled
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    expect(input).toBeDisabled();
  });

  it("applies custom className", () => {
    const { container } = render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
        className="custom-class"
      />
    );

    const wrapper = container.querySelector(".custom-class");
    expect(wrapper).toBeInTheDocument();
  });

  it("shows validation error for invalid timezone", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePicker
        value="Invalid/Timezone"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.click(input);

    await waitFor(() => {
      const errorMessage = screen.getByText(/Invalid timezone/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it("handles arrow key navigation", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.click(input);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.queryByText(/America New York/i)).toBeInTheDocument();
    });

    // Press Arrow Down to navigate
    await user.keyboard("{ArrowDown}");
    
    // Press Enter to select
    await user.keyboard("{Enter}");

    // Should have called onChange (though the exact value depends on filtering)
    expect(handleChange).toHaveBeenCalled();
  });

  it("closes dropdown on Escape key", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.click(input);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.queryByText(/America New York/i)).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard("{Escape}");

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByText(/America New York/i)).not.toBeInTheDocument();
    });
  });

  it("filters timezones by name, value, or offset", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    
    // Search by city name
    await user.type(input, "Tokyo");
    await waitFor(() => {
      expect(screen.getByText(/Asia Tokyo/i)).toBeInTheDocument();
    });

    // Clear and search by region
    await user.clear(input);
    await user.type(input, "Europe");
    await waitFor(() => {
      expect(screen.getByText(/Europe London/i)).toBeInTheDocument();
    });
  });

  it("calls onValidationChange when validation state changes", async () => {
    const user = userEvent.setup();
    const onValidationChange = vi.fn();

    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
        onValidationChange={onValidationChange}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    
    // Type an invalid timezone
    await user.type(input, "InvalidTimezone123");
    
    // Should notify about invalid state
    await waitFor(() => {
      expect(onValidationChange).toHaveBeenCalled();
    });
  });

  it("handles empty value gracefully", () => {
    render(
      <TimezonePicker
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("shows dropdown when input is focused", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.click(input);

    // Dropdown should appear
    await waitFor(() => {
      const dropdown = screen.queryByText(/America Los Angeles/i);
      expect(dropdown).toBeInTheDocument();
    });
  });

  it("limits displayed results to 50 items", async () => {
    const user = userEvent.setup();
    render(
      <TimezonePicker
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Search timezone...");
    await user.click(input);

    // Wait for dropdown
    await waitFor(() => {
      const dropdown = screen.queryByText(/UTC/i);
      expect(dropdown).toBeInTheDocument();
    });

    // Count visible timezone options (excluding the "Showing first 50" message if present)
    const timezoneButtons = screen.queryAllByRole("button").filter(
      (btn) => btn.textContent && !btn.textContent.includes("Showing first")
    );
    
    // Should show at most 50 items plus the message if there are more
    expect(timezoneButtons.length).toBeLessThanOrEqual(50);
  });
});
