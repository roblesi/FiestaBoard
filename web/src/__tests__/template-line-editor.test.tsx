import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  parseTemplate,
  segmentsToString,
  TemplateLineEditor,
  Segment,
} from "@/components/template-line-editor";

// ============================================
// UNIT TESTS: Parsing Functions
// ============================================

describe("parseTemplate", () => {
  it("parses plain text correctly", () => {
    const result = parseTemplate("Hello World");
    expect(result).toEqual([
      { type: "text", value: "Hello World", display: "Hello World" },
    ]);
  });

  it("parses empty string", () => {
    const result = parseTemplate("");
    expect(result).toEqual([]);
  });

  it("parses a single variable", () => {
    const result = parseTemplate("{{weather.temperature}}");
    expect(result).toEqual([
      { type: "variable", value: "{{weather.temperature}}", display: "weather.temperature" },
    ]);
  });

  it("parses a variable with a filter", () => {
    const result = parseTemplate("{{weather.temperature|upper}}");
    expect(result).toEqual([
      { type: "variable", value: "{{weather.temperature|upper}}", display: "weather.temperature|upper" },
    ]);
  });

  it("parses a single color", () => {
    const result = parseTemplate("{blue}");
    expect(result).toEqual([
      { type: "color", value: "{blue}", display: "blue" },
    ]);
  });

  it("parses all known colors", () => {
    const colors = ["red", "orange", "yellow", "green", "blue", "violet", "white", "black"];
    for (const color of colors) {
      const result = parseTemplate(`{${color}}`);
      expect(result).toEqual([
        { type: "color", value: `{${color}}`, display: color },
      ]);
    }
  });

  it("parses mixed content: color + text + variable", () => {
    const result = parseTemplate("{blue}WEATHER: {{weather.temperature}}F");
    expect(result).toEqual([
      { type: "color", value: "{blue}", display: "blue" },
      { type: "text", value: "WEATHER: ", display: "WEATHER: " },
      { type: "variable", value: "{{weather.temperature}}", display: "weather.temperature" },
      { type: "text", value: "F", display: "F" },
    ]);
  });

  it("parses consecutive variables", () => {
    const result = parseTemplate("{{datetime.date}}{{datetime.time}}");
    expect(result).toEqual([
      { type: "variable", value: "{{datetime.date}}", display: "datetime.date" },
      { type: "variable", value: "{{datetime.time}}", display: "datetime.time" },
    ]);
  });

  it("parses consecutive colors", () => {
    const result = parseTemplate("{red}{blue}");
    expect(result).toEqual([
      { type: "color", value: "{red}", display: "red" },
      { type: "color", value: "{blue}", display: "blue" },
    ]);
  });

  it("handles non-color single braces as text", () => {
    // {unknown} should be treated as text since "unknown" is not a known color
    const result = parseTemplate("{unknown}text");
    expect(result).toEqual([
      { type: "text", value: "{unknown}text", display: "{unknown}text" },
    ]);
  });

  it("parses complex template with multiple elements", () => {
    const result = parseTemplate("{green}DATE: {{datetime.date}}{blue}TIME: {{datetime.time}}");
    expect(result).toEqual([
      { type: "color", value: "{green}", display: "green" },
      { type: "text", value: "DATE: ", display: "DATE: " },
      { type: "variable", value: "{{datetime.date}}", display: "datetime.date" },
      { type: "color", value: "{blue}", display: "blue" },
      { type: "text", value: "TIME: ", display: "TIME: " },
      { type: "variable", value: "{{datetime.time}}", display: "datetime.time" },
    ]);
  });

  it("handles text with special characters", () => {
    const result = parseTemplate("Hello! @#$%^&*()");
    expect(result).toEqual([
      { type: "text", value: "Hello! @#$%^&*()", display: "Hello! @#$%^&*()" },
    ]);
  });

  it("handles variables with dots and underscores", () => {
    const result = parseTemplate("{{home_assistant.sensor_value}}");
    expect(result).toEqual([
      { type: "variable", value: "{{home_assistant.sensor_value}}", display: "home_assistant.sensor_value" },
    ]);
  });
});

