import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TemplateLineEditor } from "./template-line-editor";

const meta = {
  title: "Components/TemplateLineEditor",
  component: TemplateLineEditor,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "Template string value",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    maxChars: {
      control: "number",
      description: "Maximum character limit",
    },
    rowIndex: {
      control: "number",
      description: "Row index for styling",
    },
  },
} satisfies Meta<typeof TemplateLineEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle state
function EditorWrapper(args: any) {
  const [value, setValue] = useState(args.value || "");
  
  return (
    <div style={{ maxWidth: "800px" }}>
      <TemplateLineEditor
        {...args}
        value={value}
        onChange={setValue}
      />
      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
        <strong>Current Value:</strong>
        <pre style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>{value}</pre>
      </div>
    </div>
  );
}

export const Empty: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const WithPlainText: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "HELLO WORLD",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const WithVariable: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "TEMP: {{weather.temperature}}°F",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const WithColors: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "{{red}}HOT{{/red}} {{blue}}COLD{{/blue}}",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const WithMultipleVariables: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "{{datetime.time}} {{weather.condition}}",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const ComplexTemplate: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "{{blue}}MUNI{{/blue}} {{muni.route}} - {{muni.minutes}}MIN",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const LongText: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "THIS IS A VERY LONG LINE THAT EXCEEDS THE LIMIT",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const WithAlignment: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "[CENTER] HELLO WORLD",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

export const MultipleColors: Story = {
  render: (args) => <EditorWrapper {...args} />,
  args: {
    value: "{{red}}R{{/red}}{{orange}}O{{/orange}}{{yellow}}Y{{/yellow}}{{green}}G{{/green}}{{blue}}B{{/blue}}{{violet}}V{{/violet}}",
    placeholder: "Enter template text...",
    maxChars: 22,
    rowIndex: 0,
  },
};

