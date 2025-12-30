import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VariablePicker } from "./variable-picker";

// Create a mock query client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta = {
  title: "Components/VariablePicker",
  component: VariablePicker,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ maxWidth: "500px" }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  argTypes: {
    showColors: {
      control: "boolean",
      description: "Show color variables",
    },
    showSymbols: {
      control: "boolean",
      description: "Show symbol variables",
    },
  },
} satisfies Meta<typeof VariablePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showColors: true,
    showSymbols: true,
  },
};

export const WithoutColors: Story = {
  args: {
    showColors: false,
    showSymbols: true,
  },
};

export const WithoutSymbols: Story = {
  args: {
    showColors: true,
    showSymbols: false,
  },
};

export const OnlyVariables: Story = {
  args: {
    showColors: false,
    showSymbols: false,
  },
};

export const WithInsertCallback: Story = {
  args: {
    showColors: true,
    showSymbols: true,
    onInsert: (variable: string) => {
      alert(`Inserted: ${variable}`);
    },
  },
};