describe("segmentsToString", () => {
  it("converts segments back to original string", () => {
    const segments: Segment[] = [
      { type: "color", value: "{blue}", display: "blue" },
      { type: "text", value: "TEMP: ", display: "TEMP: " },
      { type: "variable", value: "{{weather.temperature}}", display: "weather.temperature" },
    ];
    expect(segmentsToString(segments)).toBe("{blue}TEMP: {{weather.temperature}}");
  });

  it("handles empty segments array", () => {
    expect(segmentsToString([])).toBe("");
  });

  it("handles single segment", () => {
    const segments: Segment[] = [
      { type: "text", value: "Hello", display: "Hello" },
    ];
    expect(segmentsToString(segments)).toBe("Hello");
  });

  it("roundtrip: parse and stringify returns original", () => {
    const templates = [
      "{blue}WEATHER: {{weather.temperature}}F",
      "Plain text only",
      "{{datetime.date}}",
      "{red}",
      "",
      "{green}START{{var1}}{blue}MIDDLE{{var2}}END",
    ];

    for (const template of templates) {
      const segments = parseTemplate(template);
      const result = segmentsToString(segments);
      expect(result).toBe(template);
    }
  });
});

// ============================================
// COMPONENT TESTS: TemplateLineEditor
// ============================================

describe("TemplateLineEditor", () => {
  describe("rendering", () => {
    it("renders with empty value", () => {
      const onChange = vi.fn();
      render(
        <TemplateLineEditor
          value=""
          onChange={onChange}
          placeholder="Enter text"
        />
      );
      
      // Should show placeholder when empty
      const editor = screen.getByRole("textbox");
      expect(editor).toBeInTheDocument();
    });

    it("renders plain text", () => {
      const onChange = vi.fn();
      render(
        <TemplateLineEditor value="Hello World" onChange={onChange} />
      );
      
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("renders variable as badge", () => {
      const onChange = vi.fn();
      render(
        <TemplateLineEditor
          value="{{weather.temperature}}"
          onChange={onChange}
        />
      );
      
      // Variable should display without mustaches
      expect(screen.getByText("weather.temperature")).toBeInTheDocument();
      // Should have an X button for deletion
      const badge = screen.getByText("weather.temperature").closest("[data-badge]");
      expect(badge).toBeInTheDocument();
    });

    it("renders color as badge (solid color pill)", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TemplateLineEditor value="{blue}" onChange={onChange} />
      );
      
      // Color badges are solid color pills with sr-only text
      const badge = container.querySelector("[data-badge][data-segment-value='{blue}']");
      expect(badge).toBeInTheDocument();
      // Has accessible label
      expect(screen.getByText("blue color")).toBeInTheDocument(); // sr-only text
    });

    it("renders mixed content correctly", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TemplateLineEditor
          value="{red}TEMP: {{weather.temperature}}"
          onChange={onChange}
        />
      );
      
      // Color badge (solid pill)
      const redBadge = container.querySelector("[data-badge][data-segment-value='{red}']");
      expect(redBadge).toBeInTheDocument();
      // Text content
      expect(screen.getByText("TEMP:")).toBeInTheDocument();
      // Variable badge
      expect(screen.getByText("weather.temperature")).toBeInTheDocument();
    });

    it("shows X button on badges", () => {
      const onChange = vi.fn();
      render(
        <TemplateLineEditor
          value="{{weather.temperature}}"
          onChange={onChange}
        />
      );
      
      // Find the badge and check for X button
      const badge = screen.getByText("weather.temperature").closest("[data-badge]");
      expect(badge).toBeInTheDocument();
      
      // X button should be inside the badge
      const xButton = badge?.querySelector("button");
      expect(xButton).toBeInTheDocument();
    });

    it("applies active styling when isActive is true", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TemplateLineEditor
          value="test"
          onChange={onChange}
          isActive={true}
        />
      );
      
      const editor = container.querySelector("[contenteditable]");
      expect(editor).toHaveClass("border-primary");
    });

    it("applies warning styling when hasWarning is true", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TemplateLineEditor
          value="test"
          onChange={onChange}
          hasWarning={true}
        />
      );
      
      const editor = container.querySelector("[contenteditable]");
      expect(editor).toHaveClass("border-yellow-500");
    });
  });

  describe("badge deletion via X button", () => {
    it("removes variable badge when X is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(
        <TemplateLineEditor
          value="TEXT{{weather.temperature}}END"
          onChange={onChange}
        />
      );
      
      const badge = screen.getByText("weather.temperature").closest("[data-badge]");
      const xButton = badge?.querySelector("button");
      
      await user.click(xButton!);
      
      // onChange should be called with the variable removed
      expect(onChange).toHaveBeenCalledWith("TEXTEND");
    });

    it("removes color badge when X is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      const { container } = render(
        <TemplateLineEditor
          value="{blue}TEXT"
          onChange={onChange}
        />
      );
      
      const badge = container.querySelector("[data-badge][data-segment-value='{blue}']");
      const xButton = badge?.querySelector("button");
      
      await user.click(xButton!);
      
      expect(onChange).toHaveBeenCalledWith("TEXT");
    });

    it("handles removing badge from middle of content", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      render(
        <TemplateLineEditor
          value="START{{var1}}MIDDLE{{var2}}END"
          onChange={onChange}
        />
      );
      
      const badge = screen.getByText("var1").closest("[data-badge]");
      const xButton = badge?.querySelector("button");
      
      await user.click(xButton!);
      
      expect(onChange).toHaveBeenCalledWith("STARTMIDDLE{{var2}}END");
    });
  });

  describe("focus handling", () => {
    it("calls onFocus when editor is focused", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onFocus = vi.fn();
      
      render(
        <TemplateLineEditor
          value="test"
          onChange={onChange}
          onFocus={onFocus}
        />
      );
      
      const editor = screen.getByRole("textbox");
      await user.click(editor);
      
      expect(onFocus).toHaveBeenCalled();
    });
  });

  describe("drag and drop attributes", () => {
    it("badges are draggable", () => {
      const onChange = vi.fn();
      render(
        <TemplateLineEditor
          value="{{weather.temperature}}"
          onChange={onChange}
        />
      );
      
      const badge = screen.getByText("weather.temperature").closest("[data-badge]");
      expect(badge).toHaveAttribute("draggable", "true");
    });

    it("container accepts drops", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TemplateLineEditor value="test" onChange={onChange} />
      );
      
      const editor = container.querySelector("[contenteditable]");
      expect(editor).toBeInTheDocument();
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe("Edge cases", () => {
  it("handles incomplete variable syntax", () => {
    // Single opening brace
    let result = parseTemplate("{{incomplete");
    expect(segmentsToString(result)).toBe("{{incomplete");
    
    // Missing closing braces
    result = parseTemplate("{{var}");
    expect(segmentsToString(result)).toBe("{{var}");
  });

  it("handles nested-looking braces", () => {
    const result = parseTemplate("{{{triple}}}");
    // Should parse the double braces as variable
    expect(result.some(s => s.type === "variable")).toBe(true);
  });

  it("handles whitespace in variables", () => {
    const result = parseTemplate("{{ weather.temp }}");
    expect(result).toEqual([
      { type: "variable", value: "{{ weather.temp }}", display: " weather.temp " },
    ]);
  });

  it("preserves exact whitespace in text", () => {
    const template = "  spaces  {{var}}  more  ";
    const result = segmentsToString(parseTemplate(template));
    expect(result).toBe(template);
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Integration tests", () => {
  describe("drag and drop data transfer", () => {
    it("badges have correct drag data attributes", () => {
      const onChange = vi.fn();
      render(
        <TemplateLineEditor
          value="{{weather.temperature}}"
          onChange={onChange}
        />
      );
      
      const badge = screen.getByText("weather.temperature").closest("[data-badge]");
      expect(badge).toHaveAttribute("data-segment-value", "{{weather.temperature}}");
    });

    it("color badges have correct drag data attributes", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TemplateLineEditor value="{blue}" onChange={onChange} />
      );
      
      const badge = container.querySelector("[data-badge][data-segment-value='{blue}']");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-segment-value", "{blue}");
    });
  });

  describe("multiple badge operations", () => {
    it("handles deleting multiple badges sequentially", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      const { rerender, container } = render(
        <TemplateLineEditor
          value="{red}{{var1}}{blue}{{var2}}"
          onChange={onChange}
        />
      );
      
      // Delete first badge (color badge)
      const redBadge = container.querySelector("[data-badge][data-segment-value='{red}']");
      const redXButton = redBadge?.querySelector("button");
      await user.click(redXButton!);
      
      expect(onChange).toHaveBeenLastCalledWith("{{var1}}{blue}{{var2}}");
      
      // Rerender with updated value
      rerender(
        <TemplateLineEditor
          value="{{var1}}{blue}{{var2}}"
          onChange={onChange}
        />
      );
      
      // Delete second badge (now {{var1}})
      const var1Badge = screen.getByText("var1").closest("[data-badge]");
      const var1XButton = var1Badge?.querySelector("button");
      await user.click(var1XButton!);
      
      expect(onChange).toHaveBeenLastCalledWith("{blue}{{var2}}");
    });
  });

  describe("value synchronization", () => {
    it("correctly reflects value changes from parent", () => {
      const onChange = vi.fn();
      
      const { rerender } = render(
        <TemplateLineEditor value="initial" onChange={onChange} />
      );
      
      expect(screen.getByText("initial")).toBeInTheDocument();
      
      rerender(
        <TemplateLineEditor value="{{new.variable}}" onChange={onChange} />
      );
      
      expect(screen.getByText("new.variable")).toBeInTheDocument();
      expect(screen.queryByText("initial")).not.toBeInTheDocument();
    });

    it("handles value changing from text to badges and back", () => {
      const onChange = vi.fn();
      
      const { rerender } = render(
        <TemplateLineEditor value="plain text" onChange={onChange} />
      );
      
      expect(screen.getByText("plain text")).toBeInTheDocument();
      
      rerender(
        <TemplateLineEditor value="{{variable}}" onChange={onChange} />
      );
      
      const badge = screen.getByText("variable").closest("[data-badge]");
      expect(badge).toBeInTheDocument();
      
      rerender(
        <TemplateLineEditor value="back to text" onChange={onChange} />
      );
      
      expect(screen.getByText("back to text")).toBeInTheDocument();
      expect(screen.queryByText("variable")).not.toBeInTheDocument();
    });
  });

  describe("complex template handling", () => {
    it("renders complex real-world template correctly", () => {
      const onChange = vi.fn();
      const complexTemplate = "{blue}WEATHER: {{weather.temperature}}F {green}DATE: {{datetime.date}}";
      
      const { container } = render(
        <TemplateLineEditor value={complexTemplate} onChange={onChange} />
      );
      
      // Check color badges are rendered (solid pills, query by data attribute)
      expect(container.querySelector("[data-segment-value='{blue}']")).toBeInTheDocument();
      expect(container.querySelector("[data-segment-value='{green}']")).toBeInTheDocument();
      
      // Check variable badges are rendered
      expect(screen.getByText("weather.temperature")).toBeInTheDocument();
      expect(screen.getByText("datetime.date")).toBeInTheDocument();
      
      // Check text segments are present (use partial matching for text with spaces)
      expect(screen.getByText(/WEATHER:/)).toBeInTheDocument();
      expect(screen.getByText(/DATE:/)).toBeInTheDocument();
    });

    it("maintains template integrity after multiple X button deletions", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      
      const { container } = render(
        <TemplateLineEditor
          value="{red}A{{v1}}B{blue}C{{v2}}D"
          onChange={onChange}
        />
      );
      
      // Delete the middle color badge {blue}
      const blueBadge = container.querySelector("[data-badge][data-segment-value='{blue}']");
      const blueXButton = blueBadge?.querySelector("button");
      await user.click(blueXButton!);
      
      // Should preserve surrounding text and badges
      expect(onChange).toHaveBeenCalledWith("{red}A{{v1}}BC{{v2}}D");
    });
  });
});

