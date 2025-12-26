import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimezonePicker } from "@/components/ui/timezone-picker";

describe("TimezonePicker", () => {
  it("renders with default value", () => {
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("America/Los_Angeles");
  });

  it("displays all common timezones", () => {
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    
    // Should have many timezone options
    expect(options.length).toBeGreaterThan(50);
    
    // Check for some common timezones
    const timezoneValues = options.map((opt) => opt.value);
    expect(timezoneValues).toContain("America/Los_Angeles");
    expect(timezoneValues).toContain("America/New_York");
    expect(timezoneValues).toContain("Europe/London");
    expect(timezoneValues).toContain("Asia/Tokyo");
  });

  it("calls onChange when timezone is selected", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={handleChange}
      />
    );

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "America/New_York");

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

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
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

  it("shows UTC offset in option labels", () => {
    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    
    // Options should include UTC offset information
    const optionTexts = options.map((opt) => opt.textContent);
    const hasUTCOffsets = optionTexts.some((text) => text?.includes("UTC"));
    expect(hasUTCOffsets).toBe(true);
  });

  it("handles multiple timezone changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TimezonePicker
        value="America/Los_Angeles"
        onChange={handleChange}
      />
    );

    const select = screen.getByRole("combobox");
    
    await user.selectOptions(select, "America/New_York");
    expect(handleChange).toHaveBeenCalledWith("America/New_York");
    
    await user.selectOptions(select, "Europe/London");
    expect(handleChange).toHaveBeenCalledWith("Europe/London");
    
    await user.selectOptions(select, "Asia/Tokyo");
    expect(handleChange).toHaveBeenCalledWith("Asia/Tokyo");
    
    expect(handleChange).toHaveBeenCalledTimes(3);
  });
});