// ============================================
// ARROW KEY NAVIGATION TESTS
// ============================================

describe("Arrow key navigation", () => {
  it("renders badges that are non-editable", () => {
    const onChange = vi.fn();
    render(
      <TemplateLineEditor
        value="text{{var}}more"
        onChange={onChange}
      />
    );
    
    const badge = screen.getByText("var").closest("[data-badge]");
    expect(badge).toHaveAttribute("contenteditable", "false");
  });

  it("badges have data attributes for segment value", () => {
    const onChange = vi.fn();
    render(
      <TemplateLineEditor
        value="{{weather.temp}}"
        onChange={onChange}
      />
    );
    
    const badge = screen.getByText("weather.temp").closest("[data-badge]");
    expect(badge).toHaveAttribute("data-segment-value", "{{weather.temp}}");
  });

  it("handles keyboard navigation setup correctly", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="start{{badge}}end"
        onChange={onChange}
      />
    );
    
    const editor = container.querySelector("[contenteditable]");
    expect(editor).toBeInTheDocument();
    
    // The editor should be focusable
    editor?.focus();
    expect(document.activeElement).toBe(editor);
  });

  it("prevents Enter key from creating new lines", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(
      <TemplateLineEditor
        value="test"
        onChange={onChange}
      />
    );
    
    const editor = screen.getByRole("textbox");
    await user.click(editor);
    await user.keyboard("{Enter}");
    
    // onChange should not be called with a newline character
    const calls = onChange.mock.calls;
    const hasNewline = calls.some((call: string[]) => call[0]?.includes("\n"));
    expect(hasNewline).toBe(false);
  });
});

// ============================================
// DROP ZONE TESTS
// ============================================

describe("Drop zones", () => {
  it("badges in consecutive position should handle drop zones", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{var1}}{{var2}}"
        onChange={onChange}
      />
    );
    
    // Both badges should be present
    const badges = container.querySelectorAll("[data-badge]");
    expect(badges).toHaveLength(2);
    
    // First badge
    expect(badges[0]).toHaveAttribute("data-segment-value", "{{var1}}");
    // Second badge
    expect(badges[1]).toHaveAttribute("data-segment-value", "{{var2}}");
  });

  it("drop zones only appear during drag operations", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{var1}}{{var2}}"
        onChange={onChange}
      />
    );
    
    const editor = container.querySelector("[contenteditable]");
    expect(editor).toBeInTheDocument();
    
    // Initially no drop zones (they only appear during drag)
    const dropZones = container.querySelectorAll("[data-dropzone]");
    expect(dropZones.length).toBe(0);
  });

  it("editor accepts drag over events", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{var1}}{{var2}}"
        onChange={onChange}
      />
    );
    
    const editor = container.querySelector("[contenteditable]");
    expect(editor).toBeInTheDocument();
    
    // Simulate dragover
    fireEvent.dragOver(editor!, {
      dataTransfer: { dropEffect: "move" }
    });
    
    // Editor should still be in the document
    expect(editor).toBeInTheDocument();
  });
});

// ============================================
// CURSOR POSITION TESTS  
// ============================================

describe("Cursor position handling", () => {
  it("text segments are wrapped in span elements", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="hello{{var}}world"
        onChange={onChange}
      />
    );
    
    // Text should be in span elements with data-text-segment attribute
    const textSegments = container.querySelectorAll("[data-text-segment]");
    expect(textSegments.length).toBeGreaterThan(0);
  });

  it("maintains content after focus and blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(
      <TemplateLineEditor
        value="test{{var}}content"
        onChange={onChange}
      />
    );
    
    const editor = screen.getByRole("textbox");
    
    // Focus
    await user.click(editor);
    
    // Content should still be present
    expect(screen.getByText("var")).toBeInTheDocument();
    expect(screen.getByText(/test/)).toBeInTheDocument();
    expect(screen.getByText(/content/)).toBeInTheDocument();
  });

  it("rerender preserves badge display after parent value change", () => {
    const onChange = vi.fn();
    
    const { rerender } = render(
      <TemplateLineEditor value="a{{v1}}b" onChange={onChange} />
    );
    
    expect(screen.getByText("v1")).toBeInTheDocument();
    
    // Change value externally
    rerender(
      <TemplateLineEditor value="a{{v1}}b{{v2}}c" onChange={onChange} />
    );
    
    // Both badges should be present
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });
});

// ============================================
// TEXT SPLITTING TESTS
// ============================================

describe("Text segment handling", () => {
  it("text segments preserve spaces", () => {
    const onChange = vi.fn();
    render(
      <TemplateLineEditor
        value="  spaced  {{var}}  text  "
        onChange={onChange}
      />
    );
    
    // The text with spaces should be preserved in the DOM
    const editor = screen.getByRole("textbox");
    expect(editor.textContent).toContain("spaced");
    expect(editor.textContent).toContain("text");
  });

  it("handles text between multiple badges", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="A{{v1}}B{{v2}}C{{v3}}D"
        onChange={onChange}
      />
    );
    
    // All badges should be present
    const badges = container.querySelectorAll("[data-badge]");
    expect(badges).toHaveLength(3);
    
    // Text segments should be present
    const textSegments = container.querySelectorAll("[data-text-segment]");
    expect(textSegments.length).toBe(4); // A, B, C, D
  });

  it("handles empty text between badges", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{v1}}{{v2}}"
        onChange={onChange}
      />
    );
    
    // Both badges should be adjacent
    const badges = container.querySelectorAll("[data-badge]");
    expect(badges).toHaveLength(2);
  });
});

// ============================================
// DRAG AND DROP BEHAVIOR TESTS
// ============================================

describe("Drag and drop behavior", () => {
  it("badge drag start sets correct data transfer", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{myvar}}"
        onChange={onChange}
      />
    );
    
    const badge = container.querySelector("[data-badge]");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("draggable", "true");
  });

  it("handles drag end cleanup", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{var1}}{{var2}}"
        onChange={onChange}
      />
    );
    
    const badges = container.querySelectorAll("[data-badge]");
    const firstBadge = badges[0];
    
    // Simulate drag start and end
    fireEvent.dragStart(firstBadge, {
      dataTransfer: {
        effectAllowed: "move",
        setData: vi.fn(),
      }
    });
    
    fireEvent.dragEnd(firstBadge);
    
    // Badges should still be present
    expect(container.querySelectorAll("[data-badge]")).toHaveLength(2);
  });

  it("container handles drag leave", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TemplateLineEditor
        value="{{var}}"
        onChange={onChange}
      />
    );
    
    const editor = container.querySelector("[contenteditable]");
    
    fireEvent.dragLeave(editor!, {
      relatedTarget: null
    });
    
    // Editor should still be functional
    expect(editor).toBeInTheDocument();
  });
});

